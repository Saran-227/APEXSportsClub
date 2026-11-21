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
from backend.app.bookings.models import Court, CourtBooking

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


class CourtAvailabilityResponse(BaseModel):
    court_id: uuid.UUID
    court_name: str
    sport: str
    date: date
    slots: List[TimeSlot]


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
    return query.all()


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

        slots.append(
            TimeSlot(
                time_str=slot_cursor.strftime("%H:%M"),
                is_available=not has_overlap,
                price=court.hourly_rate,
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

    # 5. Calculate membership discount if member
    member = db.query(Member).filter(Member.user_id == current_user.id).first()
    discount_amount = Decimal("0.00")
    if member and member.current_plan and member.status == "ACTIVE":
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
    db.commit()
    db.refresh(booking)

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

    bookings = query.order_by(CourtBooking.start_time.desc()).limit(100).all()

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
