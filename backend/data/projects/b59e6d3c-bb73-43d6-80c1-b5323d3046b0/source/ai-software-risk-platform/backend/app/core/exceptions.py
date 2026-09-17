"""
Centralized exception handling.

Defines application-specific exceptions and FastAPI exception handlers
that translate them (and unexpected errors) into consistent, safe JSON
error responses. Internal details are never leaked to the client.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Base class for application-specific, expected errors."""

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppException):
    """Raised when a requested resource does not exist."""

    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)


class ServiceUnavailableError(AppException):
    """Raised when a downstream dependency (e.g. the database) is unavailable."""

    def __init__(self, message: str = "Service temporarily unavailable") -> None:
        super().__init__(message, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)


def _error_payload(message: str, status_code: int) -> dict:
    return {
        "error": True,
        "status_code": status_code,
        "message": message,
    }


def register_exception_handlers(app: FastAPI) -> None:
    """Attach centralized exception handlers to the FastAPI application."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        logger.warning("Handled application exception: %s", exc.message)
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(exc.message, exc.status_code),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        logger.info("Request validation failed for %s", request.url.path)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_payload("Invalid request data", status.HTTP_422_UNPROCESSABLE_ENTITY),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        # Log the full exception server-side, but never expose internal
        # details (stack traces, secrets, file paths) to the client.
        logger.exception("Unhandled exception while processing %s", request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_payload(
                "An unexpected error occurred", status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
        )
