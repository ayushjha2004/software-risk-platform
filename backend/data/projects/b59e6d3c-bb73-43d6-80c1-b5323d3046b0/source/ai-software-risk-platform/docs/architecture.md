# Architecture

## Phase 1 Architecture (Current)

Phase 1 establishes the foundational request/response flow that every
later phase builds on:

```
Frontend (React + TypeScript + Vite)
    ↓  HTTP (Axios)
FastAPI (versioned routes under /api/v1)
    ↓
Services (business logic layer)
    ↓
Database (PostgreSQL, via SQLAlchemy) / Future ML services
```

**Frontend** — A React + TypeScript single-page application. Pages are
placeholders with honest empty states (e.g. "No projects analyzed
yet.") rather than fake data. `src/services/api.ts` wraps Axios and
talks to the backend's `/api/v1` prefix; `src/hooks/useHealthCheck.ts`
surfaces backend connectivity in the UI.

**FastAPI backend** — `app/main.py` only builds the app, configures
CORS, registers exception handlers, and includes routers. Routes
(`app/api/routes/`) stay thin and delegate to the service layer
(`app/services/`), which is where business logic lives. This keeps
route handlers testable and keeps future logic (repository analysis,
risk scoring) out of the HTTP layer.

**Configuration** — `app/core/config.py` defines a single `Settings`
class (Pydantic Settings) that reads from environment variables /
`.env`. No secrets are hard-coded anywhere in the codebase.

**Database** — `app/db/session.py` configures a SQLAlchemy engine and a
`get_db()` FastAPI dependency for request-scoped sessions.
`app/db/base.py` defines a shared `Base` for future ORM models.
Alembic (`backend/alembic/`) is wired to the same `Settings` and
`Base.metadata` so future models are auto-discoverable for migrations.
Phase 1 intentionally defines **no business tables**.

**Logging & error handling** — `app/core/logging.py` configures
consistent, structured logging (startup/shutdown, errors) without ever
logging secrets. `app/core/exceptions.py` registers centralized
exception handlers that return consistent, safe JSON error payloads
and never leak stack traces or internal details to clients.

## Planned Future Architecture

As later phases are implemented, the system will grow into:

```
Repository
    ↓
Code Analyzer          (parses source, computes metrics, extracts Git history)
    ↓
Feature Engineering    (turns raw metrics into ML-ready features)
    ↓
ML Model                (defect prediction / risk scoring)
    ↓
Risk Engine             (aggregates predictions into file/module risk scores,
                          explainability via SHAP)
    ↓
FastAPI                 (exposes predictions, PR risk, test-priority APIs)
    ↓
React Dashboard         (developer-facing risk dashboards & analytics)
```

Supporting subsystems planned for later phases:

- `github_integration/` — GitHub API access, pull-request risk analysis,
  CI/CD integration.
- `code_analyzer/` — source-code parsing, metric extraction (complexity,
  churn, coupling), and Git-history feature extraction. Because this
  will eventually process **untrusted** repositories, it is designed
  from Phase 1 onward to be isolable/sandboxable — no arbitrary
  repository code is executed in this or any current phase.
- `ml/` — dataset storage, feature stores, training pipelines, model
  evaluation, and explainability (SHAP) — all added in later phases.

## Design Principles

- Strict separation between frontend and backend.
- Modular, layered backend (routes → services → data access).
- No business logic in route handlers.
- No secrets committed to source control; all configuration via
  environment variables.
- No fake or fabricated ML predictions — empty/placeholder states are
  used until real functionality exists.
- Architecture is additive: later phases plug into existing seams
  (routers, services, models, Alembic) without requiring a rewrite.
