from __future__ import annotations

import asyncio

import pytest

from app.main import Services
from app.mcp_server import build_mcp_server


def _call(server, name: str, args: dict) -> dict:
    result = asyncio.run(server.call_tool(name, args))
    assert not result.is_error, result
    assert result.structured_content is not None
    return result.structured_content


def test_mcp_tools_listed(services):
    server = build_mcp_server(services)
    names = [t.name for t in asyncio.run(server.list_tools())]
    for expected in ("ingest_achievement", "approve_achievement",
                     "generate_drafts", "get_publishable_draft"):
        assert expected in names


def test_mcp_e2e_flow(services):
    """E2E por tools MCP sobre el mismo core: ingest -> approve -> drafts -> handoff."""
    server = build_mcp_server(services)

    ach = _call(server, "ingest_achievement", {
        "text": "Hicimos una app de turnos en React. Yo diseñé las pantallas.",
        "source_metadata": {"repo": "hackathon-tren-solar", "pr": 3},
    })
    assert ach["input_type"] == "mcp"
    assert ach["status"] == "needs_review"
    sid = ach["session_id"]
    assert any(f["source"] == "mcp" for f in ach["facts"])

    ok = _call(server, "approve_achievement", {
        "achievement_id": ach["id"], "session_id": sid,
        "revision": ach["revision"],
    })
    assert ok["status"] == "approved"

    out = _call(server, "generate_drafts", {
        "achievement_id": ach["id"], "session_id": sid,
        "achievement_revision": ok["revision"],
    })
    drafts = {d["platform"]: d for d in out["drafts"]}
    assert drafts["x"]["char_count"] <= 280
    assert drafts["linkedin"]["char_count"] <= 3000

    pub = _call(server, "get_publishable_draft", {
        "draft_id": drafts["x"]["id"], "expected_revision": drafts["x"]["revision"],
    })
    assert pub["platform"] == "x" and pub["body"] == drafts["x"]["body"]

    # 409 como error de tool con causa ApiError
    from mcp.server.mcpserver import exceptions
    with pytest.raises(Exception):
        _call(server, "get_publishable_draft",
              {"draft_id": drafts["x"]["id"], "expected_revision": 99})


def test_mcp_revision_conflict_on_approve(services):
    server = build_mcp_server(services)
    ach = _call(server, "ingest_achievement",
                {"text": "Hicimos una app de turnos en React. Yo diseñé las pantallas."})
    with pytest.raises(Exception):
        _call(server, "approve_achievement",
              {"achievement_id": ach["id"], "session_id": ach["session_id"],
               "revision": 42})


def test_mcp_update_then_drafts(services):
    server = build_mcp_server(services)
    ach = _call(server, "ingest_achievement",
                {"text": "Hicimos una app. Yo diseñé las pantallas."})
    sid = ach["session_id"]
    facts = ach["facts"] + [{"id": "fact_extra", "category": "impact",
                           "text": "La probaron 12 pacientes.", "source_quote": None,
                           "source": "user"}]
    upd = _call(server, "update_achievement", {
        "achievement_id": ach["id"], "session_id": sid,
        "revision": ach["revision"], "facts": facts,
    })
    assert upd["revision"] == 2
    assert {f["id"] for f in upd["facts"]} >= {"fact_extra"}
    ok = _call(server, "approve_achievement",
               {"achievement_id": ach["id"], "session_id": sid, "revision": 2})
    out = _call(server, "generate_drafts",
                {"achievement_id": ach["id"], "session_id": sid,
                 "achievement_revision": ok["revision"]})
    assert len(out["drafts"]) == 2
