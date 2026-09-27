# Performance Notes

## Scenario

10,000 fictional employees and 34,098 salary records produced by the deterministic seed
(`python -m scripts.seed`). Each figure is the median of 7 requests after one warm-up
request, through the FastAPI test client on an Apple Silicon laptop (2026-09-27).
PostgreSQL 14 ran locally; production uses PostgreSQL.

| Operation | SQLite (ms) | PostgreSQL (ms) |
|---|---:|---:|
| Directory, first page (25 rows) | 3.5 | 3.9 |
| Directory, search + country + department | 4.0 | 4.0 |
| Directory, page 300 sorted by hire date | 10.7 | 4.8 |
| Employee profile with salary history | 1.0 | 1.3 |
| Analytics summary, whole active workforce | 395 | 186 |
| Analytics summary, US Engineering only | 52 | 67 |

These are local measurements, not a production SLA.

## What changed after measuring

The first implementation picked each employee's current salary with a
`ROW_NUMBER() OVER (PARTITION BY employee_id ...)` window. Profiling showed it ranked
**every** salary record before any employee filter applied and was re-evaluated by each
of the ~11 statements in the summary:

| Current-salary strategy | Whole workforce (SQLite) | US Engineering (SQLite) | Whole workforce (PostgreSQL) |
|---|---:|---:|---:|
| `ROW_NUMBER()` window | 832 ms | 735 ms | 227 ms |
| `NOT EXISTS` anti-join on `(employee_id, effective_from, created_at)` | 395 ms | 52 ms | 186 ms |

The anti-join lets filters prune employees first and walks the composite index, so
filtered views — the common case for HR questions — became ~14× faster.

## Design choices

- The directory is server-paginated (max 100 rows per page) with an allowlisted sort;
  the browser never receives all 10,000 employees.
- Every analytic (headcount, payroll, average, median, bands, top/bottom 5, recent
  changes) is computed in SQL; only grouped results cross the network.
- Medians use portable window functions (`ROW_NUMBER` + `COUNT` per group) rather than
  PostgreSQL-only `percentile_cont`, so SQLite and PostgreSQL return identical results.
  The test suite runs on both engines in CI.
- Salary amounts are `BIGINT` minor units: an annualized INR salary in paise can exceed
  the 32-bit `INTEGER` range on PostgreSQL.

## Next steps if the dataset grew 10–100×

1. Cache the summary per filter combination and invalidate on salary writes (writes are rare).
2. Maintain a `current_salary` projection table updated on insert, trading write cost for
   O(employees) reads.
3. Replace `LIKE '%term%'` search with PostgreSQL trigram (`pg_trgm`) indexes.
4. Switch deep directory pagination to keyset (cursor) pagination.

## Reproduce

From `backend/`:

```bash
.venv/bin/python -m scripts.measure_performance                       # temporary SQLite file
.venv/bin/python -m scripts.measure_performance --database-url postgresql+psycopg://...
```

The script migrates the target database, seeds it with `--reset` semantics and prints the table.
