.PHONY: install dev dev-backend dev-frontend test test-backend test-frontend \
        lint lint-backend lint-frontend format format-backend format-frontend \
        docker-up docker-down clean

BACKEND_DIR := backend
FRONTEND_DIR := frontend
VENV := $(BACKEND_DIR)/.venv

## install: Install backend (venv) and frontend dependencies
install:
	python3 -m venv $(VENV)
	$(VENV)/bin/pip install --upgrade pip
	$(VENV)/bin/pip install -r $(BACKEND_DIR)/requirements.txt
	cd $(FRONTEND_DIR) && npm install

## dev: Run backend and frontend dev servers together
dev:
	$(MAKE) -j 2 dev-backend dev-frontend

dev-backend:
	cd $(BACKEND_DIR) && ../$(VENV)/bin/uvicorn app.main:app --reload

dev-frontend:
	cd $(FRONTEND_DIR) && npm run dev

## test: Run backend and frontend test suites
test: test-backend test-frontend

test-backend:
	cd $(BACKEND_DIR) && ./.venv/bin/pytest

test-frontend:
	cd $(FRONTEND_DIR) && npm run test

## lint: Lint backend and frontend code
lint: lint-backend lint-frontend

lint-backend:
	cd $(BACKEND_DIR) && ./.venv/bin/ruff check .

lint-frontend:
	cd $(FRONTEND_DIR) && npm run lint

## format: Format backend and frontend code
format: format-backend format-frontend

format-backend:
	cd $(BACKEND_DIR) && ./.venv/bin/black .

format-frontend:
	cd $(FRONTEND_DIR) && npm run format

## docker-up: Build and start all services via Docker Compose
docker-up:
	docker compose up --build

## docker-down: Stop and remove Docker Compose services
docker-down:
	docker compose down

## clean: Remove build artifacts, caches, and virtual environments
clean:
	rm -rf $(VENV)
	rm -rf $(BACKEND_DIR)/.pytest_cache $(BACKEND_DIR)/.ruff_cache
	find $(BACKEND_DIR) -name "__pycache__" -type d -exec rm -rf {} +
	rm -rf $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/dist $(FRONTEND_DIR)/coverage
