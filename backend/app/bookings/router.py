"""Court Booking Engine and Business Rules API endpoints."""
import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.models import User
from backend.app.auth.service import resolve_primary_role
from backend.app.core.database import get_db
from backend.app.memberships.models import Member
from backend.app.bookings.models import Court, CourtBooking, CourtHold

router = APIRouter(prefix="", tags=["Courts & Bookings"])


# Schemas
class CourtResponse(BaseModel):
    id: uuid.UUID
    name: str
    sport: str
    surface_type: Optional[str] = None
    hourly_rate: Decimal
    is_indoor: bool
    is_active: bool
    opening_time: time
    closing_time: time
    image_url: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TimeSlot(BaseModel):
    time_str: str  # "HH:MM"
    is_available: bool
    price: Decimal
    is_held: bool = False
    held_by_other: bool = False
    held_remaining_seconds: int = 0


class CourtAvailabilityResponse(BaseModel):
    court_id: uuid.UUID
    court_name: str
    sport: str
    date: date
    slots: List[TimeSlot]


class AcquireHoldRequest(BaseModel):
    booking_date: date
    start_time: str = Field(..., description="Start time in HH:MM format (e.g. 18:00)")
    client_session_id: Optional[str] = None


class CourtHoldResponse(BaseModel):
    hold_id: uuid.UUID
    court_id: uuid.UUID
    court_name: str
    sport: str
    booking_date: date
    start_time: str
    expires_at: datetime
    remaining_seconds: int
    held_by_current_user: bool
    client_session_id: Optional[str] = None
    message: str


class ActiveHoldItem(BaseModel):
    hold_id: uuid.UUID
    court_id: uuid.UUID
    court_name: str
    sport: str
    booking_date: date
    start_time: str
    expires_at: datetime
    remaining_seconds: int
    held_by_current_user: bool
    client_session_id: Optional[str] = None


class CreateBookingRequest(BaseModel):
    court_id: uuid.UUID
    booking_date: date
    start_time: str = Field(..., description="Start time in HH:MM format (e.g. 09:30)")
    participant_count: int = Field(default=1, ge=1, le=8)
    notes: Optional[str] = None


class BookingResponse(BaseModel):
    id: uuid.UUID
    court_id: uuid.UUID
    court_name: str
    sport: str
    booking_date: date
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    hourly_rate: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    status: str
    participant_count: int
    notes: Optional[str] = None
    user_name: str
    user_email: str
    invoice_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


@router.get("/courts", response_model=List[CourtResponse])
def get_courts(
    sport: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List courts with optional sport category filter (padel, tennis, cricket, etc.)."""
    query = db.query(Court).filter(Court.is_active == True)
    if sport:
        clean_sport = sport.strip().lower()
        query = query.filter(Court.sport == clean_sport)
    return query.order_by(Court.created_at.desc(), Court.id.desc()).all()


@router.get("/courts/{court_id}/availability", response_model=CourtAvailabilityResponse)
def get_court_availability(
    court_id: uuid.UUID,
    booking_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
):
    """Retrieve all 30-minute time slots for a court on a date with real availability."""
    court = db.query(Court).filter(Court.id == court_id).first()
    if not court or not court.is_active:
        raise HTTPException(status_code=404, detail="Court not found or currently inactive")

    # Fetch existing confirmed bookings for this court and date
    existing_bookings = (
        db.query(CourtBooking)
        .filter(
            CourtBooking.court_id == court_id,
            CourtBooking.booking_date == booking_date,
            CourtBooking.status != "CANCELLED",
        )
        .all()
    )

    # Fetch active holds for this court and date
    now_utc = datetime.now(timezone.utc)
    active_holds = (
        db.query(CourtHold)
        .filter(
            CourtHold.court_id == court_id,
            CourtHold.booking_date == booking_date,
            CourtHold.is_active == True,
            CourtHold.expires_at > now_utc,
        )
        .all()
    )

    # Generate 30-minute intervals between opening_time and closing_time - 1 hour
    slots: List[TimeSlot] = []
    curr_hour = court.opening_time.hour
    curr_min = court.opening_time.minute
    end_hour = court.closing_time.hour
    end_min = court.closing_time.minute

    open_dt = datetime.combine(booking_date, time(curr_hour, curr_min), tzinfo=timezone.utc)
    close_dt = datetime.combine(booking_date, time(end_hour, end_min), tzinfo=timezone.utc)

    # Slot must fit a 60-minute session
    slot_cursor = open_dt
    while slot_cursor + timedelta(minutes=60) <= close_dt:
        slot_end = slot_cursor + timedelta(minutes=60)

        # Check overlap against any existing confirmed bookings
        has_overlap = False
        for b in existing_bookings:
            b_start = b.start_time
            b_end = b.end_time
            if b_start.tzinfo is None:
                b_start = b_start.replace(tzinfo=timezone.utc)
            if b_end.tzinfo is None:
                b_end = b_end.replace(tzinfo=timezone.utc)

            # Overlap condition: start < b_end and end > b_start
            if slot_cursor < b_end and slot_end > b_start:
                has_overlap = True
                break

        # Check overlap against any active 5-minute hold
        is_held = False
        held_rem_secs = 0
        for h in active_holds:
            h_start = h.start_time
            h_end = h.end_time
            if h_start.tzinfo is None:
                h_start = h_start.replace(tzinfo=timezone.utc)
            if h_end.tzinfo is None:
                h_end = h_end.replace(tzinfo=timezone.utc)

            if slot_cursor < h_end and slot_end > h_start:
                is_held = True
                held_rem_secs = max(0, int((h.expires_at - now_utc).total_seconds()))
                break

        is_avail = not has_overlap and not is_held

        slots.append(
            TimeSlot(
                time_str=slot_cursor.strftime("%H:%M"),
                is_available=is_avail,
                price=court.hourly_rate,
                is_held=is_held,
                held_by_other=is_held,
                held_remaining_seconds=held_rem_secs,
            )
        )
        slot_cursor += timedelta(minutes=30)

    return CourtAvailabilityResponse(
        court_id=court.id,
        court_name=court.name,
        sport=court.sport,
        date=booking_date,
        slots=slots,
    )


@router.post("/courts/{court_id}/hold", response_model=CourtHoldResponse)
def acquire_court_hold(
    court_id: uuid.UUID,
    payload: AcquireHoldRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Acquire or extend a 5-minute temporary reservation hold on a court slot."""
    try:
        parts = payload.start_time.split(":")
        slot_time = time(int(parts[0]), int(parts[1]))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid start_time format. Use HH:MM (e.g. 18:00)")

    start_dt = datetime.combine(payload.booking_date, slot_time, tzinfo=timezone.utc)
    end_dt = start_dt + timedelta(minutes=60)
    now_utc = datetime.now(timezone.utc)

    # 1. Verify court exists & active
    court = db.query(Court).filter(Court.id == court_id, Court.is_active == True).first()
    if not court:
        raise HTTPException(status_code=404, detail="Court not found or currently inactive.")

    # 2. Check if already confirmed booked
    conflicting_booking = (
        db.query(CourtBooking)
        .filter(
            CourtBooking.court_id == court_id,
            CourtBooking.booking_date == payload.booking_date,
            CourtBooking.status != "CANCELLED",
            CourtBooking.start_time < end_dt,
            CourtBooking.end_time > start_dt,
        )
        .first()
    )
    if conflicting_booking:
        raise HTTPException(
            status_code=409,
            detail="Conflict Detected: This court is already reserved for the selected time slot.",
        )

    # 3. Clean up expired holds
    db.query(CourtHold).filter(
        CourtHold.court_id == court_id,
        CourtHold.is_active == True,
        CourtHold.expires_at <= now_utc,
    ).update({"is_active": False}, synchronize_session=False)

    # 4. Check for existing active hold
    existing_hold = (
        db.query(CourtHold)
        .filter(
            CourtHold.court_id == court_id,
            CourtHold.booking_date == payload.booking_date,
            CourtHold.is_active == True,
            CourtHold.expires_at > now_utc,
            CourtHold.start_time < end_dt,
            CourtHold.end_time > start_dt,
        )
        .with_for_update()
        .first()
    )

    if existing_hold:
        is_same_holder = False
        if existing_hold.user_id == current_user.id:
            if not existing_hold.client_session_id or not payload.client_session_id:
                is_same_holder = True
            elif existing_hold.client_session_id == payload.client_session_id:
                is_same_holder = True

        if not is_same_holder:
            # Held by another user / another tab session!
            rem_secs = max(0, int((existing_hold.expires_at - now_utc).total_seconds()))
            raise HTTPException(
                status_code=423,  # HTTP 423 Locked
                detail="This court is currently in the booking process by someone else right now. Please select another court or try again in a few minutes.",
                headers={"Retry-After": str(rem_secs)},
            )
        else:
            # User is re-confirming / refreshing their own hold: extend 5 minutes
            existing_hold.expires_at = now_utc + timedelta(minutes=5)
            if payload.client_session_id:
                existing_hold.client_session_id = payload.client_session_id
            db.commit()
            db.refresh(existing_hold)
            return CourtHoldResponse(
                hold_id=existing_hold.id,
                court_id=court.id,
                court_name=court.name,
                sport=court.sport,
                booking_date=existing_hold.booking_date,
                start_time=payload.start_time,
                expires_at=existing_hold.expires_at,
                remaining_seconds=300,
                held_by_current_user=True,
                client_session_id=existing_hold.client_session_id,
                message="Your 5-minute reservation hold has been refreshed.",
            )

    # Deactivate any previous inactive holds for this user on this slot
    db.query(CourtHold).filter(
        CourtHold.court_id == court_id,
        CourtHold.user_id == current_user.id,
        CourtHold.booking_date == payload.booking_date,
        CourtHold.start_time == start_dt,
    ).update({"is_active": False}, synchronize_session=False)

    # 5. Create new 5-minute hold
    expires_at = now_utc + timedelta(minutes=5)
    new_hold = CourtHold(
        court_id=court.id,
        user_id=current_user.id,
        booking_date=payload.booking_date,
        start_time=start_dt,
        end_time=end_dt,
        expires_at=expires_at,
        client_session_id=payload.client_session_id,
        is_active=True,
    )
    db.add(new_hold)
    db.commit()
    db.refresh(new_hold)

    return CourtHoldResponse(
        hold_id=new_hold.id,
        court_id=court.id,
        court_name=court.name,
        sport=court.sport,
        booking_date=new_hold.booking_date,
        start_time=payload.start_time,
        expires_at=new_hold.expires_at,
        remaining_seconds=300,
        held_by_current_user=True,
        client_session_id=new_hold.client_session_id,
        message="Slot successfully locked for 5 minutes.",
    )


@router.post("/courts/{court_id}/release-hold")
def release_court_hold(
    court_id: uuid.UUID,
    payload: Optional[AcquireHoldRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Release active 5-minute court hold when user cancels or closes booking modal."""
    q = db.query(CourtHold).filter(
        CourtHold.court_id == court_id,
        CourtHold.user_id == current_user.id,
        CourtHold.is_active == True,
    )
    if payload:
        if payload.client_session_id:
            q = q.filter(
                (CourtHold.client_session_id == payload.client_session_id)
                | (CourtHold.client_session_id == None)
            )
        try:
            parts = payload.start_time.split(":")
            slot_time = time(int(parts[0]), int(parts[1]))
            start_dt = datetime.combine(payload.booking_date, slot_time, tzinfo=timezone.utc)
            q = q.filter(CourtHold.booking_date == payload.booking_date, CourtHold.start_time == start_dt)
        except Exception:
            pass

    updated = q.update({"is_active": False}, synchronize_session=False)
    db.commit()
    return {"message": "Hold successfully released.", "released_count": updated}


@router.get("/courts/holds/active", response_model=List[ActiveHoldItem])
def list_active_court_holds(
    court_id: Optional[uuid.UUID] = None,
    booking_date: Optional[date] = None,
    client_session_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List currently active 5-minute reservation holds to inform clients in real-time."""
    now_utc = datetime.now(timezone.utc)
    # Expire old holds
    db.query(CourtHold).filter(
        CourtHold.is_active == True,
        CourtHold.expires_at <= now_utc,
    ).update({"is_active": False}, synchronize_session=False)
    db.commit()

    query = (
        db.query(CourtHold)
        .join(Court, CourtHold.court_id == Court.id)
        .filter(
            CourtHold.is_active == True,
            CourtHold.expires_at > now_utc,
        )
    )
    if court_id:
        query = query.filter(CourtHold.court_id == court_id)
    if booking_date:
        query = query.filter(CourtHold.booking_date == booking_date)

    holds = query.all()
    results = []
    for h in holds:
        rem_secs = max(0, int((h.expires_at - now_utc).total_seconds()))
        time_str = h.start_time.strftime("%H:%M")
        is_mine = (h.user_id == current_user.id)
        if is_mine and client_session_id and h.client_session_id:
            is_mine = (h.client_session_id == client_session_id)

        results.append(
            ActiveHoldItem(
                hold_id=h.id,
                court_id=h.court_id,
                court_name=h.court.name,
                sport=h.court.sport,
                booking_date=h.booking_date,
                start_time=time_str,
                expires_at=h.expires_at,
                remaining_seconds=rem_secs,
                held_by_current_user=is_mine,
                client_session_id=h.client_session_id,
            )
        )
    return results


@router.post("/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: CreateBookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Concurrency-safe court reservation enforcing 60m duration, daily 2-session limit, and membership discounts."""
    # 1. Parse start time & compute 60m end time
    try:
        parts = payload.start_time.split(":")
        slot_time = time(int(parts[0]), int(parts[1]))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid start_time format. Use HH:MM (e.g. 18:30)")

    start_dt = datetime.combine(payload.booking_date, slot_time, tzinfo=timezone.utc)
    end_dt = start_dt + timedelta(minutes=60)

    # 2. Daily limit rule: A member/customer can book at most twice per day
    user_daily_count = (
        db.query(func.count(CourtBooking.id))
        .filter(
            CourtBooking.user_id == current_user.id,
            CourtBooking.booking_date == payload.booking_date,
            CourtBooking.status != "CANCELLED",
        )
        .scalar()
    )
    if user_daily_count >= 2:
        raise HTTPException(
            status_code=400,
            detail="Club Policy Limit Exceeded: Members may reserve a maximum of 2 sessions per day.",
        )

    # 3. Lock court row to prevent race conditions
    court = (
        db.query(Court)
        .filter(Court.id == payload.court_id, Court.is_active == True)
        .with_for_update()
        .first()
    )
    if not court:
        raise HTTPException(status_code=404, detail="Selected court is unavailable or inactive.")

    # 4. Check for conflicting reservations on the same court
    conflicting = (
        db.query(CourtBooking)
        .filter(
            CourtBooking.court_id == payload.court_id,
            CourtBooking.booking_date == payload.booking_date,
            CourtBooking.status != "CANCELLED",
            CourtBooking.start_time < end_dt,
            CourtBooking.end_time > start_dt,
        )
        .first()
    )
    if conflicting:
        raise HTTPException(
            status_code=409,
            detail="Conflict Detected: This court is already reserved during the selected time slot. Please pick another slot.",
        )

    # 4b. Check if slot has an active hold by another member
    now_utc = datetime.now(timezone.utc)
    active_hold = (
        db.query(CourtHold)
        .filter(
            CourtHold.court_id == payload.court_id,
            CourtHold.booking_date == payload.booking_date,
            CourtHold.is_active == True,
            CourtHold.expires_at > now_utc,
            CourtHold.start_time < end_dt,
            CourtHold.end_time > start_dt,
        )
        .first()
    )
    if active_hold and active_hold.user_id != current_user.id:
        raise HTTPException(
            status_code=423,
            detail="This court is currently in the booking process by someone else right now. Please select another court.",
        )

    # 5. Calculate membership discount if member (validating active status and expiry)
    member = db.query(Member).filter(Member.user_id == current_user.id).first()
    discount_amount = Decimal("0.00")
    is_active_member = (
        member
        and member.status == "ACTIVE"
        and (member.expiry_date is None or member.expiry_date >= payload.booking_date)
    )
    if is_active_member and member.current_plan:
        discount_pct = Decimal(str(member.current_plan.court_discount_percent or 0.0)) / Decimal("100.0")
        discount_amount = court.hourly_rate * discount_pct

    total_amount = max(Decimal("0.00"), court.hourly_rate - discount_amount)

    # 6. Create booking record
    booking = CourtBooking(
        court_id=court.id,
        user_id=current_user.id,
        member_id=member.id if member else None,
        booking_date=payload.booking_date,
        start_time=start_dt,
        end_time=end_dt,
        duration_minutes=60,
        hourly_rate=court.hourly_rate,
        discount_amount=discount_amount,
        total_amount=total_amount,
        status="CONFIRMED",
        participant_count=payload.participant_count,
        notes=payload.notes,
    )
    db.add(booking)
    if active_hold and active_hold.user_id == current_user.id:
        active_hold.is_active = False
    db.commit()
    db.refresh(booking)

    invoice_number = None
    try:
        from backend.app.finance.invoice_service import create_or_get_invoice
        slot_label = booking.start_time.strftime("%I:%M %p") if booking.start_time else "Session"
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
        )
        invoice_number = inv.invoice_number
    except Exception as e:
        import logging
        logging.getLogger("scms.bookings").error("Failed to generate booking invoice: %s", e)

    return BookingResponse(
        id=booking.id,
        court_id=court.id,
        court_name=court.name,
        sport=court.sport,
        booking_date=booking.booking_date,
        start_time=booking.start_time,
        end_time=booking.end_time,
        duration_minutes=booking.duration_minutes,
        hourly_rate=booking.hourly_rate,
        discount_amount=booking.discount_amount,
        total_amount=booking.total_amount,
        status=booking.status,
        participant_count=booking.participant_count,
        notes=booking.notes,
        user_name=f"{current_user.first_name} {current_user.last_name}".strip(),
        user_email=current_user.email,
        invoice_number=invoice_number,
    )


@router.get("/bookings", response_model=List[BookingResponse])
def list_bookings(
    court_id: Optional[uuid.UUID] = None,
    booking_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List bookings. Admin sees club-wide calendar; Customers see their own reservations."""
    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)

    query = db.query(CourtBooking).join(Court, CourtBooking.court_id == Court.id).join(User, CourtBooking.user_id == User.id)

    if primary_role != "ADMIN":
        query = query.filter(CourtBooking.user_id == current_user.id)

    if court_id:
        query = query.filter(CourtBooking.court_id == court_id)
    if booking_date:
        query = query.filter(CourtBooking.booking_date == booking_date)

    bookings = query.order_by(CourtBooking.created_at.desc(), CourtBooking.id.desc()).limit(100).all()

    result = []
    for b in bookings:
        result.append(
            BookingResponse(
                id=b.id,
                court_id=b.court_id,
                court_name=b.court.name,
                sport=b.court.sport,
                booking_date=b.booking_date,
                start_time=b.start_time,
                end_time=b.end_time,
                duration_minutes=b.duration_minutes,
                hourly_rate=b.hourly_rate,
                discount_amount=b.discount_amount,
                total_amount=b.total_amount,
                status=b.status,
                participant_count=b.participant_count,
                notes=b.notes,
                user_name=f"{b.user.first_name} {b.user.last_name}".strip(),
                user_email=b.user.email,
            )
        )
    return result


@router.patch("/bookings/{booking_id}/cancel")
def cancel_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel court booking within policy."""
    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)

    booking = db.query(CourtBooking).filter(CourtBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if primary_role != "ADMIN" and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    booking.status = "CANCELLED"
    db.commit()
    return {"message": "Booking successfully cancelled", "booking_id": str(booking_id)}
