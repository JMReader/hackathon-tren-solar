"""Filtro territorial para matching (#18 territorio)."""

from __future__ import annotations


def matches_territory(
    search: dict,
    profile: dict,
) -> bool:
    province = search.get("province")
    country = search.get("country") or "Argentina"
    if not province and not search.get("location"):
        return True
    p_province = (profile.get("province") or "").strip()
    p_country = (profile.get("country") or "Argentina").strip()
    work_mode = profile.get("work_mode")
    if work_mode == "remote" and p_country.casefold() == country.casefold():
        return True
    if province and p_province.casefold() == province.strip().casefold():
        return True
    loc = (search.get("location") or "").casefold()
    p_loc = (profile.get("location") or "").casefold()
    if loc and p_loc and loc.split(",")[0].strip() in p_loc:
        return True
    return False