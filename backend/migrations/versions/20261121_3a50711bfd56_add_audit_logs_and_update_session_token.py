"""Add audit logs and update session token

Revision ID: 3a50711bfd56
Revises: 0001_initial_auth
Create Date: 2026-11-21 06:07:00.221374+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a50711bfd56'
down_revision: Union[str, None] = '0001_initial_auth'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)
    op.create_index('ix_audit_logs_event_created', 'audit_logs', ['event_type', 'created_at'], unique=False)
    op.create_index(op.f('ix_audit_logs_event_type'), 'audit_logs', ['event_type'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)

    op.alter_column('sessions', 'refresh_token_hash', new_column_name='session_token_hash')
    op.add_column('sessions', sa.Column('last_activity_at', sa.DateTime(timezone=True), nullable=True))
    op.drop_index(op.f('ix_sessions_refresh_token_hash'), table_name='sessions')
    op.create_index(op.f('ix_sessions_session_token_hash'), 'sessions', ['session_token_hash'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_sessions_session_token_hash'), table_name='sessions')
    op.create_index(op.f('ix_sessions_refresh_token_hash'), 'sessions', ['session_token_hash'], unique=False)
    op.alter_column('sessions', 'session_token_hash', new_column_name='refresh_token_hash')
    op.drop_column('sessions', 'last_activity_at')

    op.drop_index(op.f('ix_audit_logs_user_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_event_type'), table_name='audit_logs')
    op.drop_index('ix_audit_logs_event_created', table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
    op.drop_table('audit_logs')
