from __future__ import annotations

from datetime import datetime, timezone

from ..errors import ApiError
from ..ids import new_id
from .matching import approved_skills_from_achievements, rank_discoverable, skill_evidence
from .models import (
    CandidateContactRequest,
    CandidateProfileRecord,
    CreateContactRequest,
    CreateEmployerSearchRequest,
    DiscoveryConsent,
    EmployerContactRequest,
    EmployerInfo,
    EmployerSearch,
    EmployerSearchMatches,
    MatchCard,
    SkillEvidence,
    UpsertDiscoveryConsentRequest,
    UpdateContactRequest,
)
from ..employer_matches import CandidateEvidence
from ..models import Achievement
from .public_id import discovery_public_id, is_seed_employer
from .territory import matches_territory


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class EmployerService:
    def __init__(self, store, *, demo_enabled: bool = False):
        self._store = store
        self._demo_enabled = demo_enabled

    def get_employer(self, employer_id: str) -> EmployerInfo:
        row = self._store.get_employer(employer_id)
        if row is None:
            raise ApiError(404, "employer_not_found", "Empresa no encontrada.")
        plan = self._effective_plan(row)
        return EmployerInfo(
            id=row["id"],
            name=row["name"],
            verified=bool(row["verified"]),
            plan=plan,
            plan_expires_at=row.get("plan_expires_at"),
        )

    @staticmethod
    def _effective_plan(row: dict) -> str:
        if row.get("plan") != "paid":
            return "free"
        expires = row.get("plan_expires_at")
        if expires:
            try:
                exp = datetime.fromisoformat(expires.replace("Z", "+00:00"))
                if exp < datetime.now(timezone.utc):
                    return "free"
            except ValueError:
                pass
        return "paid"

    def require_employer(self, employer_id: str | None) -> EmployerInfo:
        if not employer_id:
            raise ApiError(401, "unauthorized", "Falta el header X-Employer-Id.")
        if not self._demo_enabled:
            raise ApiError(
                403, "employer_demo_disabled",
                "La API empresarial de demo requiere TS_EMPLOYER_DEMO=1.",
            )
        if not is_seed_employer(employer_id):
            raise ApiError(
                403, "employer_not_allowed",
                "Sólo empresas seed_* en modo demo.",
            )
        return self.get_employer(employer_id)

    def get_consent(self, session_id: str) -> DiscoveryConsent | None:
        row = self._store.get_discovery_consent(session_id)
        if row is None:
            return None
        return self._consent_from_row(row)

    def upsert_consent(self, session_id: str, req: UpsertDiscoveryConsentRequest) -> DiscoveryConsent:
        if not self._store.get_session(session_id):
            raise ApiError(401, "unauthorized", "Sesión inválida.")
        now = _now()
        row = {
            "session_id": session_id,
            "active": bool(req.active),
            "shared_fields": req.shared_fields,
            "share_portfolio": req.share_portfolio,
            "share_linkedin": req.share_linkedin,
            "share_x": req.share_x,
            "publications_last_7_days": req.publications_last_7_days,
            "linkedin_url": req.linkedin_url,
            "x_url": req.x_url,
            "revoked_at": None if req.active else now,
            "updated_at": now,
        }
        self._store.save_discovery_consent(row)
        return self._consent_from_row(row)

    def revoke_consent(self, session_id: str) -> None:
        now = _now()
        row = self._store.get_discovery_consent(session_id)
        if row is None:
            return
        row = dict(row)
        row["active"] = False
        row["revoked_at"] = now
        row["updated_at"] = now
        self._store.save_discovery_consent(row)

    @staticmethod
    def _consent_from_row(row: dict) -> DiscoveryConsent:
        return DiscoveryConsent(
            session_id=row["session_id"],
            active=bool(row["active"]),
            shared_fields=list(row.get("shared_fields") or []),
            share_portfolio=bool(row.get("share_portfolio")),
            share_linkedin=bool(row.get("share_linkedin")),
            share_x=bool(row.get("share_x")),
            publications_last_7_days=row.get("publications_last_7_days"),
            linkedin_url=row.get("linkedin_url"),
            x_url=row.get("x_url"),
            revoked_at=row.get("revoked_at"),
            updated_at=row["updated_at"],
        )

    def create_search(self, employer: EmployerInfo,
                      req: CreateEmployerSearchRequest) -> EmployerSearch:
        if not employer.verified:
            raise ApiError(403, "employer_unverified", "La empresa no está verificada.")
        if req.job_proposal and employer.plan != "paid":
            raise ApiError(403, "plan_required", "La propuesta laboral requiere plan pago.")
        now = _now()
        search_id = new_id("search")
        row = {
            "id": search_id,
            "employer_id": employer.id,
            "title": req.title,
            "required_skills": req.required_skills,
            "industry": req.industry,
            "location": req.location,
            "province": req.province,
            "country": req.country,
            "work_mode": req.work_mode,
            "job_proposal": req.job_proposal,
            "created_at": now,
        }
        self._store.save_employer_search(row)
        return self._search_from_row(row)

    def get_search(self, employer_id: str, search_id: str) -> EmployerSearch:
        row = self._store.get_employer_search(search_id)
        if row is None or row["employer_id"] != employer_id:
            raise ApiError(404, "search_not_found", "Búsqueda no encontrada.")
        return self._search_from_row(row)

    @staticmethod
    def _search_from_row(row: dict) -> EmployerSearch:
        return EmployerSearch(
            id=row["id"],
            employer_id=row["employer_id"],
            title=row["title"],
            required_skills=list(row["required_skills"]),
            industry=row.get("industry"),
            location=row.get("location"),
            province=row.get("province"),
            country=row.get("country"),
            work_mode=row.get("work_mode"),
            job_proposal=row.get("job_proposal"),
            created_at=row["created_at"],
        )

    def _discoverable_candidates(self) -> list[tuple[dict, dict, list[Achievement]]]:
        rows = self._store.list_active_discovery_consents()
        out = []
        for consent in rows:
            session_id = consent["session_id"]
            profile = self._store.get_candidate_profile(session_id)
            if profile is None:
                continue
            if self._demo_enabled and not profile.get("is_synthetic"):
                continue
            achievements = self._store.list_achievements(session_id)
            out.append((consent, profile, achievements))
        return out

    def _public_candidate_id(self, profile: dict) -> str:
        pid = profile.get("discovery_public_id")
        if not pid:
            raise ApiError(500, "missing_public_id", "Perfil sin identificador público.")
        return pid

    def search_matches(self, employer: EmployerInfo, search_id: str) -> EmployerSearchMatches:
        search = self.get_search(employer.id, search_id)
        discoverable = self._discoverable_candidates()
        evidence_rows: list[CandidateEvidence] = []
        ctx: dict[str, tuple[dict, dict, list]] = {}
        search_row = {
            "province": search.province,
            "country": search.country,
            "location": search.location,
        }
        for consent, profile, achievements in discoverable:
            if not matches_territory(search_row, profile):
                continue
            public_id = self._public_candidate_id(profile)
            skills = approved_skills_from_achievements(achievements)
            evidence_rows.append(CandidateEvidence(public_id, True, tuple(skills)))
            ctx[public_id] = (consent, profile, achievements)

        count, ranked = rank_discoverable(search.required_skills, evidence_rows)
        plan = employer.plan
        cards: list[MatchCard] | None = None
        if plan == "paid":
            cards = []
            for public_id, matched in ranked:
                consent, profile, achievements = ctx[public_id]
                cards.append(self._match_card(
                    public_id, consent, profile, achievements,
                    search.required_skills, matched,
                ))

        return EmployerSearchMatches(
            search_id=search.id,
            employer_plan=plan,
            eligible_count=count,
            matches=cards,
        )

    @staticmethod
    def _filter_evidence(
        evidence: list[SkillEvidence],
        shared_fields: list[str],
    ) -> list[SkillEvidence]:
        show_citation = "evidence" in shared_fields
        out: list[SkillEvidence] = []
        for item in evidence:
            out.append(SkillEvidence(
                skill=item.skill,
                state=item.state,
                citation=item.citation if show_citation else None,
            ))
        return out

    def _match_card(
        self,
        candidate_id: str,
        consent: dict,
        profile: dict,
        achievements: list,
        required: list[str],
        matched_skills: list[str],
    ) -> MatchCard:
        shared = consent.get("shared_fields") or []
        evidence = self._filter_evidence(
            skill_evidence(required, achievements, profile.get("declared_skills") or []),
            shared,
        )
        skills_out = matched_skills if "skills" in shared else []
        slug = None
        if consent.get("share_portfolio") and "portfolio" in shared:
            pf = self._store.get_published_portfolio_for_session(profile["session_id"])
            if pf:
                slug = pf.get("slug")
        display_name = profile.get("display_name") if "display_name" in shared else None
        role = profile.get("role") if "role" in shared else None
        linkedin = consent.get("linkedin_url") if consent.get("share_linkedin") else None
        x_url = consent.get("x_url") if consent.get("share_x") else None
        pubs = consent.get("publications_last_7_days")
        if "publications_7d" not in shared:
            pubs = None
        return MatchCard(
            candidate_id=candidate_id,
            display_name=display_name,
            role=role,
            matched_skills=skills_out,
            evidence=evidence,
            portfolio_slug=slug,
            linkedin_url=linkedin,
            x_url=x_url,
            publications_last_7_days=pubs,
        )

    def create_contact_request(self, employer: EmployerInfo,
                               req: CreateContactRequest) -> EmployerContactRequest:
        search = self.get_search(employer.id, req.search_id)
        profile = self._store.get_candidate_by_discovery_id(req.candidate_id)
        if profile is None:
            raise ApiError(404, "candidate_not_found", "Candidato no encontrado.")
        session_id = profile["session_id"]
        consent = self._store.get_discovery_consent(session_id)
        if consent is None or not consent.get("active"):
            raise ApiError(422, "not_discoverable", "El candidato no está visible para empresas.")
        if self._demo_enabled and not profile.get("is_synthetic"):
            raise ApiError(403, "candidate_not_allowed", "Sólo perfiles sintéticos en demo.")
        now = _now()
        cid = new_id("contact")
        row = {
            "id": cid,
            "employer_id": employer.id,
            "search_id": search.id,
            "candidate_session_id": session_id,
            "message": req.message,
            "status": "pending",
            "created_at": now,
            "updated_at": now,
        }
        self._store.save_contact_request(row)
        return EmployerContactRequest(
            id=cid,
            search_id=search.id,
            candidate_id=req.candidate_id,
            message=req.message,
            status="pending",
            created_at=now,
            updated_at=now,
        )

    def get_contact_request(self, session_id: str, contact_id: str) -> CandidateContactRequest:
        row = self._store.get_contact_request(contact_id)
        if row is None or row["candidate_session_id"] != session_id:
            raise ApiError(404, "contact_not_found", "Solicitud no encontrada.")
        emp = self._store.get_employer(row["employer_id"])
        name = emp["name"] if emp else "Empresa"
        return CandidateContactRequest(
            id=row["id"],
            employer_name=name,
            search_id=row["search_id"],
            message=row["message"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def update_contact_request(self, session_id: str, contact_id: str,
                               req: UpdateContactRequest) -> CandidateContactRequest:
        row = self._store.get_contact_request(contact_id)
        if row is None or row["candidate_session_id"] != session_id:
            raise ApiError(404, "contact_not_found", "Solicitud no encontrada.")
        if req.status not in ("accepted", "declined", "withdrawn"):
            raise ApiError(400, "bad_request", "Estado no permitido para el candidato.")
        row = dict(row)
        row["status"] = req.status
        row["updated_at"] = _now()
        self._store.save_contact_request(row)
        emp = self._store.get_employer(row["employer_id"])
        name = emp["name"] if emp else "Empresa"
        return CandidateContactRequest(
            id=row["id"],
            employer_name=name,
            search_id=row["search_id"],
            message=row["message"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def save_candidate_profile(self, record: CandidateProfileRecord) -> None:
        data = record.model_dump()
        explicit = getattr(record, "discovery_public_id", None)
        data["discovery_public_id"] = discovery_public_id(
            record.session_id, explicit or data.get("discovery_public_id"),
        )
        self._store.save_candidate_profile(data)