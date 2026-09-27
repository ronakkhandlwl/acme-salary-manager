# AI-Assisted Development Record

Built with **Claude Code** (agentic CLI, Claude Opus models) driving the terminal, editor,
a local PostgreSQL instance and a browser. AI wrote most first drafts; every change was
checked by running something — tests on two databases, a benchmark, the real UI, or an
end-to-end run — before it was committed.

## How the work was driven

| Phase | Prompt / instruction given to the agent (abridged) | Human-owned decisions & checks |
|---|---|---|
| Framing | The assessment brief, plus: *"Propose an approach: stack, scope, phases, risks, commit plan. Ask before building."* | Chose curated analytics over an AI chat, per-currency reporting, append-only salaries; approved the one-page requirements |
| Backend foundation | *"Implement phase 2–3 of the plan with tests first: models, migrations, directory/profile APIs, deterministic seed, analytics endpoints."* | Reviewed money/date rules and API contracts |
| Review & completion | *"Review everything, see what's done, whether we are on the right path, and complete the assignment end to end, closely following the requirements."* | Answered the two outward-facing questions (public repo: yes; hosted deploy: not now) |

Standing instructions (user's global rules): small reviewed commits in conventional-commit
format, TDD for new behaviour, ≥80% coverage, validate input at boundaries, no secrets in
code, never commit real personal data.

## Where AI output was wrong — and how it was caught

Verification found real defects in AI-generated code. Listing them is the point of this record.

| Defect | How it was caught | Fix |
|---|---|---|
| Analytics crashed on PostgreSQL: `GROUP BY` on a re-rendered parameterized `CASE` | Ran the SQLite-green suite against a local PostgreSQL | Group on a derived-table column; CI now tests both engines |
| Median used `/` (true division in SQLAlchemy 2), so PostgreSQL rounded `2.5 → 3` and picked the wrong middle row | Code review while fixing the above, confirmed by the PostgreSQL run | Integer `//` division |
| `INTEGER` money column could overflow for annualized INR amounts on PostgreSQL | Review of value ranges | `BIGINT` migration |
| ORM models drifted from migrations (nullability, unique index vs constraint) | `alembic check` | Migration + model alignment; drift check in CI |
| Same-day salary corrections picked a random winner: SQLite timestamps have 1 s resolution | A new test failed intermittently | App-side microsecond `created_at` + id tie-break |
| Two-request "create employee, then salary" could leave an employee without pay | Design review of the UI flow | Atomic `initial_salary` on create |
| Seed produced unrealistic pay (fixed 45k–180k for INR and USD; later $800k associates from compounding raises; pay frozen after four records) | Looking at the dashboard in a browser, then inspecting band counts | Currency/level-based pay derived backwards from today's salary |
| `nice_step` band-width helper returned a step smaller than required | Self-review before running tests | Corrected magnitude loop, parametrized unit tests |
| Several test expectations had wrong arithmetic (e.g. ₹3M written as ₹30M) and two async races | Tests failed; each failure was read, not silenced | Fixed the expectation or awaited the right state — implementation was not bent to fit a wrong test |

## Guardrails followed

- Only fictional, generated data in prompts, fixtures, screenshots and the seed.
- No AI change merged without an executed check appropriate to its risk; SQL changes were
  checked on both databases and re-benchmarked ([performance.md](performance.md)).
- Library APIs newer than the model's training (MUI 9, React Router 8, MUI X Charts 9,
  SQLAlchemy 2.1) were checked against the installed type definitions before use.
- Outward-facing actions (creating the public repository, deploying) were confirmed with
  the human first.
- Commits are small and describe *why*, so the history shows how the solution evolved.
