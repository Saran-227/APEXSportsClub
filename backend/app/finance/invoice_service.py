"""ApexSportsClub - Invoice & Transaction Business Logic Service."""
from datetime import datetime, timezone
from decimal import Decimal
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import uuid

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.auth.models import User
from backend.app.core.config import get_settings
from backend.app.finance.email_service import send_invoice_email
from backend.app.finance.models import Invoice, Payment
from backend.app.finance.pdf_service import format_currency, generate_invoice_pdf

logger = logging.getLogger("scms.invoicing")


def get_invoice_storage_dir() -> Path:
    """Resolve and ensure the invoice PDF storage directory exists."""
    settings = get_settings()
    backend_dir = Path(__file__).resolve().parents[2]
    storage_dir = backend_dir / settings.INVOICE_STORAGE_DIR
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir


def generate_unique_invoice_number(db: Session, year: Optional[int] = None) -> str:
    """Generate professional, sequential, unique invoice numbers like APEX-INV-2026-000001."""
    if year is None:
        year = datetime.now(timezone.utc).year

    prefix = f"APEX-INV-{year}-"
    last_inv = (
        db.query(Invoice.invoice_number)
        .filter(Invoice.invoice_number.like(f"{prefix}%"))
        .order_by(Invoice.invoice_number.desc())
        .first()
    )

    if last_inv and last_inv[0]:
        try:
            seq_part = last_inv[0].split("-")[-1]
            next_seq = int(seq_part) + 1
        except Exception:
            next_seq = 1
    else:
        next_seq = 1

    return f"{prefix}{next_seq:06d}"


def create_or_get_invoice(
    db: Session,
    user: User,
    transaction_type: str,
    amount: Decimal,
    items: List[Dict[str, Any]],
    subtotal: Optional[Decimal] = None,
    discount_amount: Optional[Decimal] = None,
    tax_amount: Optional[Decimal] = None,
    currency: str = "INR",
    reference_id: Optional[str] = None,
    payment_method: str = "UPI",
    payment_reference: Optional[str] = None,
    membership_number: Optional[str] = None,
    notes: Optional[str] = None,
    idempotency_key: Optional[str] = None,
    send_email: bool = True,
    razorpay_order_id: Optional[str] = None,
    razorpay_payment_id: Optional[str] = None,
    razorpay_signature: Optional[str] = None,
) -> Invoice:
    """Create invoice, record transaction payment, generate PDF, and deliver via SendGrid."""
    # 1. Idempotency Check
    if idempotency_key:
        existing = db.query(Invoice).filter(Invoice.idempotency_key == idempotency_key).first()
        if existing:
            logger.info("Invoice already exists for idempotency key '%s': %s", idempotency_key, existing.invoice_number)
            return existing

    now_utc = datetime.now(timezone.utc)
    customer_name = f"{user.first_name} {user.last_name}".strip() or "Club Member"
    customer_email = user.email.strip().lower()

    if subtotal is None:
        subtotal = sum((Decimal(str(it.get("unit_price", 0))) * Decimal(str(it.get("quantity", 1))) for it in items), Decimal("0.00"))
    if discount_amount is None:
        discount_amount = sum((Decimal(str(it.get("discount", 0))) for it in items), Decimal("0.00"))
    if tax_amount is None:
        tax_amount = sum((Decimal(str(it.get("tax", 0))) for it in items), Decimal("0.00"))

    # 2. Record Completed Transaction in payments table (reuse existing pending payment if present)
    resolved_method = "RAZORPAY" if (razorpay_payment_id or payment_method == "RAZORPAY") else payment_method
    resolved_ref = payment_reference or razorpay_payment_id or f"TXN_REF_{uuid.uuid4().hex[:10].upper()}"

    payment = None
    if razorpay_order_id:
        payment = db.query(Payment).filter(Payment.razorpay_order_id == razorpay_order_id).first()
    if not payment and payment_reference:
        payment = db.query(Payment).filter(Payment.transaction_reference == payment_reference).first()

    if payment:
        payment.status = "COMPLETED"
        payment.payment_method = resolved_method
        payment.amount = amount
        if razorpay_payment_id:
            payment.razorpay_payment_id = razorpay_payment_id
        if razorpay_signature:
            payment.razorpay_signature = razorpay_signature
        if reference_id:
            payment.reference_id = reference_id
        payment.transaction_reference = resolved_ref
        payment.reference_type = transaction_type.upper()
    else:
        payment = Payment(
            user_id=user.id,
            amount=amount,
            payment_method=resolved_method,
            status="COMPLETED",
            reference_type=transaction_type.upper(),
            reference_id=reference_id or f"TXN-{uuid.uuid4().hex[:8].upper()}",
            transaction_reference=resolved_ref,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature,
            notes=notes,
        )
        db.add(payment)
        db.flush()

    # 3. Generate Sequential Invoice Number with retry on collision
    for attempt in range(5):
        inv_number = generate_unique_invoice_number(db, now_utc.year)
        existing_num = db.query(Invoice).filter(Invoice.invoice_number == inv_number).first()
        if not existing_num:
            break
    else:
        inv_number = f"APEX-INV-{now_utc.year}-{uuid.uuid4().hex[:6].upper()}"

    # 4. Generate PDF File
    storage_dir = get_invoice_storage_dir()
    pdf_filename = f"{inv_number}.pdf"
    pdf_full_path = storage_dir / pdf_filename

    pdf_bytes = generate_invoice_pdf(
        invoice_number=inv_number,
        issued_at=now_utc,
        customer_name=customer_name,
        customer_email=customer_email,
        transaction_type=transaction_type,
        items=items,
        subtotal=subtotal,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        total_amount=amount,
        currency=currency,
        customer_id=str(user.id),
        membership_number=membership_number,
        reference_id=reference_id,
        payment_method=payment_method,
        payment_reference=payment.transaction_reference,
        output_path=pdf_full_path,
    )

    # 5. Persist Invoice Record in Database
    invoice = Invoice(
        invoice_number=inv_number,
        user_id=user.id,
        customer_name=customer_name,
        customer_email=customer_email,
        transaction_type=transaction_type.upper(),
        reference_id=reference_id,
        payment_id=payment.id,
        subtotal=subtotal,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        amount=amount,
        currency=currency,
        status="PAID",
        due_date=now_utc.date(),
        issued_at=now_utc,
        pdf_path=str(pdf_full_path),
        email_status="PENDING",
        email_retry_count=0,
        idempotency_key=idempotency_key,
        items_json=json.dumps(items),
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    # 6. Send Email via SendGrid
    if send_email:
        summary_desc = items[0]["description"] if items else transaction_type.replace("_", " ").title()
        if len(items) > 1:
            summary_desc += f" (+{len(items)-1} more items)"

        email_result = send_invoice_email(
            to_email=customer_email,
            customer_name=customer_name,
            invoice_number=inv_number,
            transaction_type=transaction_type,
            issued_at_str=now_utc.strftime("%d %b %Y, %I:%M %p"),
            total_formatted=format_currency(amount, currency),
            summary_text=summary_desc,
            pdf_bytes=pdf_bytes,
            invoice_id=str(invoice.id),
        )

        if email_result.get("success"):
            invoice.email_status = "SENT"
            invoice.email_sent_at = datetime.now(timezone.utc)
            invoice.email_message_id = email_result.get("message_id")
            invoice.email_error = None
        else:
            invoice.email_status = "FAILED"
            invoice.email_error = email_result.get("error")

        db.commit()
        db.refresh(invoice)

    return invoice


def resend_invoice_email(db: Session, invoice: Invoice) -> Tuple[bool, str]:
    """Resend invoice email with rate limit protection and status update."""
    now_utc = datetime.now(timezone.utc)

    # 1. Rate Limiting: Minimum 30s interval between resends
    if invoice.email_sent_at is not None:
        sent_at = invoice.email_sent_at
        if sent_at.tzinfo is None:
            sent_at = sent_at.replace(tzinfo=timezone.utc)
        elapsed = (now_utc - sent_at).total_seconds()
        if elapsed < 30:
            return False, f"Please wait {int(30 - elapsed)} seconds before requesting another email."

    # 2. Ensure PDF file exists, or regenerate it
    storage_dir = get_invoice_storage_dir()
    pdf_path = Path(invoice.pdf_path) if invoice.pdf_path else storage_dir / f"{invoice.invoice_number}.pdf"

    if pdf_path.exists():
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
    else:
        # Re-synthesize PDF from stored invoice metadata
        items = json.loads(invoice.items_json) if invoice.items_json else [{"description": invoice.transaction_type, "quantity": 1, "unit_price": float(invoice.amount), "discount": 0, "tax": 0, "total": float(invoice.amount)}]
        pdf_bytes = generate_invoice_pdf(
            invoice_number=invoice.invoice_number,
            issued_at=invoice.issued_at,
            customer_name=invoice.customer_name,
            customer_email=invoice.customer_email,
            transaction_type=invoice.transaction_type,
            items=items,
            subtotal=invoice.subtotal,
            discount_amount=invoice.discount_amount,
            tax_amount=invoice.tax_amount,
            total_amount=invoice.amount,
            currency=invoice.currency,
            customer_id=str(invoice.user_id),
            reference_id=invoice.reference_id,
            output_path=pdf_path,
        )
        invoice.pdf_path = str(pdf_path)

    # 3. Dispatch Email
    items_list = json.loads(invoice.items_json) if invoice.items_json else []
    summary_desc = items_list[0]["description"] if items_list else invoice.transaction_type
    if len(items_list) > 1:
        summary_desc += f" (+{len(items_list)-1} more items)"

    email_result = send_invoice_email(
        to_email=invoice.customer_email,
        customer_name=invoice.customer_name,
        invoice_number=invoice.invoice_number,
        transaction_type=invoice.transaction_type,
        issued_at_str=invoice.issued_at.strftime("%d %b %Y, %I:%M %p"),
        total_formatted=format_currency(invoice.amount, invoice.currency),
        summary_text=summary_desc,
        pdf_bytes=pdf_bytes,
        invoice_id=str(invoice.id),
    )

    invoice.email_retry_count += 1
    if email_result.get("success"):
        invoice.email_status = "SENT"
        invoice.email_sent_at = now_utc
        invoice.email_message_id = email_result.get("message_id")
        invoice.email_error = None
        db.commit()
        return True, f"Invoice {invoice.invoice_number} sent successfully to {invoice.customer_email}."
    else:
        invoice.email_status = "FAILED"
        invoice.email_error = email_result.get("error")
        db.commit()
        return False, f"Email delivery failed: {email_result.get('error')}"
