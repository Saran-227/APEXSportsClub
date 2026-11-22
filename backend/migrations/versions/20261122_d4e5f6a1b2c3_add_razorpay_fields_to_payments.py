"""Add Razorpay order, payment, and signature fields to payments table.

Revision ID: d4e5f6a1b2c3
Revises: c3d4e5f6a1b2
Create Date: 2026-11-22 12:07:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd4e5f6a1b2c3'
down_revision = 'c3d4e5f6a1b2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('payments', sa.Column('razorpay_order_id', sa.String(100), nullable=True))
    op.add_column('payments', sa.Column('razorpay_payment_id', sa.String(100), nullable=True))
    op.add_column('payments', sa.Column('razorpay_signature', sa.String(255), nullable=True))
    op.create_index('ix_payments_razorpay_order_id', 'payments', ['razorpay_order_id'])
    op.create_index('ix_payments_razorpay_payment_id', 'payments', ['razorpay_payment_id'])


def downgrade() -> None:
    op.drop_index('ix_payments_razorpay_payment_id', table_name='payments')
    op.drop_index('ix_payments_razorpay_order_id', table_name='payments')
    op.drop_column('payments', 'razorpay_signature')
    op.drop_column('payments', 'razorpay_payment_id')
    op.drop_column('payments', 'razorpay_order_id')
