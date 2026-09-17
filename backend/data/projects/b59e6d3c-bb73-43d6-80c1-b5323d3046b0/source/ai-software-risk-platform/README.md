# AI-Powered Software Defect Prediction and Intelligent Code Risk Analysis Platform

> **Phase 1 currently provides the project foundation. Machine-learning
> functionality will be implemented in later phases.**

## Project Description

This platform is being built to analyze software repositories,
source-code metrics, Git history, and historical defect data in order
to predict which files and modules are likely to contain defects --
helping engineering teams prioritize code review, testing, and
refactoring effort before bugs reach production.

## Problem Statement

Software defects are expensive to find late and cheap to find early.
Most teams have no systematic, data-driven way to know *which* files
or modules in a large codebase are most likely to introduce bugs, or
which pull requests carry the most risk. This project aims to close
that gap with an explainable, ML-driven risk-analysis platform that
integrates directly into a team's existing Git and CI/CD workflow.

## Project Objectives

The completed system will eventually provide:

1. Software defect prediction
2. Source-code quality analysis
3. Git-history analysis
4. File/module risk scoring
5. Explainable AI (e.g. SHAP-based explanations)
6. GitHub repository analysis
7. Pull-request risk analysis
8. CI/CD integration
9. Test-priority recommendations
10. Developer dashboards
11. Historical risk analytics
12. Production deployment

**This repository is currently in Phase 1**, which builds only the
architecture and infrastructure required to support these future
capabilities -- see [`docs/roadmap.md`](docs/roadmap.md) for the full
phase-by-phase plan.

## Technology Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router,
Axios, Recharts

**Backend:** Python 3.11+, FastAPI, Uvicorn, Pydantic, SQLAlchemy,
Alembic

**Database:** PostgreSQL

**Development:** Git, GitHub, Docker, Docker Compose

**Testing:** Pytest (backend), Vitest + React Testing Library
(frontend)

**Code quality:** Ruff, Black (backend); ESLint, Prettier (frontend)

**API documentation:** FastAPI OpenAPI / Swagger

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full
current and planned architecture. In short:

```
Frontend (React) → FastAPI → Services → Database / Future ML services
```

## Folder Structure

```
ai-software-risk-platform/
├── backend/              FastAPI application (app/, tests/, Alembic)
├── frontend/              React + TypeScript application (src/, tests/)
├── ml/                    Reserved for future ML pipelines
├── code_analyzer/         Reserved for future source/Git analysis engine
├── github_integration/    Reserved for future GitHub/CI-CD integration
├── data/                  Reserved for future dataset storage
├── docs/                  Architecture, development, and roadmap docs
├── scripts/               Reserved for future helper scripts
├── docker/                Docker-related assets (e.g. Postgres init)
├── tests/                 Reserved for future cross-cutting/E2E tests
├── docker-compose.yml     Local multi-service orchestration
├── Makefile               Common developer commands
└── README.md
```

## Prerequisites

- Python 3.11+
- Node.js 20+ and npm
- PostgreSQL 16 (not required if using Docker)
- Docker & Docker Compose (optional but recommended)
- Git

## Local Installation

```bash
git clone <this-repository-url>
cd ai-software-risk-platform
```

## Environment Configuration

Copy each `.env.example` to `.env` and adjust values as needed. Real
`.env` files are never committed (see `.gitignore`).

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp .env.example .env        # only needed if you use Docker Compose
```

## Running the Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend: <http://localhost:8000>

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: <http://localhost:5173>

## Running with Docker

```bash
cp .env.example .env
docker compose up --build
```

This starts PostgreSQL, the backend, and the frontend together.

## Running Tests

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm run test

# Or, from the project root
make test
```

## API Documentation

Once the backend is running:

- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- Health check: <http://localhost:8000/api/v1/health>

## Development Roadmap

See [`docs/roadmap.md`](docs/roadmap.md) for the complete 12-phase
roadmap, from this project foundation through ML model development,
explainable AI, GitHub/CI-CD integration, and production deployment.

## What's Intentionally Not in Phase 1

- No ML model training, inference, or predictions (real or fake)
- No dataset (invented or otherwise)
- No GitHub repository analysis
- No SHAP / explainability
- No CI/CD integration
- No business database tables (schema arrives with the features that
  need it, via Alembic migrations)

These are all covered by later phases in the roadmap.
