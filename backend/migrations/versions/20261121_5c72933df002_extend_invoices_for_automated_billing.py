"""Extend invoices table for automated billing, PDF, and email delivery.

Revision ID: 5c72933df002
Revises: 4b61822ce001
Create Date: 2026-11-21 17:45:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '5c72933df002'
down_revision: Union[str, None] = '4b61822ce001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('invoices') as batch_op:
        batch_op.add_column(sa.Column('customer_name', sa.String(length=150), server_default='', nullable=False))
        batch_op.add_column(sa.Column('customer_email', sa.String(length=255), server_default='', nullable=False))
        batch_op.add_column(sa.Column('transaction_type', sa.String(length=50), server_default='GENERAL', nullable=False))
        batch_op.add_column(sa.Column('reference_id', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('payment_id', postgresql.UUID(as_uuid=True), nullable=True))
        batch_op.add_column(sa.Column('subtotal', sa.Numeric(precision=10, scale=2), server_default='0.00', nullable=False))
        batch_op.add_column(sa.Column('discount_amount', sa.Numeric(precision=10, scale=2), server_default='0.00', nullable=False))
        batch_op.add_column(sa.Column('tax_amount', sa.Numeric(precision=10, scale=2), server_default='0.00', nullable=False))
        batch_op.add_column(sa.Column('currency', sa.String(length=10), server_default='INR', nullable=False))
        batch_op.add_column(sa.Column('pdf_path', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('email_status', sa.String(length=30), server_default='PENDING', nullable=False))
        batch_op.add_column(sa.Column('email_sent_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('email_message_id', sa.String(length=150), nullable=True))
        batch_op.add_column(sa.Column('email_retry_count', sa.Integer(), server_default='0', nullable=False))
        batch_op.add_column(sa.Column('email_error', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('idempotency_key', sa.String(length=150), nullable=True))
        batch_op.add_column(sa.Column('items_json', sa.Text(), nullable=True))
        batch_op.create_index('ix_invoices_customer_email', ['customer_email'])
        batch_op.create_index('ix_invoices_transaction_type', ['transaction_type'])
        batch_op.create_index('ix_invoices_email_status', ['email_status'])
        batch_op.create_index('ix_invoices_idempotency_key', ['idempotency_key'], unique=True)
        batch_op.create_foreign_key('fk_invoices_payment_id', 'payments', ['payment_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    with op.batch_alter_table('invoices') as batch_op:
        batch_op.drop_constraint('fk_invoices_payment_id', type_='foreignkey')
        batch_op.drop_index('ix_invoices_idempotency_key')
        batch_op.drop_index('ix_invoices_email_status')
        batch_op.drop_index('ix_invoices_transaction_type')
        batch_op.drop_index('ix_invoices_customer_email')
        batch_op.drop_column('items_json')
        batch_op.drop_column('idempotency_key')
        batch_op.drop_column('email_error')
        batch_op.drop_column('email_retry_count')
        batch_op.drop_column('email_message_id')
        batch_op.drop_column('email_sent_at')
        batch_op.drop_column('email_status')
        batch_op.drop_column('pdf_path')
        batch_op.drop_column('currency')
        batch_op.drop_column('tax_amount')
        batch_op.drop_column('discount_amount')
        batch_op.drop_column('subtotal')
        batch_op.drop_column('payment_id')
        batch_op.drop_column('reference_id')
        batch_op.drop_column('transaction_type')
        batch_op.drop_column('customer_email')
        batch_op.drop_column('customer_name')
