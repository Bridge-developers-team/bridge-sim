from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ProofRow(Base):
    """A published proof page. Only what the user chose to publish is here:
    no resume, no profile, no income."""

    __tablename__ = "proofs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    payload: Mapped[dict] = mapped_column(JSON)
    # sha256 of the delete key handed to the publisher once; never the key itself
    delete_key_hash: Mapped[str] = mapped_column(String(64))
