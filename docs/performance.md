# Performance Notes

## Scenario

The backend was seeded with 10,000 fictional employees and 20,021 salary records using the deterministic seed command. Measurements were run locally against SQLite through the FastAPI test client on 2026-09-26.

## Observed timings

| Operation | Observed time |
|---|---:|
| Employee directory, first 25-person page | 8.9 ms |
| Filtered directory search | 5.0 ms |
| Active-workforce analytics summary | 476.7 ms |
| Analytics filtered to US Engineering | 378.3 ms |

These are local development measurements, not a production latency guarantee. Deployment verification will repeat the core checks against PostgreSQL.

## Design choices

- Directory results are server-paginated and capped at 100 records per response.
- Reporting uses SQL aggregation and window functions; the browser receives grouped results rather than raw compensation rows.
- Current compensation is selected by `employee_id`, effective date, and creation-date ordering.
- Indexes support employee lookup/filtering and salary-record currency, creation time, and current-compensation access patterns.
- Monetary aggregates are annualized where necessary, then grouped by currency. No cross-currency totals are computed.

## Reproduce

From `backend/` after installing dependencies:

```bash
.venv/bin/python -m scripts.measure_performance
```

The script creates and removes a temporary local SQLite database named `acme_salary_manager.perf.db`.
