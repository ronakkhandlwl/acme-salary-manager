#!/bin/sh
# Container start: apply migrations, seed fictional data on first boot, serve.
set -eu

python -m alembic upgrade head

if [ "${SEED_ON_START:-true}" = "true" ]; then
  python -m scripts.seed --if-empty --employee-count "${SEED_EMPLOYEE_COUNT:-10000}"
fi

exec python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --proxy-headers \
  --forwarded-allow-ips "*"
