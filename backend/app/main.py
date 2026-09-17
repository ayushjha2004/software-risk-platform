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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this for a real deployment
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
