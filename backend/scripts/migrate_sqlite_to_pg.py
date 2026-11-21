"""ApexSportsClub — SQLite to PostgreSQL Migration Script.

Safely migrates all application data from SQLite (scms.db) into PostgreSQL (apexsportsclub).
Preserves all primary keys, foreign keys, timestamps, nullability, enums, invoices, and payments.
Synchronizes all PostgreSQL sequences and verifies exact row counts.
"""

from datetime import date, datetime, time, timezone
from decimal import Decimal
import json
import logging
from pathlib import Path
import shutil
import sqlite3
import sys
import uuid

import psycopg
from psycopg import sql

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration")

# Define topological foreign key dependency order
TABLES_DEPENDENCY_ORDER = [
    "permissions",
    "roles",
    "users",
    "role_permissions",
    "user_roles",
    "sessions",
    "audit_logs",
    "membership_plans",
    "members",
    "member_subscriptions",
    "courts",
    "court_bookings",
    "vendors",
    "products",
    "shop_orders",
    "shop_order_items",
    "equipment_rentals",
    "cafeterias",
    "menu_items",
    "food_orders",
    "food_order_items",
    "payments",
    "invoices",
    "expenses",
    "employees",
    "staff_shifts",
    "customer_enquiries",
    "notifications",
]


def parse_datetime(val: str | None) -> datetime | None:
    """Parse SQLite timestamp string to timezone-aware UTC datetime."""
    if val is None:
        return None
    val_str = str(val).strip()
    if not val_str:
        return None
    try:
        # Handle ISO strings or SQLite default format 'YYYY-MM-DD HH:MM:SS.ffffff'
        dt = datetime.fromisoformat(val_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(val_str, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    logger.warning("Could not parse datetime string: %r", val)
    return None


def parse_date(val: str | None) -> date | None:
    """Parse SQLite date string to Python date."""
    if val is None:
        return None
    val_str = str(val).strip()
    if not val_str:
        return None
    try:
        return date.fromisoformat(val_str[:10])
    except Exception:
        logger.warning("Could not parse date string: %r", val)
        return None


def parse_time(val: str | None) -> time | None:
    """Parse SQLite time string to Python time."""
    if val is None:
        return None
    val_str = str(val).strip()
    if not val_str:
        return None
    try:
        return time.fromisoformat(val_str)
    except Exception:
        logger.warning("Could not parse time string: %r", val)
        return None


def parse_uuid(val: str | None) -> uuid.UUID | None:
    """Parse SQLite UUID string (hex or dashed) to Python UUID."""
    if val is None:
        return None
    val_str = str(val).strip()
    if not val_str:
        return None
    try:
        return uuid.UUID(val_str)
    except Exception:
        logger.warning("Could not parse UUID string: %r", val)
        return None


def transform_value(raw_val, col_type: str):
    """Transform raw SQLite value into PostgreSQL-compatible Python type."""
    if raw_val is None:
        return None

    norm_type = col_type.lower()

    if norm_type == "uuid":
        return parse_uuid(raw_val)

    if norm_type in ("boolean", "bool"):
        if isinstance(raw_val, bool):
            return raw_val
        if isinstance(raw_val, (int, float)):
            return bool(raw_val)
        val_str = str(raw_val).strip().lower()
        return val_str in ("1", "true", "t", "yes", "y")

    if "timestamp" in norm_type:
        return parse_datetime(raw_val)

    if norm_type == "date":
        return parse_date(raw_val)

    if norm_type.startswith("time"):
        return parse_time(raw_val)

    if norm_type in ("numeric", "decimal"):
        try:
            return Decimal(str(raw_val))
        except Exception:
            return raw_val

    if norm_type in ("integer", "smallint", "bigint"):
        try:
            return int(raw_val)
        except Exception:
            return raw_val

    if norm_type in ("json", "jsonb"):
        if isinstance(raw_val, (dict, list)):
            return json.dumps(raw_val)
        if isinstance(raw_val, str):
            # Validate JSON string
            try:
                json.loads(raw_val)
                return raw_val
            except Exception:
                return json.dumps(raw_val)
        return json.dumps(raw_val)

    return raw_val


def backup_sqlite_db(sqlite_path: Path) -> Path:
    """Create timestamped verified backup of source SQLite database."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = sqlite_path.parent / f"scms_backup_{timestamp}.db"
    logger.info("Creating backup of SQLite database: %s -> %s", sqlite_path, backup_path)
    shutil.copy2(sqlite_path, backup_path)

    # Verify backup integrity
    conn = sqlite3.connect(backup_path)
    cur = conn.cursor()
    res = cur.execute("PRAGMA integrity_check;").fetchone()
    conn.close()
    if res and res[0] == "ok":
        logger.info("SQLite backup verified successfully (PRAGMA integrity_check: ok)")
    else:
        raise RuntimeError(f"SQLite backup integrity check failed: {res}")
    return backup_path


def run_migration(sqlite_path: Path, pg_dsn: str):
    """Execute complete migration pipeline."""
    if not sqlite_path.exists():
        raise FileNotFoundError(f"Source SQLite database not found: {sqlite_path}")

    # Step 1: Backup
    backup_file = backup_sqlite_db(sqlite_path)

    # Step 2: Connect to databases
    s_conn = sqlite3.connect(sqlite_path)
    s_conn.row_factory = sqlite3.Row
    s_cur = s_conn.cursor()

    logger.info("Connecting to PostgreSQL database: %s", pg_dsn.split("@")[-1])
    p_conn = psycopg.connect(pg_dsn, autocommit=False)
    p_cur = p_conn.cursor()

    # Query PostgreSQL column schema definitions
    p_cur.execute("""
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name != 'alembic_version'
    """)
    pg_column_types = {}
    for t_name, c_name, d_type in p_cur.fetchall():
        pg_column_types.setdefault(t_name, {})[c_name] = d_type

    # Step 3: Transfer data in topological order
    try:
        for table in TABLES_DEPENDENCY_ORDER:
            # Check if table exists in SQLite
            s_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
            if not s_cur.fetchone():
                logger.warning("Table '%s' not present in SQLite database. Skipping.", table)
                continue

            s_rows = s_cur.execute(f'SELECT * FROM "{table}"').fetchall()
            row_count = len(s_rows)
            logger.info("Migrating table '%s' (%d records)...", table, row_count)

            if row_count == 0:
                continue

            # Column metadata
            col_names = [d[0] for d in s_cur.description]
            col_types = pg_column_types.get(table, {})

            # Construct INSERT statement with ON CONFLICT DO UPDATE
            placeholders = [sql.Placeholder() for _ in col_names]
            cols_ident = [sql.Identifier(c) for c in col_names]

            # Primary key is usually 'id'
            primary_key = "id" if "id" in col_names else col_names[0]

            # Build update assignments for non-pk columns
            non_pk_cols = [c for c in col_names if c != primary_key]
            if non_pk_cols:
                updates = [
                    sql.SQL("{} = EXCLUDED.{}").format(sql.Identifier(c), sql.Identifier(c))
                    for c in non_pk_cols
                ]
                insert_query = sql.SQL("""
                    INSERT INTO {} ({})
                    VALUES ({})
                    ON CONFLICT ({}) DO UPDATE SET {}
                """).format(
                    sql.Identifier(table),
                    sql.SQL(", ").join(cols_ident),
                    sql.SQL(", ").join(placeholders),
                    sql.Identifier(primary_key),
                    sql.SQL(", ").join(updates),
                )
            else:
                insert_query = sql.SQL("""
                    INSERT INTO {} ({})
                    VALUES ({})
                    ON CONFLICT ({}) DO NOTHING
                """).format(
                    sql.Identifier(table),
                    sql.SQL(", ").join(cols_ident),
                    sql.SQL(", ").join(placeholders),
                    sql.Identifier(primary_key),
                )

            # Transform and batch insert
            transformed_rows = []
            for row in s_rows:
                transformed_row = []
                for col in col_names:
                    raw_val = row[col]
                    c_type = col_types.get(col, "text")
                    transformed_row.append(transform_value(raw_val, c_type))
                transformed_rows.append(tuple(transformed_row))

            for trow in transformed_rows:
                p_cur.execute(insert_query, trow)

        # Step 4: Synchronize PostgreSQL serial sequences
        logger.info("Synchronizing PostgreSQL serial sequences...")
        p_cur.execute("""
            SELECT c.relname, a.attname, s.relname
            FROM pg_class c
            JOIN pg_attribute a ON a.attrelid = c.oid
            JOIN pg_depend d ON d.refobjid = c.oid AND d.refobjsubid = a.attnum
            JOIN pg_class s ON s.oid = d.objid
            WHERE c.relkind = 'r' AND s.relkind = 'S';
        """)
        sequences = p_cur.fetchall()
        for tab, col, seq in sequences:
            sync_query = sql.SQL("""
                SELECT setval(quote_ident(%s), COALESCE((SELECT MAX({}) FROM {}), 1), true)
            """).format(sql.Identifier(col), sql.Identifier(tab))
            p_cur.execute(sync_query, (seq,))
            logger.info("Synchronized sequence '%s' for %s.%s", seq, tab, col)

        p_conn.commit()
        logger.info("Transaction committed successfully.")

    except Exception as exc:
        p_conn.rollback()
        logger.exception("Migration failed! Transaction rolled back: %s", exc)
        raise
    finally:
        s_conn.close()
        p_conn.close()

    # Step 5: Verification
    logger.info("Beginning verification phase...")
    verify_results(sqlite_path, pg_dsn)


def verify_results(sqlite_path: Path, pg_dsn: str):
    """Compare SQLite row counts against PostgreSQL row counts and print Markdown table."""
    s_conn = sqlite3.connect(sqlite_path)
    s_cur = s_conn.cursor()

    p_conn = psycopg.connect(pg_dsn)
    p_cur = p_conn.cursor()

    results = []
    all_match = True

    print("\n" + "=" * 80)
    print("APEXSPORTSCLUB — DATABASE MIGRATION VERIFICATION TABLE")
    print("=" * 80)
    print(f"| {'Table Name':<28} | {'SQLite Rows':<12} | {'PostgreSQL Rows':<16} | {'Status':<10} |")
    print(f"|{'-' * 30}|{'-' * 14}|{'-' * 18}|{'-' * 12}|")

    for table in TABLES_DEPENDENCY_ORDER:
        s_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
        if s_cur.fetchone():
            s_count = s_cur.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
        else:
            s_count = 0

        p_cur.execute(sql.SQL('SELECT COUNT(*) FROM {}').format(sql.Identifier(table)))
        p_count = p_cur.fetchone()[0]

        status = "MATCH" if s_count == p_count else "MISMATCH"
        if status != "MATCH":
            all_match = False

        results.append({
            "table": table,
            "sqlite_count": s_count,
            "pg_count": p_count,
            "status": status,
        })
        print(f"| {table:<28} | {s_count:<12} | {p_count:<16} | {status:<10} |")

    print(f"|{'-' * 30}|{'-' * 14}|{'-' * 18}|{'-' * 12}|")
    total_s = sum(r["sqlite_count"] for r in results)
    total_p = sum(r["pg_count"] for r in results)
    print(f"| {'TOTAL':<28} | {total_s:<12} | {total_p:<16} | {'PASSED' if all_match else 'FAILED':<10} |")
    print("=" * 80 + "\n")

    s_conn.close()
    p_conn.close()


if __name__ == "__main__":
    sqlite_file = Path("/Users/asimmaji/Desktop/sports/APEXSportsClub/scms.db")
    pg_conn_url = "postgresql://apex_admin:apex_admin_password@localhost:5432/apexsportsclub"
    if len(sys.argv) > 1:
        pg_conn_url = sys.argv[1]

    run_migration(sqlite_file, pg_conn_url)
