"""Use case: publish a graded result as a public proof page, read it, delete it.

Only a result the server signed can be published, so the page shows exactly
the scores the grader gave. The publisher gets a delete key once; only its
hash is stored."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime

from bridge.db.repository import ProofRepository
from bridge.domain.models import Evaluation, Mode, Practice, Proof
from bridge.domain.text import clean
from bridge.services.practice import RESULT, TamperedError, result_payload
from bridge.services.signing import Signer


def _hash(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


async def publish(
    repo: ProofRepository,
    signer: Signer,
    *,
    practice: Practice,
    answer: str,
    evaluation: Evaluation,
    mode: Mode,
    result_token: str,
    reflection: str,
    display_name: str,
) -> tuple[Proof, str]:
    """Returns the stored proof and its delete key (shown to the publisher once)."""
    if not signer.verify(RESULT, result_payload(practice, answer, evaluation, mode), result_token):
        raise TamperedError("This result was changed after grading, so it cannot be published.")
    now = datetime.now(UTC)
    proof = Proof(
        id=secrets.token_urlsafe(8),
        published_at=now.isoformat(timespec="seconds"),
        mode=mode,
        display_name=clean(display_name, 60),
        reflection=clean(reflection, 600),
        practice=practice,
        answer=answer,
        evaluation=evaluation,
    )
    delete_key = secrets.token_urlsafe(24)
    await repo.add(
        proof_id=proof.id, created_at=now, payload=proof.model_dump(mode="json"), delete_key_hash=_hash(delete_key)
    )
    return proof, delete_key


async def read(repo: ProofRepository, proof_id: str) -> Proof | None:
    row = await repo.get(clean(proof_id, 32))
    return Proof.model_validate(row.payload) if row else None


async def remove(repo: ProofRepository, proof_id: str, delete_key: str) -> bool:
    return await repo.delete(clean(proof_id, 32), _hash(delete_key or ""))
