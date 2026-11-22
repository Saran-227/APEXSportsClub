"""Add journal entries tables and database integrity constraints.

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-11-22 01:10:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f2a3b4c5d6e7'
down_revision = 'e1f2a3b4c5d6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create journal_entries table
    op.create_table(
        'journal_entries',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('entry_number', sa.String(50), nullable=False, unique=True),
        sa.Column('entry_date', sa.Date(), nullable=False),
        sa.Column('description', sa.String(255), nullable=False),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', sa.String(100), nullable=True),
        sa.Column('is_posted', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_journal_entries_number', 'journal_entries', ['entry_number'])
    op.create_index('ix_journal_entries_date', 'journal_entries', ['entry_date'])
    op.create_index('ix_journal_entries_ref', 'journal_entries', ['reference_type', 'reference_id'])

    # 2. Create journal_entry_lines table
    op.create_table(
        'journal_entry_lines',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('journal_entry_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('journal_entries.id', ondelete='CASCADE'), nullable=False),
        sa.Column('account_code', sa.String(20), nullable=False),
        sa.Column('account_name', sa.String(100), nullable=False),
        sa.Column('debit', sa.Numeric(12, 2), nullable=False, server_default=sa.text('0.00')),
        sa.Column('credit', sa.Numeric(12, 2), nullable=False, server_default=sa.text('0.00')),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('line_number', sa.Integer(), nullable=False, server_default=sa.text('1')),
        sa.CheckConstraint('debit >= 0', name='chk_jel_debit_non_negative'),
        sa.CheckConstraint('credit >= 0', name='chk_jel_credit_non_negative'),
    )
    op.create_index('ix_journal_lines_entry_id', 'journal_entry_lines', ['journal_entry_id'])
    op.create_index('ix_journal_lines_account', 'journal_entry_lines', ['account_code'])

    # 3. Add integrity check constraints on existing tables
    op.create_check_constraint(
        'chk_products_stock_non_negative',
        'products',
        'stock_quantity >= 0',
    )
    op.create_check_constraint(
        'chk_booking_end_after_start',
        'court_bookings',
        'end_time > start_time',
    )


def downgrade() -> None:
    op.drop_constraint('chk_booking_end_after_start', 'court_bookings', type_='check')
    op.drop_constraint('chk_products_stock_non_negative', 'products', type_='check')
    op.drop_index('ix_journal_lines_account', table_name='journal_entry_lines')
    op.drop_index('ix_journal_lines_entry_id', table_name='journal_entry_lines')
    op.drop_table('journal_entry_lines')
    op.drop_index('ix_journal_entries_ref', table_name='journal_entries')
    op.drop_index('ix_journal_entries_date', table_name='journal_entries')
    op.drop_index('ix_journal_entries_number', table_name='journal_entries')
    op.drop_table('journal_entries')
