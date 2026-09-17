import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from . import models  # noqa: F401 (ensures models are registered before create_all)
from .routers import auth_router, projects_router, analysis_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-Based Software Risk Assessment Platform",
    description="Uploads a software project, runs static/dependency/complexity analysis, "
                "predicts risk with ML, and serves dashboard data + PDF reports.",
    version="1.0.0",
)

cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(projects_router.router)
app.include_router(analysis_router.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "software-risk-assessment-platform"}


@app.get("/health")
def health():
    return {"status": "healthy"}
