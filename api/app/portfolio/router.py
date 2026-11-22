from typing import Annotated

from fastapi import APIRouter, Depends, Header, Response

from ..session_service import SessionService

from .models import (
    CreatePortfolioRequest,
    Portfolio,
    ProInterestRequest,
    PublicPortfolio,
    PublishPortfolioRequest,
    UpdatePortfolioRequest,
)
from .service import PortfolioService


def create_portfolio_router(
    service: PortfolioService,
    sessions: SessionService,
) -> APIRouter:
    router = APIRouter()

    def require_session(x_session_id: str | None = Header(None)) -> str:
        return sessions.require_session(x_session_id)

    SessionHeader = Annotated[str, Depends(require_session)]

    @router.get("/portfolio/catalog", tags=["portfolio"])
    def get_catalog() -> dict:
        return service.get_catalog()

    @router.post("/portfolios", status_code=201, tags=["portfolio"])
    def create_portfolio(session_id: SessionHeader, req: CreatePortfolioRequest) -> Portfolio:
        return service.create(session_id, req)

    @router.get("/portfolios/current", tags=["portfolio"])
    def get_current_portfolio(session_id: SessionHeader) -> Portfolio:
        return service.get_current(session_id)

    @router.get("/portfolios/{portfolio_id}", tags=["portfolio"])
    def get_portfolio(session_id: SessionHeader, portfolio_id: str) -> Portfolio:
        return service.get(portfolio_id, session_id)

    @router.patch("/portfolios/{portfolio_id}", tags=["portfolio"])
    def update_portfolio(session_id: SessionHeader, portfolio_id: str,
                         req: UpdatePortfolioRequest) -> Portfolio:
        return service.update(portfolio_id, session_id, req)

    @router.post("/portfolios/{portfolio_id}/publish", tags=["portfolio"])
    def publish_portfolio(session_id: SessionHeader, portfolio_id: str,
                          req: PublishPortfolioRequest) -> Portfolio:
        return service.publish(portfolio_id, session_id, req)

    @router.delete("/portfolios/{portfolio_id}/publish", tags=["portfolio"])
    def unpublish_portfolio(session_id: SessionHeader, portfolio_id: str) -> Portfolio:
        return service.unpublish(portfolio_id, session_id)

    @router.get("/p/{slug}", tags=["portfolio"])
    def get_public_portfolio(slug: str) -> PublicPortfolio:
        return service.get_public(slug)

    @router.get("/p/{slug}/media/{media_id}", tags=["portfolio"])
    def get_public_media(slug: str, media_id: str):
        return service.get_public_media(slug, media_id)

    @router.get("/p/{slug}/cv", tags=["portfolio"])
    def get_public_cv(slug: str):
        return service.get_public_cv(slug)

    @router.post("/pro-interest", status_code=202, tags=["portfolio"])
    def pro_interest(session_id: SessionHeader, req: ProInterestRequest) -> Response:
        service.register_pro_interest(session_id, req)
        return Response(status_code=202)

    return router