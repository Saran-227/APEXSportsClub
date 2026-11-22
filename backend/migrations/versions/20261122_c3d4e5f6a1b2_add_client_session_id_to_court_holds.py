"""Add client_session_id to court_holds table.

Revision ID: c3d4e5f6a1b2
Revises: b2c3d4e5f6a1
Create Date: 2026-11-22 11:35:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a1b2'
down_revision = 'b2c3d4e5f6a1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('court_holds', sa.Column('client_session_id', sa.String(100), nullable=True))
    op.create_index('ix_court_holds_client_session_id', 'court_holds', ['client_session_id'])


def downgrade() -> None:
    op.drop_index('ix_court_holds_client_session_id', table_name='court_holds')
    op.drop_column('court_holds', 'client_session_id')
