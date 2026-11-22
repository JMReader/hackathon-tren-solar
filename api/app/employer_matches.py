"""Match structured job requirements against already approved skill evidence."""

from dataclasses import dataclass


@dataclass(frozen=True)
class CandidateEvidence:
    profile_id: str
    discoverable: bool
    approved_skills: tuple[str, ...]


def match_profiles(requirements: list[str], candidates: list[CandidateEvidence]):
    """Return a count and up to five (profile ID, matched skills) pairs internally."""
    wanted = {skill.strip().casefold() for skill in requirements if skill.strip()}
    matches = {}
    for candidate in candidates:
        if candidate.discoverable:
            evidence = {skill.strip().casefold() for skill in candidate.approved_skills}
            overlap = wanted & evidence
            if overlap:
                matches.setdefault(candidate.profile_id, set()).update(overlap)
    ranked = sorted(matches, key=lambda profile: (-len(matches[profile]), profile))
    return len(ranked), [(profile, sorted(matches[profile])) for profile in ranked[:5]]
