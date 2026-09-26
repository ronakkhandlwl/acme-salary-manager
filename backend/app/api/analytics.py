from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import request_session
from app.schemas.analytics import AnalyticsSummary, FilterOptions
from app.services.analytics import compensation_summary, list_filter_options

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])
SessionDependency = Annotated[Session, Depends(request_session)]


@router.get("/filters", response_model=FilterOptions)
def analytics_filters(session: SessionDependency) -> FilterOptions:
    return list_filter_options(session)


@router.get("/summary", response_model=AnalyticsSummary)
def analytics_summary(
    session: SessionDependency,
    country_code: str | None = None,
    department: str | None = None,
    employment_status: Literal["active", "inactive", "terminated"] | None = "active",
    as_of: date | None = None,
) -> AnalyticsSummary:
    return compensation_summary(
        session,
        as_of=as_of,
        country_code=country_code,
        department=department,
        employment_status=employment_status,
    )
