# ACME Salary Manager

A Python and React application for managing employee salary history and understanding compensation across a 10,000-person organization.

## Product framing

The approved product scope, architecture, engineering trade-offs, and AI-assisted development record are available in:

- [Product requirements](requirements/product-requirements.md)
- [Architecture](docs/architecture.md)
- [Engineering decisions](docs/decisions.md)
- [AI usage record](docs/ai-usage.md)

## Backend setup

From the repository root, create an isolated environment and install the API with its test tools:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -e 'backend[dev]'
cd backend
```

Create the database schema and seed it with deterministic fictional data:

```bash
.venv/bin/alembic upgrade head
.venv/bin/python -m scripts.seed --employee-count 10000
```

Run the API locally at `http://127.0.0.1:8000`; interactive OpenAPI documentation is at `/docs`.

```bash
.venv/bin/uvicorn app.main:app --reload
```

Run the backend quality checks:

```bash
.venv/bin/python -m ruff check .
.venv/bin/python -m pytest
```

The frontend, containers, CI, deployment instructions, and demo video will be added in later phases.
