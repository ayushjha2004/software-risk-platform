# Development Guide

## Prerequisites

- Python 3.11+
- Node.js 20+ and npm
- PostgreSQL 16 (or Docker, which provisions it for you)
- Docker & Docker Compose (optional, for containerized development)
- Git

## Local Setup (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then edit .env as needed
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`, with interactive
docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env            # then edit .env as needed
npm run dev
```

The app will be available at `http://localhost:5173`.

## Local Setup (with Docker)

```bash
cp .env.example .env            # root-level, used by docker-compose.yml
docker compose up --build
```

This starts PostgreSQL, the backend, and the frontend together on a
shared Docker network.

## Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm run test
```

Or, from the project root, once dependencies are installed:

```bash
make test
```

## Linting & Formatting

```bash
make lint      # ruff (backend) + eslint (frontend)
make format    # black (backend) + prettier (frontend)
```

## Database Migrations (Alembic)

Alembic is configured but no business tables exist yet in Phase 1.
Once models are added in a later phase:

```bash
cd backend
alembic revision --autogenerate -m "add <table> table"
alembic upgrade head
```

## Environment Variables

Never commit a real `.env` file. Each of `backend/`, `frontend/`, and
the project root ships a `.env.example` documenting the variables it
needs; copy it to `.env` locally.

## Project Conventions

- Backend route handlers stay thin; business logic lives in
  `app/services/`.
- No fake ML predictions or fabricated data — use honest empty states.
- No secrets in source control.
- Keep functions small, focused, and readable over clever.
