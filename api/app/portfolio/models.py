from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


PortfolioStatus = Literal["draft", "published", "revoked"]
ProResponse = Literal["interested", "not_now"]
ProTrigger = Literal["template", "palette", "customize", "domain"]
PriceBand = Literal["none", "up_to_2000", "2000_5000", "5000_10000", "over_10000"]


class PortfolioItemInput(BaseModel):
    achievement_id: str
    title: str = Field(min_length=3, max_length=80)
    occurred_on: str | None = None
    show_photo: bool = True


class AddPortfolioItemRequest(BaseModel):
    achievement_id: str


class CreatePortfolioRequest(BaseModel):
    display_name: str = Field(min_length=2, max_length=60)
    headline: str | None = Field(default=None, max_length=120)
    items: list[PortfolioItemInput] = Field(min_length=1, max_length=12)
    template_id: str
    palette_id: str
    cv_downloadable: bool = False


class UpdatePortfolioRequest(BaseModel):
    revision: int = Field(ge=1)
    display_name: str | None = Field(default=None, min_length=2, max_length=60)
    headline: str | None = Field(default=None, max_length=120)
    items: list[PortfolioItemInput] | None = None
    template_id: str | None = None
    palette_id: str | None = None
    cv_downloadable: bool | None = None


class PublishPortfolioRequest(BaseModel):
    revision: int = Field(ge=1)
    confirm_public: bool
    slug: str | None = Field(default=None, pattern=r"^[a-z0-9-]{3,60}$")


class Portfolio(BaseModel):
    id: str
    status: PortfolioStatus
    revision: int = Field(ge=1)
    display_name: str
    headline: str | None
    items: list[PortfolioItemInput]
    template_id: str
    palette_id: str
    cv_downloadable: bool
    has_cv: bool
    slug: str | None
    public_url: str | None
    published_revision: int | None
    published_at: str | None


class PublicFact(BaseModel):
    category: str | None = None
    text: str
    source: str


class PublicPortfolioItem(BaseModel):
    title: str
    occurred_on: str | None
    photo_url: str | None
    facts: list[PublicFact]


class PublicPortfolio(BaseModel):
    slug: str
    display_name: str
    headline: str | None
    photo_url: str | None
    template_id: str
    palette: dict
    items: list[PublicPortfolioItem]
    cv_url: str | None
    published_at: str


class ProInterestRequest(BaseModel):
    response: ProResponse
    trigger: ProTrigger | None = None
    item_id: str | None = None
    price_band_ars_month: PriceBand | None = None