# Roadmap

This project is being built incrementally, phase by phase, so that each
phase is a stable foundation for the next without major restructuring.

**Phase 1 — Project Foundation** *(current phase)*
Clean, scalable project scaffolding: FastAPI backend, React + TypeScript
frontend, PostgreSQL configuration, Docker development environment,
health endpoints, logging, error handling, testing foundation, and
documentation. No ML functionality yet.

**Phase 2 — Dataset & Data Collection**
Acquire and catalog historical defect datasets and source repositories
to train and evaluate future models.

**Phase 3 — Code & Git Feature Extraction**
Extract source-code metrics (complexity, size, coupling) and Git-history
signals (churn, commit frequency, authorship) from repositories.

**Phase 4 — Data Processing & Feature Engineering**
Clean, transform, and engineer features from raw code/Git data into
ML-ready datasets.

**Phase 5 — ML Model Development**
Train and iterate on defect-prediction models using the engineered
features.

**Phase 6 — Model Evaluation & Explainable AI**
Evaluate model performance rigorously and add explainability (e.g.
SHAP) so predictions are interpretable.

**Phase 7 — Repository Analyzer**
Build the service that ingests a full repository and runs the code
analyzer end-to-end, including sandboxed execution for untrusted code.

**Phase 8 — Backend API**
Expose prediction, risk-scoring, and analysis results through
production-ready, versioned API endpoints.

**Phase 9 — Frontend Dashboard**
Replace placeholder pages with real developer-facing dashboards, risk
visualizations, and historical analytics.

**Phase 10 — GitHub & CI/CD Integration**
Connect to GitHub repositories, analyze pull requests for risk, and
integrate with CI/CD pipelines.

**Phase 11 — Advanced Intelligence**
Test-priority recommendations, trend analysis, and other advanced
intelligence features built on top of the core prediction engine.

**Phase 12 — Testing, Security & Deployment**
Hardened testing, security review, and production deployment
configuration.
