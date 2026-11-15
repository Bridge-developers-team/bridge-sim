"""Database engine. Production is Neon Postgres (psycopg 3, async); local
development and the tests default to SQLite in a file."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine

from bridge.db import reference as _reference_tables  # noqa: F401  (registers the reference tables)
from bridge.db.models import Base


def async_url(url: str) -> str:
    """Neon and most hosts hand out `postgres://` or `postgresql://` URLs;
    SQLAlchemy needs the async driver named. Query parameters such as
    `sslmode=require` are kept: psycopg reads them like libpq does."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


def make_engine(url: str) -> AsyncEngine:
    url = async_url(url)
    if url.startswith("postgresql+psycopg://"):
        # pool_pre_ping: Neon suspends idle compute, so a pooled connection can
        # be dead after a quiet spell. prepare_threshold=None keeps psycopg
        # working through Neon's pooled (PgBouncer) endpoint too.
        return create_async_engine(url, pool_pre_ping=True, pool_size=3, connect_args={"prepare_threshold": None})
    return create_async_engine(url)


def make_sessions(engine: AsyncEngine) -> async_sessionmaker:
    return async_sessionmaker(engine, expire_on_commit=False)


async def create_tables(engine: AsyncEngine) -> None:
    """Tables created if missing: proofs, the reference data and the pay
    cache. Move to Alembic migrations the first time an existing column has
    to change."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
