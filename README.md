# AI-Based Software Risk Assessment Platform

A working implementation of the platform described in the project spec: upload a
software repository (as a .zip), run static/AST code analysis, dependency
analysis, and complexity metrics, get an ML-predicted risk category and score,
explore findings on a dashboard, and download a PDF report.

```
software-risk-platform/
├── backend/            FastAPI + SQLite + scikit-learn analysis engine
├── frontend/            React + TypeScript + Tailwind dashboard
└── sample-project/      A small deliberately-vulnerable project to test with
```

## What's implemented

- **Auth** — register/login with salted PBKDF2 password hashing and bearer tokens (roles: ADMIN/ANALYST/DEVELOPER)
- **Project upload** — .zip upload, extracted server-side with zip-slip protection
- **Regex-based code scanner** — hardcoded credentials, SQL/command injection, eval/exec, unsafe deserialization, path traversal, weak crypto, insecure random, debug mode
- **AST-based Python analyzer** — structurally verifies SQL-injection patterns and dynamic-execution-of-non-literal calls (fewer false positives than regex alone)
- **Dependency analyzer** — parses `requirements.txt` / `package.json`, flags unpinned versions and known-risk packages (small offline reference table — see note below)
- **Complexity/metrics analyzer** — LOC, function/class counts, cyclomatic-complexity approximation (uses `radon` if installed, otherwise a built-in heuristic)
- **ML risk model** — RandomForest classifier (scikit-learn), trained automatically on first run against a synthetic dataset, with a transparent weighted rule-based 0-100 risk score kept separate from the ML category (see note below)
- **Template-based explanation layer** — human-readable summary of why a project got its risk rating
- **Dashboard** — risk score, severity breakdown chart, component breakdown, file-level risk, dependency list
- **Finding Explorer** — expandable findings list with description + recommendation, filterable by severity
- **PDF report generation**

## Honesty notes (read before presenting this as a finished product)

- The **dependency risk table** is a small hardcoded list of ~14 packages for demo purposes, not a live vulnerability feed. For real use, wire `dependency_analyzer.py` up to the [OSV API](https://osv.dev) or the GitHub Advisory Database.
- The **ML model's training data is synthetic**, generated from the same rule-based formula used for the dashboard score (with noise added). This is a reasonable stand-in for a minor/academic project, but the classifier is not learning from real, independently-labeled vulnerable-vs-safe projects. If your report needs to claim real predictive validity, you'll need a labeled dataset built from actual CVE-linked repositories.
- Static analysis **produces false positives** — that's expected and mentioned in the UI; the platform surfaces candidates for a human to triage, not verified vulnerabilities.

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm

## Environment Setup

Optional environment files are provided with safe defaults:
- Backend: `backend/.env.example` (configurable `PORT`, `HOST`, `DATABASE_URL`, `CORS_ORIGINS`, `DATA_DIR`)
- Frontend: `frontend/.env.example` (configurable `VITE_API_URL`)

To customize, copy `.env.example` to `.env` in `backend/` or `frontend/`.

## 1. Run the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

The API starts at **http://localhost:8000** (interactive docs at `/docs`, health check at `/health`).
A SQLite database and the trained ML model are created automatically under `backend/data/` on first run.

## 2. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api/*` to the backend on port 8000 (see `frontend/vite.config.ts`), so no CORS config is needed in dev.

## 3. Run tests

### Backend tests (pytest)

```bash
cd backend
source venv/bin/activate
pytest -v
```

This runs unit and integration tests covering authentication, regex and AST analysis, dependency analysis, code metrics, ML risk scoring, safe zip extraction (including zip-slip prevention), and end-to-end sample project scanning and PDF generation.

### Frontend typecheck and build

```bash
cd frontend
npm run build
```

## 4. Try it out

1. Register an account (any email/password, pick a role).
2. On the Upload page, zip the included `sample-project/` folder and upload it:
   ```bash
   cd sample-project
   zip -r ../ai-chatbot-sample.zip .
   ```
   (or zip any repo of your own — Python projects get the most complete analysis, since the AST analyzer and radon-based complexity are Python-specific; other languages still get regex scanning, LOC/complexity heuristics, and dependency analysis where applicable).
3. Analysis runs automatically after upload and you're taken to the dashboard.
4. Explore the Finding Explorer, File Risk view, and download the PDF report.

The sample project is intentionally vulnerable (hardcoded secrets, SQL injection via string concatenation and f-strings, `os.system()` with unsanitized input, `eval()` on user input, unsafe `pickle.loads`, weak MD5 hashing, `debug=True`) so you should see a MEDIUM–HIGH risk result with ~15-19 findings across `src/app.py`, `src/database.py`, `src/auth.py`, and `src/config.py`.

## Extending it further (per the original spec)

- Swap SQLite → PostgreSQL (`backend/app/database.py`) for a multi-user deployment
- Add Git repository URL upload (currently .zip only)
- Wire the dependency analyzer to a live vulnerability database (OSV/GitHub Advisories)
- Add `radon` to `requirements.txt` for more accurate Python complexity numbers
- Swap the template-based explanation layer for an LLM call for richer narrative explanations
- Add Docker Compose for one-command startup
