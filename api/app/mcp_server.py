"""Capa MCP del issue #3: los mismos servicios de dominio como tools MCP.

Corre por stdio: `python -m app.mcp_server`. Las tools comparten el mismo
CoreService/SessionService que el HTTP — la sesión se crea sola si falta y la
la ingesta MCP salta el gate HTTP vía bypass interno (no usar input_type=mcp por REST).

Tools: ingest_achievement, get_achievement, update_achievement,
approve_achievement, generate_drafts, get_publishable_draft.
"""

from __future__ import annotations

import asyncio
from typing import Any

from mcp.server.mcpserver import MCPServer

from .main import Services
from .models import (
    ApproveAchievementRequest,
    Fact,
    GenerateDraftsRequest,
    UpdateAchievementRequest,
)


def build_mcp_server(services: Services) -> MCPServer:
    server = MCPServer(
        name="tren-solar-core",
        version="0.1.0",
        instructions=(
            "Motor modular de logros: ingesta texto -> hechos citados -> revisión ->"
            " aprobación -> borradores LinkedIn/X. Cero invención factual: los hechos"
            " sólo provienen del transcript o de ediciones del autor."
        ),
    )

    def _ensure_session(session_id: str | None) -> str:
        if session_id:
            return services.sessions.require_session(session_id)
        return services.sessions.create_session().session_id

    @server.tool(structured_output=True, description="Crear logro desde texto (input_type=mcp) e iniciar extracción de hechos citados")
    def ingest_achievement(
        text: str,
        session_id: str | None = None,
        photo_id: str | None = None,
        source_metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        sid = _ensure_session(session_id)
        ach = services.core.create_achievement(
            session_id=sid,
            input_type="mcp",
            text=text,
            photo_id=photo_id,
            source_metadata=source_metadata,
            bypass_onboarding_gate=True,
        )
        out = ach.model_dump(mode="json")
        out["session_id"] = sid
        return out

    @server.tool(structured_output=True, description="Consultar estado, transcript, hechos citados y preguntas abiertas de un logro")
    def get_achievement(achievement_id: str, session_id: str) -> dict[str, Any]:
        return services.core.get_achievement(session_id, achievement_id).model_dump(mode="json")

    @server.tool(structured_output=True, description="Corregir/agregar hechos de un logro con control de revisión (409 si desactualizada)")
    def update_achievement(
        achievement_id: str,
        session_id: str,
        revision: int,
        facts: list[dict[str, Any]],
        photo_id: str | None = None,
    ) -> dict[str, Any]:
        req = UpdateAchievementRequest(
            revision=revision, facts=[Fact.model_validate(f) for f in facts],
            photo_id=photo_id,
        )
        return services.core.update_achievement(session_id, achievement_id, req).model_dump(mode="json")

    @server.tool(structured_output=True, description="Aprobar una revisión concreta del logro (congela hechos para generar borradores)")
    def approve_achievement(achievement_id: str, session_id: str, revision: int) -> dict[str, Any]:
        req = ApproveAchievementRequest(revision=revision)
        return services.core.approve_achievement(session_id, achievement_id, req).model_dump(mode="json")

    @server.tool(structured_output=True, description="Generar borradores independientes LinkedIn/X desde una revisión aprobada")
    def generate_drafts(
        achievement_id: str,
        session_id: str,
        achievement_revision: int,
        platforms: list[str] | None = None,
        voice_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        req = GenerateDraftsRequest(
            achievement_revision=achievement_revision,
            platforms=platforms or ["linkedin", "x"],
            voice_context=voice_context,
        )
        return services.core.generate_drafts(session_id, achievement_id, req).model_dump(mode="json")

    @server.tool(structured_output=True, description="Handoff interno #3->#5: PublishableDraft validado contra expected_revision (409 si difiere)")
    def get_publishable_draft(draft_id: str, expected_revision: int) -> dict[str, Any]:
        return dict(services.core.get_publishable_draft(draft_id, expected_revision))

    return server


async def _run() -> None:
    server = build_mcp_server(Services())
    await server.run_stdio_async()


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
