"""
Application entrypoint.

This module is responsible ONLY for:
    1. Creating the FastAPI application instance
    2. Configuring middleware (CORS)
    3. Registering exception handlers
    4. Registering routers
    5. Wiring startup/shutdown logging

All business logic, route implementations, and configuration details
live in their own modules (app.core, app.api, app.services, ...).
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.schemas.health import RootResponse
from app.services import health_service

configure_logging()
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Application factory: builds and returns a configured FastAPI app."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "AI-Powered Software Defect Prediction and Intelligent Code "
            "Risk Analysis Platform -- backend API. Phase 1 provides the "
            "project foundation; machine-learning functionality is "
            "implemented in later phases."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    app.include_router(api_router, prefix=settings.API_PREFIX)

    @app.get("/", response_model=RootResponse, tags=["Root"])
    async def root() -> RootResponse:
        return health_service.get_root_status()

    @app.on_event("startup")
    async def on_startup() -> None:
        logger.info(
            "Starting %s v%s in %s mode",
            settings.APP_NAME,
            settings.APP_VERSION,
            settings.ENVIRONMENT,
        )

    @app.on_event("shutdown")
    async def on_shutdown() -> None:
        logger.info("Shutting down %s", settings.APP_NAME)

    return app


app = create_app()
