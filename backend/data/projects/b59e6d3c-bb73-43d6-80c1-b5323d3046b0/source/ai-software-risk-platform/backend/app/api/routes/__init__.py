"""
Aggregates all versioned route modules into a single API router.

Future phases will register additional routers here (projects,
repositories, risk-analysis, etc.) without touching main.py.
"""

from fastapi import APIRouter

from app.api.routes import health

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
