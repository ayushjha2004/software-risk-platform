"""Response schemas for the health-check endpoints."""

from pydantic import BaseModel, Field


class RootResponse(BaseModel):
    """Response returned by the API root endpoint."""

    message: str = Field(..., description="Human-readable API identification message")
    status: str = Field(..., description="Current running status of the API")


class HealthResponse(BaseModel):
    """Response returned by the /api/v1/health endpoint."""

    status: str = Field(..., description="Overall health status, e.g. 'healthy'")
    service: str = Field(..., description="Name of the service reporting health")
    version: str = Field(..., description="Deployed application version")
