"""ApexSportsClub - Finance and Invoice Pydantic Schemas."""
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class InvoiceItemSchema(BaseModel):
    description: str
    quantity: int | float = 1
    unit_price: Decimal
    discount: Decimal = Decimal("0.00")
    tax: Decimal = Decimal("0.00")
    total: Decimal


class InvoiceResponse(BaseModel):
    id: uuid.UUID
    invoice_number: str
    user_id: uuid.UUID
    customer_name: str
    customer_email: str
    transaction_type: str
    reference_id: Optional[str] = None
    payment_id: Optional[uuid.UUID] = None
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    amount: Decimal
    currency: str
    status: str
    issued_at: datetime
    has_pdf: bool = True
    email_status: str
    email_sent_at: Optional[datetime] = None
    email_message_id: Optional[str] = None
    email_retry_count: int = 0
    email_error: Optional[str] = None
    items: List[InvoiceItemSchema] = []

    model_config = ConfigDict(from_attributes=True)


class InvoiceMetricsResponse(BaseModel):
    total_invoices: int
    total_revenue: Decimal
    successful_deliveries: int
    failed_deliveries: int
    pending_deliveries: int


class ResendInvoiceEmailResponse(BaseModel):
    success: bool
    message: str
    email_status: str
    email_sent_at: Optional[datetime] = None
    email_retry_count: int


class EmailDiagnosticTestRequest(BaseModel):
    recipient_email: EmailStr


class EmailDiagnosticTestResponse(BaseModel):
    success: bool
    status_code: int
    message_id: Optional[str] = None
    masked_recipient: str
    sender_email: str
    sender_name: str
    key_configured: bool
    key_format_valid: bool
    key_diagnostic_message: str
    sendgrid_error: Optional[str] = None
    request_initiated: bool = True


class EmailDiagnosticStatusResponse(BaseModel):
    key_configured: bool
    key_format_valid: bool
    key_diagnostic_message: str
    sender_email: str
    sender_name: str
    storage_dir: str
    recent_failed_emails_count: int
    recent_sent_emails_count: int
    recent_pending_emails_count: int
