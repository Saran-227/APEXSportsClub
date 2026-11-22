"""Add GIN pg_trgm and full-text search indexes for unified global search

Revision ID: e1f2a3b4c5d6
Revises: 9971a4035d4a
Create Date: 2026-11-22 00:52:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = '9971a4035d4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable required PostgreSQL extensions if on PostgreSQL
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
        op.execute("CREATE EXTENSION IF NOT EXISTS btree_gin;")

        # 2. Trigram GIN indexes for fuzzy search, typo tolerance, and fast substring queries
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_trgm_users_name 
            ON users USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_trgm_users_email 
            ON users USING gin (email gin_trgm_ops);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_trgm_members_number 
            ON members USING gin (membership_number gin_trgm_ops);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_trgm_employees_job 
            ON employees USING gin ((job_title || ' ' || department) gin_trgm_ops);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_trgm_courts_name_sport 
            ON courts USING gin ((name || ' ' || sport) gin_trgm_ops);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_trgm_products_search 
            ON products USING gin ((name || ' ' || category || ' ' || coalesce(description, '')) gin_trgm_ops);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_trgm_products_sku 
            ON products USING gin (sku gin_trgm_ops);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_trgm_menu_items_search 
            ON menu_items USING gin ((name || ' ' || category || ' ' || coalesce(description, '')) gin_trgm_ops);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_trgm_invoices_search 
            ON invoices USING gin ((invoice_number || ' ' || coalesce(customer_name, '') || ' ' || coalesce(customer_email, '')) gin_trgm_ops);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_trgm_food_orders_number 
            ON food_orders USING gin (order_number gin_trgm_ops);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_trgm_shop_orders_number 
            ON shop_orders USING gin (order_number gin_trgm_ops);
        """)

        # 3. Full-Text Search GIN indexes using English tsvector
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_fts_products 
            ON products USING gin (to_tsvector('english', name || ' ' || category || ' ' || coalesce(description, '')));
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_fts_menu_items 
            ON menu_items USING gin (to_tsvector('english', name || ' ' || category || ' ' || coalesce(description, '')));
        """)

        # 4. Additional B-Tree indexes for range queries and sorting
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_invoices_amount_issued 
            ON invoices USING btree (issued_at DESC, amount DESC);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_food_orders_created_total 
            ON food_orders USING btree (created_at DESC, total_amount DESC);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_court_bookings_date_status 
            ON court_bookings USING btree (booking_date DESC, status);
        """)


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_court_bookings_date_status;")
        op.execute("DROP INDEX IF EXISTS ix_food_orders_created_total;")
        op.execute("DROP INDEX IF EXISTS ix_invoices_amount_issued;")
        op.execute("DROP INDEX IF EXISTS ix_fts_menu_items;")
        op.execute("DROP INDEX IF EXISTS ix_fts_products;")
        op.execute("DROP INDEX IF EXISTS ix_trgm_shop_orders_number;")
        op.execute("DROP INDEX IF EXISTS ix_trgm_food_orders_number;")
        op.execute("DROP INDEX IF EXISTS ix_trgm_invoices_search;")
        op.execute("DROP INDEX IF EXISTS ix_trgm_menu_items_search;")
        op.execute("DROP INDEX IF EXISTS ix_trgm_products_sku;")
        op.execute("DROP INDEX IF EXISTS ix_trgm_products_search;")
        op.execute("DROP INDEX IF EXISTS ix_trgm_courts_name_sport;")
        op.execute("DROP INDEX IF EXISTS ix_trgm_employees_job;")
        op.execute("DROP INDEX IF EXISTS ix_trgm_members_number;")
        op.execute("DROP INDEX IF EXISTS ix_trgm_users_email;")
        op.execute("DROP INDEX IF EXISTS ix_trgm_users_name;")
