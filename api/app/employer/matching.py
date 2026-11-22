from __future__ import annotations

from ..models import Achievement, Fact
from .models import EvidenceState, SkillEvidence
from ..employer_matches import CandidateEvidence, match_profiles


def approved_skills_from_achievements(achievements: list[Achievement]) -> list[str]:
    skills: list[str] = []
    seen: set[str] = set()
    for ach in achievements:
        if ach.status != "approved":
            continue
        for fact in ach.facts:
            if fact.category == "tech" or _looks_like_skill(fact):
                key = fact.text.strip().casefold()
                if key and key not in seen:
                    seen.add(key)
                    skills.append(fact.text.strip())
    return skills


def _looks_like_skill(fact: Fact) -> bool:
    if fact.category in ("tech", "learning"):
        return True
    text = fact.text.strip()
    return len(text) <= 48 and " " not in text


def skill_evidence(
    required_skills: list[str],
    achievements: list[Achievement],
    declared: list[str],
) -> list[SkillEvidence]:
    approved = [a for a in achievements if a.status == "approved"]
    by_skill: dict[str, tuple[str, str]] = {}
    for ach in approved:
        for fact in ach.facts:
            if fact.category not in ("tech", "learning", None):
                continue
            token = fact.text.strip()
            if not token:
                continue
            by_skill.setdefault(token.casefold(), (ach.id, token))

    out: list[SkillEvidence] = []
    for raw in required_skills:
        skill = raw.strip()
        if not skill:
            continue
        key = skill.casefold()
        if key in by_skill:
            ach_id, citation = by_skill[key]
            out.append(SkillEvidence(
                skill=skill, state="supported",
                achievement_id=ach_id, citation=citation,
            ))
        else:
            out.append(SkillEvidence(skill=skill, state="missing"))
    return out


def rank_discoverable(
    required_skills: list[str],
    candidates: list[CandidateEvidence],
) -> tuple[int, list[tuple[str, list[str]]]]:
    return match_profiles(required_skills, candidates)