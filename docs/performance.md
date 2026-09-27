# Performance Notes

## Scenario

10,000 fictional employees and 57,139 salary records (a review every one to two years
since hire) produced by the deterministic seed (`python -m scripts.seed`). Each figure is
the median of 7 requests after one warm-up request, through the FastAPI test client on
an Apple Silicon laptop (2026-09-27). PostgreSQL 14 ran locally; production uses PostgreSQL.

| Operation | SQLite (ms) | PostgreSQL (ms) |
|---|---:|---:|
| Directory, first page (25 rows) | 3.7 | 8.1 |
| Directory, search + country + department | 4.3 | 4.2 |
| Directory, page 300 sorted by hire date | 10.4 | 8.7 |
| Employee profile with salary history | 1.0 | 1.3 |
| Analytics summary, whole active workforce | 146 | 68 |
| Analytics summary, US Engineering only | 20 | 21 |

These are local measurements, not a production SLA.

## How analytics got faster (measure → change → re-measure)

The analytics summary answers ~11 questions (headcount, payroll, averages, medians per
currency/country/department, bands, top/bottom 5) over one set: *each employee's salary
in effect today*. Picking that salary is the expensive part.

| Step | Whole workforce SQLite | US Engineering SQLite | Whole workforce PostgreSQL |
|---|---:|---:|---:|
| 1. `ROW_NUMBER() OVER (PARTITION BY employee_id …)` subquery, re-run by every statement *(34k records)* | 832 | 735 | 227 |
| 2. `NOT EXISTS` anti-join on `(employee_id, effective_from, created_at)` *(34k records)* | 395 | 52 | 186 |
| 2′. Same, after making seed histories realistic *(57k records)* | 653 | 74 | 175 |
| 3. Materialize the current-salary set once per request into a temporary table | **146** | **20** | **68** |

- Step 1 ranked every salary record before filters applied, for every statement.
- Step 2 lets employee filters prune first and walks the composite index.
- Step 3 evaluates that set once (`CREATE TEMPORARY TABLE … AS SELECT`, connection-scoped,
  uniquely named, dropped in `finally`) and runs all aggregates over it. A test asserts
  no temporary tables leak.

## Design choices

- The directory is server-paginated (max 100 rows per page) with an allowlisted sort;
  the browser never receives all 10,000 employees.
- Every analytic is computed in SQL; only grouped results cross the network.
- Medians use portable window functions (`ROW_NUMBER` + `COUNT` per group) rather than
  PostgreSQL-only `percentile_cont`, so SQLite and PostgreSQL return identical results.
  The test suite runs on both engines in CI.
- Salary amounts are `BIGINT` minor units: an annualized INR salary in paise can exceed
  the 32-bit `INTEGER` range on PostgreSQL.
- The frontend lazy-loads routes, so the charting library is only downloaded with the dashboard.

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

The script migrates the target database, reseeds it and prints the table.
