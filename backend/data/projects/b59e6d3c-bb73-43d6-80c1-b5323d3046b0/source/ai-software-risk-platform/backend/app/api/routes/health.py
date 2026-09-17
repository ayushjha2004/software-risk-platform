"""
Health-check routes.

Route handlers stay thin: all logic is delegated to the service layer
(app.services.health_service) per the project's architectural rules.
"""

from fastapi import APIRouter

from app.schemas.health import HealthResponse
from app.services import health_service

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Backend health check",
    description="Returns the current health status of the backend API service.",
)
async def health_check() -> HealthResponse:
    return health_service.get_health_status()
