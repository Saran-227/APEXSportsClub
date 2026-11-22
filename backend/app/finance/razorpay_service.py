"""ApexSportsClub - Razorpay Payment Gateway Integration Service.

Handles server-side Razorpay order creation, HMAC-SHA256 signature verification,
webhook event authentication, and payment reconciliation without exposing secret credentials.
"""
from decimal import Decimal
import hashlib
import hmac
import logging
import time
from typing import Any, Dict, Optional
import uuid

import razorpay
from backend.app.core.config import get_settings

logger = logging.getLogger("scms.razorpay")


def get_razorpay_client() -> Optional[razorpay.Client]:
    """Initialize authenticated Razorpay Client using environment credentials."""
    settings = get_settings()
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        try:
            return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        except Exception as exc:
            logger.error("Failed to initialize Razorpay Client: %s", exc)
            return None
    return None


def get_razorpay_public_config() -> Dict[str, Any]:
    """Return public checkout configuration for frontend client without leaking secrets."""
    settings = get_settings()
    is_active = bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)
    return {
        "key_id": settings.RAZORPAY_KEY_ID or "",
        "currency": "INR",
        "is_active": is_active,
        "merchant_name": "Apex Sports Club",
        "theme_color": "#083222",
    }


def create_order(
    amount: Decimal,
    currency: str = "INR",
    receipt: Optional[str] = None,
    notes: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Create a server-side order with Razorpay in paise (1 INR = 100 paise)."""
    settings = get_settings()
    amount_inr = Decimal(str(amount))
    amount_paise = int(round(amount_inr * Decimal("100.00")))
    if amount_paise < 100:
        amount_paise = 100  # Minimum 1 INR

    receipt_str = receipt or f"rcpt_{uuid.uuid4().hex[:12]}"
    notes_payload = notes or {}

    client = get_razorpay_client()
    if client:
        try:
            order_data = {
                "amount": amount_paise,
                "currency": currency.upper(),
                "receipt": receipt_str,
                "notes": notes_payload,
                "payment_capture": 1,
            }
            order = client.order.create(data=order_data)
            logger.info("Created Razorpay order %s for amount ₹%s", order.get("id"), amount_inr)
            return order
        except Exception as exc:
            logger.error("Razorpay API order creation failed: %s", exc)
            raise exc

    # Fallback / mock when testing without network or keys
    order_id = f"order_{uuid.uuid4().hex[:14]}"
    logger.info("Simulated mock Razorpay order %s for amount ₹%s", order_id, amount_inr)
    return {
        "id": order_id,
        "entity": "order",
        "amount": amount_paise,
        "amount_paid": 0,
        "amount_due": amount_paise,
        "currency": currency.upper(),
        "receipt": receipt_str,
        "status": "created",
        "attempts": 0,
        "notes": notes_payload,
        "created_at": int(time.time()),
    }


def generate_expected_signature(order_id: str, payment_id: str, secret: Optional[str] = None) -> str:
    """Compute HMAC-SHA256 signature for Razorpay payment verification."""
    sec = secret or get_settings().RAZORPAY_KEY_SECRET or ""
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    return hmac.new(sec.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def verify_payment_signature(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> bool:
    """Verify Razorpay payment signature using constant-time comparison to prevent timing attacks."""
    settings = get_settings()
    secret = settings.RAZORPAY_KEY_SECRET
    if not secret:
        logger.warning("RAZORPAY_KEY_SECRET not set; cannot verify payment signature")
        return False

    client = get_razorpay_client()
    if client:
        try:
            params_dict = {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            }
            client.utility.verify_payment_signature(params_dict)
            return True
        except Exception as exc:
            logger.warning("Razorpay utility signature verification rejected: %s", exc)

    # Direct HMAC-SHA256 verification with constant-time equality
    expected = generate_expected_signature(razorpay_order_id, razorpay_payment_id, secret)
    return hmac.compare_digest(expected, razorpay_signature)


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """Verify Razorpay Webhook authenticity using secret key."""
    settings = get_settings()
    secret = settings.RAZORPAY_WEBHOOK_SECRET or settings.RAZORPAY_KEY_SECRET
    if not secret or not signature:
        return False

    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
