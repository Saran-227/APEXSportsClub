import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add backend directory and project root to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, ".."))
project_root = os.path.abspath(os.path.join(backend_dir, ".."))
for path in (backend_dir, project_root):
    if path not in sys.path:
        sys.path.insert(0, path)

from backend.app.core.config import get_settings
from backend.app.core.database import Base
# Import all registered domain models to guarantee discovery by Alembic
import backend.app.auth.models  # noqa: F401
import backend.app.audit.models  # noqa: F401
import backend.app.memberships.models  # noqa: F401
import backend.app.bookings.models  # noqa: F401
import backend.app.shop.models  # noqa: F401
import backend.app.cafeteria.models  # noqa: F401
import backend.app.finance.models  # noqa: F401
import backend.app.employees.models  # noqa: F401
import backend.app.crm.models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    """Retrieve database URL dynamically from SCMS settings."""
    return get_settings().sqlalchemy_database_url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
