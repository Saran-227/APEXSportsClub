"""Add leave_requests table for employee leave management.

Revision ID: a1b2c3d4e5f6
Revises: f2a3b4c5d6e7
Create Date: 2026-11-22 02:40:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'f2a3b4c5d6e7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'leave_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
        sa.Column('leave_type', sa.String(50), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('days_count', sa.Integer(), nullable=False, server_default=sa.text('1')),
        sa.Column('reason', sa.String(255), nullable=False),
        sa.Column('status', sa.String(30), nullable=False, server_default=sa.text("'PENDING'")),
        sa.Column('admin_notes', sa.String(255), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_leave_requests_employee_id', 'leave_requests', ['employee_id'])
    op.create_index('ix_leave_requests_status', 'leave_requests', ['status'])
    op.create_index('ix_leave_requests_created_at', 'leave_requests', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_leave_requests_created_at', table_name='leave_requests')
    op.drop_index('ix_leave_requests_status', table_name='leave_requests')
    op.drop_index('ix_leave_requests_employee_id', table_name='leave_requests')
    op.drop_table('leave_requests')
