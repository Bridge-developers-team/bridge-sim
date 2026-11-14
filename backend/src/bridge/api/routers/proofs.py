"""Public proof pages: publish a signed result, read it without login, delete it
with the key handed out at publish time."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response

from bridge.api.schemas import MAX_ANSWER, PublishRequest, PublishResponse
from bridge.api.state import AppState, client_key, get_state
from bridge.domain.models import Proof
from bridge.services import proofs

router = APIRouter(prefix="/api/proofs", tags=["proofs"])
State = Annotated[AppState, Depends(get_state)]


@router.post("", status_code=201, summary="Publish a graded practice result")
async def publish(body: PublishRequest, request: Request, state: State) -> PublishResponse:
    if len(body.answer) > MAX_ANSWER:
        raise HTTPException(400, "That answer is too long to publish.")
    if not state.proofs_per_client.allow(client_key(request)):
        raise HTTPException(429, "Too many pages published from this browser. Try again in an hour.")
    proof, delete_key = await proofs.publish(
        state.proofs,
        state.signer,
        practice=body.practice,
        answer=body.answer,
        evaluation=body.evaluation,
        mode=body.mode,
        result_token=body.result_token,
        reflection=body.reflection,
        display_name=body.display_name,
    )
    return PublishResponse(proof=proof, delete_key=delete_key)


@router.get("/{proof_id}", summary="Read a published proof page")
async def read(proof_id: str, state: State) -> Proof:
    proof = await proofs.read(state.proofs, proof_id)
    if proof is None:
        raise HTTPException(404, "This page does not exist or was deleted by its author.")
    return proof


@router.delete("/{proof_id}", status_code=204, summary="Delete a proof page (needs its delete key)")
async def delete(proof_id: str, state: State, x_delete_key: Annotated[str, Header()] = "") -> Response:
    if not await proofs.remove(state.proofs, proof_id, x_delete_key):
        raise HTTPException(404, "Nothing to delete: wrong link or key, or already deleted.")
    return Response(status_code=204)
