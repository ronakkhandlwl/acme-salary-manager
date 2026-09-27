# Deployment

The repository ships one Docker image (`Dockerfile`) that builds the UI and serves it from
the API. On start the container runs `scripts/docker-entrypoint.sh`:

1. `alembic upgrade head`
2. `python -m scripts.seed --if-empty`: seeds 10,000 fictional employees on first boot only
3. `uvicorn` on `$PORT` (default 8000) with proxy headers enabled

## Configuration

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes (production) | SQLite file | `postgres://…`, `postgresql://…` or `postgresql+psycopg://…`; provider-style URLs are normalized |
| `PORT` | no | `8000` | Port the server binds (set by most PaaS providers) |
| `SEED_ON_START` | no | `true` | Set `false` to never seed automatically |
| `SEED_EMPLOYEE_COUNT` | no | `10000` | Size of the first-boot dataset |
| `CORS_ORIGINS` | no | localhost dev ports | Only needed if the UI is hosted on another origin |

Health check: `GET /health` → `{"status": "ok"}`. API docs: `/docs`.

## Local production-like stack

```bash
docker compose up --build
# http://localhost:8000
```

## Render (free, one click)

`render.yaml` defines a free Docker web service. In the Render dashboard: New → Blueprint →
select this repository → Deploy Blueprint. Add a `DATABASE_URL` environment variable (for
example a free Neon PostgreSQL database) if data should survive restarts.

## Any container platform (Railway, Render, Fly.io, Cloud Run, …)

1. Create a PostgreSQL database and copy its connection URL.
2. Create a service from this repository using the root `Dockerfile`.
3. Set `DATABASE_URL`; the platform supplies `PORT`.
4. Deploy, then open the service URL. First boot takes ~20 s while data is seeded.

Example with the Railway CLI (not yet run; flags vary by CLI version, see `railway --help`):

```bash
railway init --name acme-salary-manager
railway add --database postgres
railway add --service app --variables 'DATABASE_URL=${{Postgres.DATABASE_URL}}'
railway up --service app
railway domain --service app
```

## Verification status

- The image layout (`pip install .`, migrations, first-boot seed, UI + API served on
  `$PORT`, idempotent restart) was exercised locally against PostgreSQL by running the
  entrypoint in an equivalent Python 3.12 environment. CI builds the image on every push.
- Live demo: https://acme-salary-manager-qwpj.onrender.com, deployed from `render.yaml` (Render free web service,
  Docker runtime). It runs without `DATABASE_URL`, so it uses SQLite in the container and
  reseeds 10,000 fictional employees whenever the instance restarts; edits are temporary by
  design. Free instances sleep after ~15 minutes idle and take up to a minute to wake.
- Verified after deploy: all 4 Playwright E2E journeys pass against the live URL
  (`E2E_BASE_URL=<url> npm run test:e2e`). The analytics summary takes ~3 s there versus
  ~0.15 s locally, because the free instance has only a fraction of a CPU.

## Resetting demo data

```bash
python -m scripts.seed --reset   # inside the container / with DATABASE_URL set
```

## Before handling real salary data

Add authentication (SSO) and role-based access, TLS-only access, audit logging of who
changed what, backups with point-in-time recovery, and rate limiting, all deliberately out of
scope for this V1 (see [requirements](../requirements/product-requirements.md)).
