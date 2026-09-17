"""
Health-check business logic.

Kept separate from the route layer so that future phases can extend
this service to report on additional subsystems (database, ML service,
repository analyzer) without changing the route handler's shape.
"""

from app.core.config import settings
from app.schemas.health import HealthResponse, RootResponse


def get_root_status() -> RootResponse:
    """Return the top-level API identification payload."""
    return RootResponse(message=settings.APP_NAME, status="running")


def get_health_status() -> HealthResponse:
    """
    Return the current health status of the backend service.

    Phase 1 only reports on the API process itself. Future phases will
    extend this to aggregate database, ML service, and repository
    analyzer health without changing the response contract for callers
    that only care about `status`.
    """
    return HealthResponse(
        status="healthy",
        service="backend",
        version=settings.APP_VERSION,
    )
