# ACME Salary Manager

A web application that replaces ACME's salary spreadsheets: HR can find any of 10,000
employees, keep a trustworthy salary history, record changes safely, and answer "how do we
pay people?" with per-currency analytics.

**Demo video:** [docs/demo/salary-manager-walkthrough.mp4](docs/demo/salary-manager-walkthrough.mp4)
· **Requirements:** [one-page PRD](requirements/product-requirements.md)

| Dashboard | Profile & salary change |
|---|---|
| Headcount, payroll, median and average **per currency**; pay by department, salary distribution, top/bottom earners, pay by country, recent changes — filterable by country, department and status | Current pay, append-only history with change %, scheduled raises, validated salary changes with a before/after preview |

## What's in V1

- **Directory** — server-side search (name, email, employee number), filters, sorting and
  pagination over 10,000 employees; filters live in the URL.
- **Profile** — current salary (annualized) and full salary history; history is never
  overwritten, corrections are new records.
- **Salary changes** — amount, currency, pay frequency, effective date (up to a year ahead),
  reason; validated in the browser and again by the API.
- **New hires** — employee and starting salary created in one atomic request.
- **Analytics** — computed in SQL for the current filters; money is never summed across
  currencies.

Deliberately out of scope (payroll, tax, benefits, FX conversion, bulk import, approvals,
SSO/RBAC, AI chat) — reasons in the [requirements](requirements/product-requirements.md).

## Stack

Python 3.12 · FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL (SQLite locally) ·
React 19 · TypeScript · Vite · MUI 9 · TanStack Query · pytest · Vitest · Playwright ·
Docker · GitHub Actions

## Run it

### Option A — Docker (production-like, PostgreSQL)

```bash
docker compose up --build
```

Open http://localhost:8000. The first boot migrates and seeds 10,000 fictional employees.

### Option B — local development

Prerequisites: Python 3.12+, Node 22+.

```bash
# API
python3 -m venv backend/.venv
backend/.venv/bin/pip install -e 'backend[dev]'
cd backend
.venv/bin/alembic upgrade head
.venv/bin/python -m scripts.seed                # 10,000 employees; add --reset to reseed
.venv/bin/uvicorn app.main:app --reload         # http://127.0.0.1:8000/docs
```

```bash
# UI (second terminal)
cd frontend
npm install
npm run dev                                     # http://localhost:5173, proxies /api to :8000
```

## Tests and quality checks

| Suite | Command | Current result |
|---|---|---|
| Backend lint | `cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check .` | clean |
| Backend tests (SQLite) | `cd backend && .venv/bin/pytest` | 56 tests, 99% coverage |
| Backend tests (PostgreSQL) | `TEST_DATABASE_URL=postgresql+psycopg://… .venv/bin/pytest` | 56 tests |
| Frontend lint + types | `cd frontend && npm run lint && npm run typecheck` | clean |
| Frontend tests | `cd frontend && npm run test:coverage` | 60 tests, 92% lines |
| End-to-end | `cd frontend && npx playwright install chromium && npm run test:e2e` | 4 journeys on a seeded 10k database |
| Performance | `cd backend && .venv/bin/python -m scripts.measure_performance` | see [performance.md](docs/performance.md) |

CI (`.github/workflows/ci.yml`) runs all of the above, the backend suite on both SQLite and
PostgreSQL, an Alembic drift check, and a Docker image build.

## Repository map

```
requirements/product-requirements.md   one-page requirements: goal, scope, exclusions and why
docs/architecture.md                   components, data model, analytics pipeline, test strategy
docs/decisions.md                      ADR-style trade-offs
docs/performance.md                    measured latencies and the optimizations they drove
docs/ai-usage.md                       how AI was used, what it got wrong, how that was caught
docs/deployment.md                     container, configuration, hosting steps
docs/demo-script.md                    demo video + voice-over script
backend/                               FastAPI app, migrations, seed and benchmark scripts, tests
frontend/                              React app, unit/component tests, Playwright E2E + demo
scripts/                               container entrypoint, E2E server
```

## Key decisions (summary)

- **Money** is `BIGINT` minor units + ISO currency; the UI parses input with string
  arithmetic, never floats.
- **Salary is history**, not a column: the current salary is derived by effective date,
  so nothing is ever lost.
- **Per-currency analytics** only — a global total needs an FX policy V1 does not have.
- **Curated analytics over an AI chatbot** — exact, explainable answers for sensitive data.
- **SQL does the work** — the browser never receives 10,000 rows; the analytics summary
  takes ~70 ms on PostgreSQL after measured optimizations.
- **Tested on both databases** — PostgreSQL runs caught bugs SQLite hid.

See [docs/decisions.md](docs/decisions.md) for the full list.

## Deployment

One container serves API + UI; see [docs/deployment.md](docs/deployment.md). A hosted
instance has not been published yet.
