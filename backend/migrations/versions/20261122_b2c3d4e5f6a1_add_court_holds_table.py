"""Add court_holds table for temporary 5-minute reservation locks.

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-11-22 10:40:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a1'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'court_holds',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('court_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('courts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('booking_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_court_holds_court_id', 'court_holds', ['court_id'])
    op.create_index('ix_court_holds_user_id', 'court_holds', ['user_id'])
    op.create_index('ix_court_holds_booking_date', 'court_holds', ['booking_date'])
    op.create_index('ix_court_holds_expires_at', 'court_holds', ['expires_at'])
    op.create_index('ix_court_holds_is_active', 'court_holds', ['is_active'])
    op.create_index(
        'ix_court_holds_slot_lookup',
        'court_holds',
        ['court_id', 'booking_date', 'start_time', 'is_active', 'expires_at'],
    )


def downgrade() -> None:
    op.drop_index('ix_court_holds_slot_lookup', table_name='court_holds')
    op.drop_index('ix_court_holds_is_active', table_name='court_holds')
    op.drop_index('ix_court_holds_expires_at', table_name='court_holds')
    op.drop_index('ix_court_holds_booking_date', table_name='court_holds')
    op.drop_index('ix_court_holds_user_id', table_name='court_holds')
    op.drop_index('ix_court_holds_court_id', table_name='court_holds')
    op.drop_table('court_holds')
