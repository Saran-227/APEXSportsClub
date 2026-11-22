"""ApexSportsClub - Razorpay Payment API Router.

Provides endpoints for client public configuration, server-side Razorpay order creation,
cryptographic signature verification, and automated webhook event ingestion.
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import logging
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.models import User
from backend.app.bookings.models import Court, CourtBooking, CourtHold
from backend.app.cafeteria.models import Cafeteria, FoodOrder, FoodOrderItem, MenuItem
from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.finance.invoice_service import create_or_get_invoice
from backend.app.finance.models import Payment
from backend.app.finance.razorpay_service import (
    create_order,
    get_razorpay_public_config,
    verify_payment_signature,
    verify_webhook_signature,
)
from backend.app.memberships.models import Member, MembershipPlan, MemberSubscription
from backend.app.shop.models import EquipmentRental, Product, ShopOrder, ShopOrderItem

logger = logging.getLogger("scms.payments")

router = APIRouter(prefix="/payments/razorpay", tags=["Razorpay Payment Gateway"])


# --- Schemas ---

class RazorpayConfigResponse(BaseModel):
    key_id: str
    currency: str
    is_active: bool
    merchant_name: str
    theme_color: str


class CreateRazorpayOrderRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Transaction amount in INR")
    purpose: str = Field(..., description="BOOKING | SHOP | CAFETERIA | MEMBERSHIP | RENTAL")
    reference_id: Optional[str] = Field(None, description="Optional domain reference ID")
    notes: Optional[Dict[str, str]] = None


class CreateRazorpayOrderResponse(BaseModel):
    order_id: str
    amount: int  # in paise
    amount_inr: Decimal
    currency: str
    key_id: str
    purpose: str
    reference_id: Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    purpose: str  # BOOKING | SHOP | CAFETERIA | MEMBERSHIP | RENTAL
    payload: Dict[str, Any]


class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    purpose: str
    payment_id: str
    order_id: str
    invoice_number: Optional[str] = None
    reference_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


# --- Endpoints ---

@router.get("/config", response_model=RazorpayConfigResponse)
def get_config():
    """Retrieve public Razorpay configuration for frontend checkout. Never exposes secrets."""
    return get_razorpay_public_config()


@router.post("/create-order", response_model=CreateRazorpayOrderResponse)
def create_payment_order(
    request: CreateRazorpayOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a server-side Razorpay order and register a pending payment record."""
    settings = get_settings()
    notes = request.notes or {}
    notes.update({
        "user_id": str(current_user.id),
        "user_email": current_user.email,
        "purpose": request.purpose.upper(),
        "reference_id": request.reference_id or "",
    })

    try:
        order = create_order(
            amount=request.amount,
            currency="INR",
            receipt=f"rcpt_{uuid.uuid4().hex[:12]}",
            notes=notes,
        )
    except Exception as exc:
        logger.error("Failed to create Razorpay order: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to initialize payment with Razorpay gateway: {str(exc)}",
        )

    # Register pending payment record for reconciliation
    pending_payment = Payment(
        user_id=current_user.id,
        amount=request.amount,
        payment_method="RAZORPAY",
        status="PENDING",
        reference_type=request.purpose.upper(),
        reference_id=request.reference_id or order.get("id"),
        transaction_reference=order.get("id"),
        razorpay_order_id=order.get("id"),
        notes=f"Pending Razorpay checkout for {request.purpose.upper()}",
    )
    db.add(pending_payment)
    db.commit()

    return CreateRazorpayOrderResponse(
        order_id=order.get("id"),
        amount=order.get("amount"),
        amount_inr=request.amount,
        currency=order.get("currency", "INR"),
        key_id=settings.RAZORPAY_KEY_ID or "",
        purpose=request.purpose.upper(),
        reference_id=request.reference_id,
    )


@router.post("/verify", response_model=VerifyPaymentResponse)
def verify_payment(
    req: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cryptographically verify Razorpay HMAC signature and complete purchase flow."""
    is_valid = verify_payment_signature(
        razorpay_order_id=req.razorpay_order_id,
        razorpay_payment_id=req.razorpay_payment_id,
        razorpay_signature=req.razorpay_signature,
    )
    if not is_valid:
        logger.warning(
            "Payment signature verification failed for user %s, order %s, payment %s",
            current_user.id,
            req.razorpay_order_id,
            req.razorpay_payment_id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed: Invalid Razorpay cryptographic signature.",
        )

    purpose = req.purpose.upper()
    payload = req.payload
    invoice_number = None
    reference_id = None
    details: Dict[str, Any] = {}

    # Update pending payment status if present
    pending = (
        db.query(Payment)
        .filter(Payment.razorpay_order_id == req.razorpay_order_id, Payment.status == "PENDING")
        .first()
    )
    if pending:
        pending.status = "COMPLETED"
        pending.razorpay_payment_id = req.razorpay_payment_id
        pending.razorpay_signature = req.razorpay_signature
        pending.transaction_reference = req.razorpay_payment_id
        db.commit()

    # --- 1. COURT BOOKING ---
    if purpose == "BOOKING":
        court_id_raw = payload.get("court_id")
        booking_date_raw = payload.get("booking_date")
        start_time_raw = payload.get("start_time")
        participant_count = int(payload.get("participant_count", 1))

        if not court_id_raw or not booking_date_raw or not start_time_raw:
            raise HTTPException(status_code=400, detail="Missing booking parameters (court_id, booking_date, start_time)")

        court_uuid = uuid.UUID(str(court_id_raw))
        b_date = date.fromisoformat(str(booking_date_raw)) if isinstance(booking_date_raw, str) else booking_date_raw
        parts = start_time_raw.split(":")
        start_dt = datetime.combine(b_date, datetime.min.time(), tzinfo=timezone.utc).replace(
            hour=int(parts[0]), minute=int(parts[1])
        )
        end_dt = start_dt + timedelta(minutes=60)

        court = db.query(Court).filter(Court.id == court_uuid, Court.is_active == True).first()
        if not court:
            raise HTTPException(status_code=404, detail="Court not found")

        member = db.query(Member).filter(Member.user_id == current_user.id, Member.status == "ACTIVE").first()
        discount_amount = Decimal("0.00")
        if member and member.current_plan:
            pct = Decimal(str(member.current_plan.court_discount_percent or 0)) / Decimal("100")
            discount_amount = court.hourly_rate * pct

        total_amount = max(Decimal("0.00"), court.hourly_rate - discount_amount)

        booking = CourtBooking(
            court_id=court.id,
            user_id=current_user.id,
            member_id=member.id if member else None,
            booking_date=b_date,
            start_time=start_dt,
            end_time=end_dt,
            duration_minutes=60,
            hourly_rate=court.hourly_rate,
            discount_amount=discount_amount,
            total_amount=total_amount,
            status="CONFIRMED",
            participant_count=participant_count,
            notes=payload.get("notes"),
        )
        db.add(booking)

        # Deactivate any active hold
        db.query(CourtHold).filter(
            CourtHold.court_id == court.id,
            CourtHold.user_id == current_user.id,
            CourtHold.booking_date == b_date,
            CourtHold.is_active == True,
        ).update({"is_active": False}, synchronize_session=False)

        db.commit()
        db.refresh(booking)

        slot_label = start_dt.strftime("%I:%M %p")
        inv = create_or_get_invoice(
            db=db,
            user=current_user,
            transaction_type="BOOKING",
            amount=booking.total_amount,
            items=[{
                "description": f"{court.sport.capitalize()} - {court.name} (60 mins on {booking.booking_date} at {slot_label})",
                "quantity": 1,
                "unit_price": float(court.hourly_rate),
                "discount": float(booking.discount_amount),
                "tax": 0.0,
                "total": float(booking.total_amount),
            }],
            subtotal=court.hourly_rate,
            discount_amount=booking.discount_amount,
            reference_id=f"BKG-{str(booking.id)[:8].upper()}",
            membership_number=member.membership_number if member else None,
            idempotency_key=f"BOOKING:{booking.id}",
            payment_method="RAZORPAY",
            payment_reference=req.razorpay_payment_id,
            razorpay_order_id=req.razorpay_order_id,
            razorpay_payment_id=req.razorpay_payment_id,
            razorpay_signature=req.razorpay_signature,
        )
        invoice_number = inv.invoice_number
        reference_id = str(booking.id)
        details = {"booking_id": str(booking.id), "court_name": court.name, "start_time": slot_label}

    # --- 2. SPORTS SHOP ORDER ---
    elif purpose == "SHOP":
        raw_items = payload.get("items", [])
        if not raw_items:
            raise HTTPException(status_code=400, detail="Cannot checkout with empty items list")

        order_items_to_create = []
        total_amount = Decimal("0.00")

        for item_data in raw_items:
            p_uuid = uuid.UUID(str(item_data["product_id"]))
            qty = int(item_data["quantity"])
            prod = db.query(Product).filter(Product.id == p_uuid, Product.is_active == True).with_for_update().first()
            if not prod:
                raise HTTPException(status_code=404, detail=f"Product not found: {p_uuid}")
            if prod.stock_quantity < qty:
                raise HTTPException(status_code=400, detail=f"Insufficient inventory for {prod.name}")

            prod.stock_quantity -= qty
            line_total = prod.price * Decimal(qty)
            total_amount += line_total
            order_items_to_create.append((prod, qty, prod.price, line_total))

        vendor_id = order_items_to_create[0][0].vendor_id
        order_num = f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
        order = ShopOrder(
            vendor_id=vendor_id,
            order_number=order_num,
            user_id=current_user.id,
            total_amount=total_amount,
            status="PENDING",
            payment_status="PAID",
            fulfilment_type=payload.get("fulfilment_type", "PICKUP"),
            delivery_address=payload.get("delivery_address"),
        )
        db.add(order)
        db.flush()

        for prod, qty, u_price, l_total in order_items_to_create:
            oi = ShopOrderItem(
                order_id=order.id,
                product_id=prod.id,
                quantity=qty,
                unit_price=u_price,
                total_price=l_total,
            )
            db.add(oi)

        db.commit()
        db.refresh(order)

        member = db.query(Member).filter(Member.user_id == current_user.id).first()
        items_payload = [
            {
                "description": f"{prod.name} (SKU: {str(prod.id)[:8].upper()})",
                "quantity": qty,
                "unit_price": float(u_price),
                "discount": 0.0,
                "tax": 0.0,
                "total": float(l_total),
            }
            for prod, qty, u_price, l_total in order_items_to_create
        ]
        inv = create_or_get_invoice(
            db=db,
            user=current_user,
            transaction_type="SHOP",
            amount=order.total_amount,
            items=items_payload,
            reference_id=order.order_number,
            membership_number=member.membership_number if member else None,
            idempotency_key=f"SHOP_ORDER:{order.id}",
            payment_method="RAZORPAY",
            payment_reference=req.razorpay_payment_id,
            razorpay_order_id=req.razorpay_order_id,
            razorpay_payment_id=req.razorpay_payment_id,
            razorpay_signature=req.razorpay_signature,
        )
        invoice_number = inv.invoice_number
        reference_id = order.order_number
        details = {"order_id": str(order.id), "order_number": order.order_number, "total_amount": float(total_amount)}

    # --- 3. CAFETERIA FOOD ORDER ---
    elif purpose == "CAFETERIA":
        raw_items = payload.get("items", [])
        if not raw_items:
            raise HTTPException(status_code=400, detail="Cannot order food with empty tray")

        cafe = db.query(Cafeteria).filter(Cafeteria.status == "ACTIVE").first()
        cafe_id = cafe.id if cafe else None

        order_items_to_create = []
        total_amount = Decimal("0.00")

        for item_data in raw_items:
            m_uuid = uuid.UUID(str(item_data["menu_item_id"]))
            qty = int(item_data["quantity"])
            m_item = db.query(MenuItem).filter(MenuItem.id == m_uuid, MenuItem.is_available == True).first()
            if not m_item:
                raise HTTPException(status_code=404, detail="Menu item not found or unavailable")
            line_total = m_item.price * Decimal(qty)
            total_amount += line_total
            order_items_to_create.append((m_item, qty, m_item.price, line_total, item_data.get("special_instructions")))

        order_num = f"FOOD-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
        order = FoodOrder(
            order_number=order_num,
            user_id=current_user.id,
            cafeteria_id=cafe_id,
            total_amount=total_amount,
            status="NEW",
            payment_status="PAID",
            order_type=payload.get("order_type", "DINE_IN"),
            customer_notes=payload.get("customer_notes"),
        )
        db.add(order)
        db.flush()

        for m_item, qty, u_price, l_total, notes in order_items_to_create:
            foi = FoodOrderItem(
                order_id=order.id,
                menu_item_id=m_item.id,
                item_name=m_item.name,
                quantity=qty,
                unit_price=u_price,
                total_price=l_total,
                special_instructions=notes,
            )
            db.add(foi)

        db.commit()
        db.refresh(order)

        member = db.query(Member).filter(Member.user_id == current_user.id).first()
        items_payload = [
            {
                "description": m_item.name + (f" ({notes})" if notes else ""),
                "quantity": qty,
                "unit_price": float(u_price),
                "discount": 0.0,
                "tax": 0.0,
                "total": float(l_total),
            }
            for m_item, qty, u_price, l_total, notes in order_items_to_create
        ]
        inv = create_or_get_invoice(
            db=db,
            user=current_user,
            transaction_type="CAFETERIA",
            amount=order.total_amount,
            items=items_payload,
            reference_id=order.order_number,
            membership_number=member.membership_number if member else None,
            idempotency_key=f"FOOD_ORDER:{order.id}",
            payment_method="RAZORPAY",
            payment_reference=req.razorpay_payment_id,
            razorpay_order_id=req.razorpay_order_id,
            razorpay_payment_id=req.razorpay_payment_id,
            razorpay_signature=req.razorpay_signature,
        )
        invoice_number = inv.invoice_number
        reference_id = order.order_number
        details = {"order_id": str(order.id), "order_number": order.order_number, "total_amount": float(total_amount)}

    # --- 4. MEMBERSHIP SUBSCRIPTION ---
    elif purpose == "MEMBERSHIP":
        plan_id_raw = payload.get("plan_id")
        if not plan_id_raw:
            raise HTTPException(status_code=400, detail="Missing plan_id for membership subscription")

        plan_uuid = uuid.UUID(str(plan_id_raw))
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_uuid, MembershipPlan.is_active == True).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Membership plan not found")

        member = db.query(Member).filter(Member.user_id == current_user.id).first()
        if not member:
            mem_num = f"APX-MEM-{uuid.uuid4().hex[:6].upper()}"
            member = Member(
                user_id=current_user.id,
                membership_number=mem_num,
                current_plan_id=plan.id,
                status="ACTIVE",
                emergency_contact_name="Club Member",
                emergency_contact_phone="+91 9999999999",
            )
            db.add(member)
            db.flush()

        today = date.today()
        member.current_plan_id = plan.id
        member.status = "ACTIVE"
        member.expiry_date = today + timedelta(days=plan.duration_months * 30)

        sub = MemberSubscription(
            member_id=member.id,
            plan_id=plan.id,
            start_date=today,
            end_date=member.expiry_date,
            amount_paid=plan.price,
            payment_status="PAID",
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)

        inv = create_or_get_invoice(
            db=db,
            user=current_user,
            transaction_type="MEMBERSHIP",
            amount=plan.price,
            items=[{
                "description": f"{plan.name} Tier Membership ({plan.duration_months} Months)",
                "quantity": 1,
                "unit_price": float(plan.price),
                "discount": 0.0,
                "tax": 0.0,
                "total": float(plan.price),
            }],
            reference_id=f"SUB-{str(sub.id)[:8].upper()}",
            membership_number=member.membership_number,
            idempotency_key=f"MEMBERSHIP:{sub.id}",
            payment_method="RAZORPAY",
            payment_reference=req.razorpay_payment_id,
            razorpay_order_id=req.razorpay_order_id,
            razorpay_payment_id=req.razorpay_payment_id,
            razorpay_signature=req.razorpay_signature,
        )
        invoice_number = inv.invoice_number
        reference_id = member.membership_number
        details = {"subscription_id": str(sub.id), "tier": plan.name, "membership_number": member.membership_number}

    # --- 5. EQUIPMENT RENTAL ---
    elif purpose == "RENTAL":
        product_id_raw = payload.get("product_id")
        rental_start_raw = payload.get("rental_start")
        rental_end_raw = payload.get("rental_end")

        if not product_id_raw or not rental_start_raw or not rental_end_raw:
            raise HTTPException(status_code=400, detail="Missing rental parameters")

        prod = db.query(Product).filter(Product.id == uuid.UUID(str(product_id_raw)), Product.is_rental == True).first()
        if not prod:
            raise HTTPException(status_code=404, detail="Rental product not found")

        r_start = datetime.fromisoformat(str(rental_start_raw).replace("Z", "+00:00"))
        r_end = datetime.fromisoformat(str(rental_end_raw).replace("Z", "+00:00"))
        duration_days = max(1, (r_end.date() - r_start.date()).days)
        daily_rate = prod.rental_price_per_day or prod.price
        rental_fee = daily_rate * Decimal(duration_days)

        rental = EquipmentRental(
            product_id=prod.id,
            user_id=current_user.id,
            rental_start=r_start,
            rental_end=r_end,
            rental_fee=rental_fee,
            status="ACTIVE",
            notes=payload.get("notes"),
        )
        db.add(rental)
        db.commit()
        db.refresh(rental)

        member = db.query(Member).filter(Member.user_id == current_user.id).first()
        start_str = r_start.strftime("%Y-%m-%d")
        end_str = r_end.strftime("%Y-%m-%d")
        inv = create_or_get_invoice(
            db=db,
            user=current_user,
            transaction_type="RENTAL",
            amount=rental.rental_fee,
            items=[{
                "description": f"Rental: {prod.name} ({duration_days} day(s): {start_str} to {end_str})",
                "quantity": duration_days,
                "unit_price": float(daily_rate),
                "discount": 0.0,
                "tax": 0.0,
                "total": float(rental.rental_fee),
            }],
            reference_id=f"RNT-{str(rental.id)[:8].upper()}",
            membership_number=member.membership_number if member else None,
            idempotency_key=f"RENTAL:{rental.id}",
            payment_method="RAZORPAY",
            payment_reference=req.razorpay_payment_id,
            razorpay_order_id=req.razorpay_order_id,
            razorpay_payment_id=req.razorpay_payment_id,
            razorpay_signature=req.razorpay_signature,
        )
        invoice_number = inv.invoice_number
        reference_id = f"RNT-{str(rental.id)[:8].upper()}"
        details = {"rental_id": str(rental.id), "product_name": prod.name, "rental_fee": float(rental_fee)}

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported payment purpose: {purpose}")

    return VerifyPaymentResponse(
        success=True,
        message=f"Razorpay payment successfully verified and {purpose} fulfilled.",
        purpose=purpose,
        payment_id=req.razorpay_payment_id,
        order_id=req.razorpay_order_id,
        invoice_number=invoice_number,
        reference_id=reference_id,
        details=details,
    )


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    db: Session = Depends(get_db),
):
    """Asynchronous webhook handler processing payment.captured and payment.failed events."""
    body_bytes = await request.body()

    if x_razorpay_signature:
        is_valid = verify_webhook_signature(body_bytes, x_razorpay_signature)
        if not is_valid:
            logger.warning("Razorpay webhook signature verification failed")
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        import json
        event_payload = json.loads(body_bytes.decode("utf-8"))
        event_type = event_payload.get("event")
        logger.info("Received Razorpay webhook event: %s", event_type)

        payment_entity = event_payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        payment_id = payment_entity.get("id")
        status_val = payment_entity.get("status")

        if order_id:
            payment = db.query(Payment).filter(Payment.razorpay_order_id == order_id).first()
            if payment:
                if status_val == "captured":
                    payment.status = "COMPLETED"
                    payment.razorpay_payment_id = payment_id
                    payment.transaction_reference = payment_id
                elif status_val == "failed":
                    payment.status = "FAILED"
                db.commit()

        return {"status": "ok", "event": event_type}
    except Exception as exc:
        logger.error("Error processing Razorpay webhook: %s", exc)
        return {"status": "error", "detail": str(exc)}
