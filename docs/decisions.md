# Engineering Decisions

Short ADR-style records. Each states the choice, why, and what it costs.

## Product

| # | Decision | Rationale | Consequence |
|---|---|---|---|
| P1 | Curated dashboard instead of a free-form AI chat | Compensation data is sensitive; answers must be exact, explainable and repeatable. A dashboard answers the common questions (headcount, payroll, median/average, distribution, extremes, recent changes) with no hallucination risk | Unanticipated questions need a new view; an NL layer could later sit *on top of* these audited endpoints |
| P2 | Never sum across currencies | A global total needs an FX source, rate date and accounting policy, and none exist in V1 | Dashboard shows one card per currency and charts one currency at a time |
| P3 | Salary history is append-only | HR needs an audit trail; spreadsheets lose it | Corrections are new records (reason `correction`); there is no edit/delete |
| P4 | Allow future-dated salaries, max one year | Raises are often agreed before they take effect | "Current" is date-dependent; history labels scheduled entries |
| P5 | No authentication in V1 | Single HR-admin evaluation flow on fictional data; half-built auth is worse than an explicit gap | Must add SSO/RBAC before real data (see requirements, out of scope) |

## Data & backend

| # | Decision | Rationale | Consequence |
|---|---|---|---|
| D1 | FastAPI + SQLAlchemy 2 + Alembic | Typed validation, generated OpenAPI docs, portable relational model with migration history | Explicit schema/service layering |
| D2 | Money as `BIGINT` minor units + ISO currency | Floats corrupt money; 32-bit ints overflow once INR (paise) salaries are annualized on PostgreSQL | Format at the edges only |
| D3 | SQLite locally, PostgreSQL in production, **tests on both** | Zero-setup review, production-grade deploy. Running the suite on PostgreSQL found three bugs SQLite hid (GROUP BY on a parameterized CASE, true-division rounding in the median, INTEGER overflow risk) | CI matrix; only portable SQL (no `percentile_cont`) |
| D4 | Current salary via indexed `NOT EXISTS` anti-join | Beat `ROW_NUMBER()` 2.5× overall and ~14× for filtered views | Rule duplicated in Python for the profile; both tested |
| D5 | Materialize current salaries into a temp table per analytics request | The summary runs ~11 aggregates over the same set; computing it once cut latency 4.5× (SQLite) / 2.6× (PostgreSQL) | DDL per request; uniquely named, dropped in `finally`, leak-tested |
| D6 | Per-currency "nice" salary bands | Fixed thresholds (e.g. "under 60,000") are meaningless across INR and USD | Band edges differ per currency; returned as numeric bounds, labelled by the UI |
| D7 | App-side microsecond `created_at` | SQLite `CURRENT_TIMESTAMP` has 1 s resolution, making same-day corrections ambiguous (a test caught this) | Tie-break chain: effective date → created_at → id |
| D8 | Create employee + starting salary atomically | Two requests could leave an employee without pay if the second failed | `initial_salary` is optional on `POST /employees` |
| D9 | Validation at both edges | UI gives instant feedback; API remains the authority (ISO codes, reasons enum, dates vs hire date, ≤1 year ahead, positive integer amounts) | Rules mirrored in `salaryForm.ts` and `schemas/employees.py` |

## Seed data

| # | Decision | Rationale | Consequence |
|---|---|---|---|
| S1 | Fully deterministic (fixed seed, reference date, seeded UUIDs) | Reproducible demos, tests and screenshots | Data doesn't "age" with the calendar |
| S2 | Pay derived backwards from a level-appropriate current salary | Forward-compounding raises produced $800k associates; HR analytics need plausible distributions | Realistic bands per country/level/department |
| S3 | Seed refuses to overwrite data unless `--reset`; `--if-empty` for first boot | A mistyped `DATABASE_URL` must not wipe a real database | Container can safely seed on every start |

## Frontend & delivery

| # | Decision | Rationale | Consequence |
|---|---|---|---|
| F1 | React + TypeScript + Vite + MUI | Required stack; MUI gives accessible tables, dialogs and form controls quickly | Larger vendor chunk, mitigated by route-level code splitting |
| F2 | TanStack Query for server state | Caching, background refresh, precise invalidation after writes | No global client store needed |
| F3 | Filters and view state in the URL | Shareable/bookmarkable views, back button works | Parsing layer with defensive defaults (tested) |
| F4 | One container serving API + UI | Single URL, no CORS, simplest operations | UI deploys with the API |
| F5 | Playwright demo project records the walkthrough | The demo video is reproducible from code | Silent, captioned video; voice-over script in `demo-script.md` |
