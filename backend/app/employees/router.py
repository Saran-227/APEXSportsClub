"""Staff, Employees, Shift Rostering, and Leave Management API endpoints."""
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.models import Role, User, UserRole
from backend.app.auth.service import resolve_primary_role
from backend.app.core.database import get_db
from backend.app.employees.models import Employee, LeaveRequest, StaffShift

router = APIRouter(prefix="", tags=["Employees & HR Management"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class EmployeeResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: str
    department: str
    job_title: str
    hourly_rate: Decimal
    estimated_monthly_pay: Decimal
    hire_date: date
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeaveRequestCreate(BaseModel):
    employee_id: uuid.UUID
    leave_type: str  # ANNUAL, SICK, CASUAL, EMERGENCY
    start_date: date
    end_date: date
    days_count: int
    reason: str


class LeaveRequestResponse(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: str
    department: str
    leave_type: str
    start_date: date
    end_date: date
    days_count: int
    reason: str
    status: str
    admin_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeaveActionRequest(BaseModel):
    admin_notes: Optional[str] = None


class PayrollSummaryResponse(BaseModel):
    total_staff: int
    active_staff: int
    total_monthly_payroll: Decimal
    departments: dict[str, int]
    roster: List[EmployeeResponse]


@router.get("/employees", response_model=List[EmployeeResponse])
def list_employees(
    department: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin / Staff: List all employees with user and payroll data."""
    roles = [r.role.name for r in current_user.roles]
    if resolve_primary_role(roles) not in ["ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    query = db.query(Employee).join(User, Employee.user_id == User.id)
    if department:
        query = query.filter(Employee.department == department)
    if status_filter:
        query = query.filter(Employee.status == status_filter.upper())

    employees = query.order_by(Employee.created_at.desc(), Employee.id.desc()).all()
    res = []
    for emp in employees:
        fname = f"{emp.user.first_name} {emp.user.last_name}".strip()
        monthly = (emp.hourly_rate * Decimal("160.00")).quantize(Decimal("0.01"))
        res.append(
            EmployeeResponse(
                id=emp.id,
                user_id=emp.user_id,
                full_name=fname,
                email=emp.user.email,
                department=emp.department,
                job_title=emp.job_title,
                hourly_rate=emp.hourly_rate,
                estimated_monthly_pay=monthly,
                hire_date=emp.hire_date,
                status=emp.status,
                created_at=emp.created_at,
            )
        )
    return res


@router.get("/employees/payroll", response_model=PayrollSummaryResponse)
def get_payroll_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: Real-time payroll calculation for employees to pay."""
    roles = [r.role.name for r in current_user.roles]
    if resolve_primary_role(roles) not in ["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    employees = db.query(Employee).join(User, Employee.user_id == User.id).order_by(Employee.created_at.desc(), Employee.id.desc()).all()

    total_staff = len(employees)
    active_staff = sum(1 for e in employees if e.status == "ACTIVE")
    total_payroll = Decimal("0.00")
    dept_counts: dict[str, int] = {}
    roster = []

    for emp in employees:
        fname = f"{emp.user.first_name} {emp.user.last_name}".strip()
        monthly = (emp.hourly_rate * Decimal("160.00")).quantize(Decimal("0.01"))
        if emp.status == "ACTIVE":
            total_payroll += monthly
        dept_counts[emp.department] = dept_counts.get(emp.department, 0) + 1
        roster.append(
            EmployeeResponse(
                id=emp.id,
                user_id=emp.user_id,
                full_name=fname,
                email=emp.user.email,
                department=emp.department,
                job_title=emp.job_title,
                hourly_rate=emp.hourly_rate,
                estimated_monthly_pay=monthly,
                hire_date=emp.hire_date,
                status=emp.status,
                created_at=emp.created_at,
            )
        )

    return PayrollSummaryResponse(
        total_staff=total_staff,
        active_staff=active_staff,
        total_monthly_payroll=total_payroll,
        departments=dept_counts,
        roster=roster,
    )


@router.get("/employees/leaves", response_model=List[LeaveRequestResponse])
def list_leave_requests(
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin / Staff: List leave requests with approval status."""
    roles = [r.role.name for r in current_user.roles]
    if resolve_primary_role(roles) not in ["ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    query = db.query(LeaveRequest).join(Employee, LeaveRequest.employee_id == Employee.id).join(User, Employee.user_id == User.id)
    if status_filter:
        query = query.filter(LeaveRequest.status == status_filter.upper())

    leaves = query.order_by(LeaveRequest.created_at.desc(), LeaveRequest.id.desc()).all()
    res = []
    for lr in leaves:
        fname = f"{lr.employee.user.first_name} {lr.employee.user.last_name}".strip()
        res.append(
            LeaveRequestResponse(
                id=lr.id,
                employee_id=lr.employee_id,
                employee_name=fname,
                department=lr.employee.department,
                leave_type=lr.leave_type,
                start_date=lr.start_date,
                end_date=lr.end_date,
                days_count=lr.days_count,
                reason=lr.reason,
                status=lr.status,
                admin_notes=lr.admin_notes,
                reviewed_at=lr.reviewed_at,
                created_at=lr.created_at,
            )
        )
    return res


@router.post("/employees/leaves", response_model=LeaveRequestResponse, status_code=status.HTTP_201_CREATED)
def submit_leave_request(
    payload: LeaveRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a new employee leave request."""
    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee record not found")

    leave = LeaveRequest(
        id=uuid.uuid4(),
        employee_id=emp.id,
        leave_type=payload.leave_type.upper(),
        start_date=payload.start_date,
        end_date=payload.end_date,
        days_count=payload.days_count,
        reason=payload.reason,
        status="PENDING",
        created_at=utc_now(),
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)

    fname = f"{emp.user.first_name} {emp.user.last_name}".strip()
    return LeaveRequestResponse(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=fname,
        department=emp.department,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        days_count=leave.days_count,
        reason=leave.reason,
        status=leave.status,
        admin_notes=leave.admin_notes,
        reviewed_at=leave.reviewed_at,
        created_at=leave.created_at,
    )


@router.patch("/employees/leaves/{leave_id}/approve", response_model=LeaveRequestResponse)
def approve_leave_request(
    leave_id: uuid.UUID,
    payload: Optional[LeaveActionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: Approve an employee leave request."""
    roles = [r.role.name for r in current_user.roles]
    if resolve_primary_role(roles) not in ["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave.status = "APPROVED"
    leave.reviewed_at = utc_now()
    if payload and payload.admin_notes:
        leave.admin_notes = payload.admin_notes

    today = date.today()
    if leave.start_date <= today <= leave.end_date:
        leave.employee.status = "ON_LEAVE"

    db.commit()
    db.refresh(leave)

    fname = f"{leave.employee.user.first_name} {leave.employee.user.last_name}".strip()
    return LeaveRequestResponse(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=fname,
        department=leave.employee.department,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        days_count=leave.days_count,
        reason=leave.reason,
        status=leave.status,
        admin_notes=leave.admin_notes,
        reviewed_at=leave.reviewed_at,
        created_at=leave.created_at,
    )


@router.patch("/employees/leaves/{leave_id}/reject", response_model=LeaveRequestResponse)
def reject_leave_request(
    leave_id: uuid.UUID,
    payload: Optional[LeaveActionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: Reject an employee leave request."""
    roles = [r.role.name for r in current_user.roles]
    if resolve_primary_role(roles) not in ["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave.status = "REJECTED"
    leave.reviewed_at = utc_now()
    if payload and payload.admin_notes:
        leave.admin_notes = payload.admin_notes

    db.commit()
    db.refresh(leave)

    fname = f"{leave.employee.user.first_name} {leave.employee.user.last_name}".strip()
    return LeaveRequestResponse(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=fname,
        department=leave.employee.department,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        days_count=leave.days_count,
        reason=leave.reason,
        status=leave.status,
        admin_notes=leave.admin_notes,
        reviewed_at=leave.reviewed_at,
        created_at=leave.created_at,
    )
