"""Identificadores públicos opacos para vista empresarial (no session_id)."""

from __future__ import annotations

from ..ids import new_id

SEED_PREFIX = "disc_"


def discovery_public_id(session_id: str, explicit: str | None = None) -> str:
    if explicit:
        return explicit
    if session_id.startswith("seed_ses_"):
        return f"{SEED_PREFIX}{session_id.removeprefix('seed_ses_')}"
    return new_id("disc")


def is_seed_employer(employer_id: str) -> bool:
    return employer_id.startswith("seed_emp_")