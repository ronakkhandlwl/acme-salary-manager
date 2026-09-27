#!/usr/bin/env bash
# Start the API + built UI on a freshly migrated and seeded SQLite database.
# Used by Playwright (frontend/playwright.config.ts); safe to run by hand.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${E2E_PORT:-8020}"
PYTHON="${PYTHON:-$ROOT/backend/.venv/bin/python}"
DB_FILE="$ROOT/backend/e2e.db"

export DATABASE_URL="sqlite:///$DB_FILE"
export FRONTEND_DIST_DIR="$ROOT/frontend/dist"

cd "$ROOT/backend"
rm -f "$DB_FILE"
"$PYTHON" -m alembic upgrade head
"$PYTHON" -m scripts.seed --employee-count 10000
exec "$PYTHON" -m uvicorn app.main:app --host 127.0.0.1 --port "$PORT"
