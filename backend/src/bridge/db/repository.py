from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker

from bridge.db.models import ProofRow


class ProofRepository:
    def __init__(self, sessions: async_sessionmaker) -> None:
        self._sessions = sessions

    async def add(self, *, proof_id: str, created_at: datetime, payload: dict[str, Any], delete_key_hash: str) -> None:
        async with self._sessions() as session, session.begin():
            session.add(ProofRow(id=proof_id, created_at=created_at, payload=payload, delete_key_hash=delete_key_hash))

    async def get(self, proof_id: str) -> ProofRow | None:
        async with self._sessions() as session:
            return await session.get(ProofRow, proof_id)

    async def delete(self, proof_id: str, delete_key_hash: str) -> bool:
        """True when a row with this id AND this key hash was removed."""
        async with self._sessions() as session, session.begin():
            result = await session.execute(
                delete(ProofRow).where(ProofRow.id == proof_id, ProofRow.delete_key_hash == delete_key_hash)
            )
            return (result.rowcount or 0) > 0  # type: ignore[attr-defined]
