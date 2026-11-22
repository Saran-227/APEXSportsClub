"""CRM Customer Enquiries and Notifications API endpoints."""
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.models import User
from backend.app.auth.service import resolve_primary_role
from backend.app.core.database import get_db
from backend.app.crm.models import CustomerEnquiry, Notification

router = APIRouter(prefix="", tags=["CRM & Notifications"])


class CustomerEnquiryRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str


class CustomerEnquiryResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: Optional[str] = None
    subject: str
    message: str
    status: str
    response_notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationResponse(BaseModel):
    id: uuid.UUID
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.post("/crm/enquiries", response_model=CustomerEnquiryResponse, status_code=status.HTTP_201_CREATED)
def submit_enquiry(
    payload: CustomerEnquiryRequest,
    db: Session = Depends(get_db),
):
    """Public / Customer: Submit a club or coaching enquiry."""
    enquiry = CustomerEnquiry(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        phone=payload.phone.strip() if payload.phone else None,
        subject=payload.subject.strip(),
        message=payload.message.strip(),
        status="NEW",
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)
    return enquiry


@router.get("/crm/enquiries", response_model=List[CustomerEnquiryResponse])
def list_enquiries_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: Review customer enquiries."""
    roles = [r.role.name for r in current_user.roles]
    if resolve_primary_role(roles) != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    return db.query(CustomerEnquiry).order_by(CustomerEnquiry.created_at.desc(), CustomerEnquiry.id.desc()).all()


@router.get("/crm/notifications", response_model=List[NotificationResponse])
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve notifications scoped to authenticated user and active role."""
    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)

    notifications = (
        db.query(Notification)
        .filter(
            (Notification.user_id == current_user.id)
            | (Notification.role_target == primary_role)
            | (Notification.role_target == None)
        )
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(20)
        .all()
    )
    return notifications
