# Demo

**Recorded walkthrough:** [`docs/demo/salary-manager-walkthrough.mp4`](demo/salary-manager-walkthrough.mp4)
(≈50 s, captioned, 1440×900). It is generated from code, so it can be re-recorded at any time:

```bash
cd frontend && npm run build && npm run demo:record
# video: frontend/test-results/demo-*/video.webm
```

## Voice-over script (3–4 minutes)

Use this when recording a narrated version against a local or deployed instance.

1. **Problem (20 s)**: "ACME's HR team manages pay for 10,000 people in five countries in
   spreadsheets: slow to search, easy to overwrite, hard to analyse. This replaces that."
2. **Dashboard (60 s)**: Headcount and one card per currency: payroll, median, average.
   Point out the note: *amounts are annualized and never summed across currencies*.
   Switch the detail currency (INR → USD): pay by department, salary distribution with
   bands sized for that currency, highest/lowest paid, pay by country, recent changes.
   Filter to India / Engineering; mention every number is computed in SQL (~70 ms on PostgreSQL).
3. **Directory (40 s)**: Search a name, filter by department and status, sort by hire date,
   page through results. Copy the URL: filters live in it, so views are shareable.
4. **Profile & raise (60 s)**: Open an employee: current salary and full history with change %.
   Record a promotion: type an amount (show the preview and % change), try an invalid
   value or a date before hire to show validation, then save. The new record appears on
   top as *Current*; older records are untouched (append-only audit trail).
5. **Add a new hire (20 s)**: Employee details plus starting salary, created atomically.
6. **Back to the dashboard (15 s)**: The raise appears under recent salary changes.
7. **Engineering close (30 s)**: Tests on SQLite and PostgreSQL, E2E on a seeded
   10k-employee database, one container, and the decisions/AI-usage docs in the repo.
