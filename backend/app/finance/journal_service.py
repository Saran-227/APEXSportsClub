"""Double-Entry General Ledger and Journal Service.

Enforces financial integrity:
- Every journal entry must have balanced debits and credits: sum(debit) == sum(credit).
- Line amounts must be strictly non-negative.
- Atomically persists journal headers and lines.
"""

from datetime import date, datetime, timezone
from decimal import Decimal
import logging
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy.orm import Session

from backend.app.finance.models import JournalEntry, JournalEntryLine

logger = logging.getLogger("scms.finance.journal")


def generate_journal_entry_number(db: Session, year: Optional[int] = None) -> str:
    """Generate sequential unique journal entry number like JE-2026-000001."""
    if year is None:
        year = datetime.now(timezone.utc).year

    prefix = f"JE-{year}-"
    last_entry = (
        db.query(JournalEntry.entry_number)
        .filter(JournalEntry.entry_number.like(f"{prefix}%"))
        .order_by(JournalEntry.entry_number.desc())
        .first()
    )

    if last_entry and last_entry[0]:
        try:
            seq_part = last_entry[0].split("-")[-1]
            next_seq = int(seq_part) + 1
        except Exception:
            next_seq = 1
    else:
        next_seq = 1

    return f"{prefix}{next_seq:06d}"


def create_balanced_journal_entry(
    db: Session,
    description: str,
    lines: List[Dict[str, Any]],
    entry_date: Optional[date] = None,
    entry_number: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    is_posted: bool = True,
) -> JournalEntry:
    """Record a double-entry general ledger entry.

    Strictly validates that sum(debit) == sum(credit).
    Raises ValueError and refuses to persist if unbalanced or invalid.
    """
    if not lines or len(lines) < 2:
        raise ValueError("A journal entry requires at least two lines (one debit and one credit).")

    if entry_date is None:
        entry_date = date.today()

    if not entry_number:
        entry_number = generate_journal_entry_number(db, entry_date.year)

    total_debits = Decimal("0.00")
    total_credits = Decimal("0.00")
    validated_lines: List[Dict[str, Any]] = []

    for idx, line in enumerate(lines, start=1):
        debit = Decimal(str(line.get("debit", 0.0))).quantize(Decimal("0.01"))
        credit = Decimal(str(line.get("credit", 0.0))).quantize(Decimal("0.01"))

        if debit < Decimal("0.00") or credit < Decimal("0.00"):
            raise ValueError(f"Line {idx}: Debits and credits must be non-negative numbers.")

        if debit == Decimal("0.00") and credit == Decimal("0.00"):
            raise ValueError(f"Line {idx}: Line must have either a non-zero debit or credit amount.")

        if debit > Decimal("0.00") and credit > Decimal("0.00"):
            raise ValueError(f"Line {idx}: Line cannot have both non-zero debit and credit amounts.")

        total_debits += debit
        total_credits += credit

        validated_lines.append({
            "line_number": idx,
            "account_code": str(line.get("account_code", "")).strip(),
            "account_name": str(line.get("account_name", "")).strip(),
            "debit": debit,
            "credit": credit,
            "description": line.get("description"),
        })

    # Double-entry balance check: Total Debits MUST Equal Total Credits
    if total_debits != total_credits:
        diff = abs(total_debits - total_credits)
        error_msg = (
            f"Unbalanced Journal Entry: Total debits (₹{total_debits:.2f}) do not match "
            f"total credits (₹{total_credits:.2f}). Discrepancy: ₹{diff:.2f}."
        )
        logger.error(error_msg)
        raise ValueError(error_msg)

    # Atomically create JournalEntry header and lines
    entry = JournalEntry(
        id=uuid.uuid4(),
        entry_number=entry_number,
        entry_date=entry_date,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id,
        is_posted=is_posted,
    )
    db.add(entry)
    db.flush()

    for vl in validated_lines:
        line_item = JournalEntryLine(
            id=uuid.uuid4(),
            journal_entry_id=entry.id,
            account_code=vl["account_code"],
            account_name=vl["account_name"],
            debit=vl["debit"],
            credit=vl["credit"],
            description=vl["description"],
            line_number=vl["line_number"],
        )
        db.add(line_item)

    db.commit()
    db.refresh(entry)
    logger.info("Recorded balanced journal entry %s (Total: ₹%.2f)", entry.entry_number, total_debits)
    return entry


def record_transaction_journal(
    db: Session,
    transaction_type: str,
    reference_id: str,
    amount: Decimal,
    description: str,
    payment_method: str = "UPI",
) -> JournalEntry:
    """Convenience helper to record standard double-entry revenue journals for club operations."""
    amount_dec = Decimal(str(amount)).quantize(Decimal("0.01"))
    if amount_dec <= Decimal("0.00"):
        raise ValueError("Journal transaction amount must be greater than zero.")

    # Account Mapping:
    # Asset: 1010 - Bank / UPI Clearing Account (Debit)
    # Revenue Accounts (Credit):
    # - 4010: Court Booking Revenue
    # - 4020: Sports Shop Sales Revenue
    # - 4030: Cafeteria Food & Beverage Revenue
    # - 4040: Membership Subscription Revenue
    revenue_accounts = {
        "BOOKING": ("4010", "Court Booking Revenue"),
        "SHOP": ("4020", "Sports Shop Sales Revenue"),
        "CAFETERIA": ("4030", "Cafeteria F&B Revenue"),
        "MEMBERSHIP": ("4040", "Membership Subscription Revenue"),
    }

    acct_code, acct_name = revenue_accounts.get(
        transaction_type.upper(), ("4000", "General Operating Revenue")
    )

    lines = [
        {
            "account_code": "1010",
            "account_name": f"Bank Clearing ({payment_method})",
            "debit": amount_dec,
            "credit": Decimal("0.00"),
            "description": f"Settlement received for {reference_id}",
        },
        {
            "account_code": acct_code,
            "account_name": acct_name,
            "debit": Decimal("0.00"),
            "credit": amount_dec,
            "description": description,
        },
    ]

    return create_balanced_journal_entry(
        db=db,
        description=description,
        lines=lines,
        reference_type=transaction_type.upper(),
        reference_id=reference_id,
    )
