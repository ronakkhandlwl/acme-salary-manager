# Engineering Decisions

| Decision | Choice | Rationale | Consequence |
|---|---|---|---|
| API framework | FastAPI | Python-native typing, request validation, OpenAPI generation | Keep endpoint and schema layers small and explicit |
| Persistence | SQLAlchemy + Alembic | Relational integrity and migration history, portable across SQLite/Postgres | Maintain migration discipline from the first model change |
| Compensation model | Append-only salary records | Preserves salary history and supports future as-of reporting | Current salary is computed, not stored on employee |
| Money | Integer minor units + ISO currency | Eliminates floating-point rounding errors | UI/API must format amounts at the boundary |
| Analytics UX | Curated dashboard and filters | Trustworthy, explainable answers for sensitive compensation data | No free-form AI query interface in V1 |
| Currency | Separate values by currency | Avoids false comparisons without FX policy | No global payroll total in V1 |
| Scale strategy | Database-side pagination and aggregates | Suitable for 10,000 employees without browser overfetch | Add indexes based on observed query plans |
| Seed data | Fixed random seed and fictional inputs | Reproducible tests/demo and no privacy risk | Seed command must be idempotent or explicitly reset data |

## Authentication boundary

The product is designed around one HR-admin workflow for assessment purposes. Deployment will use a protected demo access path where feasible. Full SSO, RBAC, approval flows, and audit-event infrastructure are intentionally deferred rather than simulated incompletely.
