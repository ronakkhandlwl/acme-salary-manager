# ACME Salary Manager — Product Requirements

**Status:** Approved for V1  
**Persona:** HR Manager supporting a 10,000-person, multi-country organization

## Goal

Replace spreadsheet-based salary administration with a trustworthy web application that lets HR quickly find employee compensation, preserve salary history, record changes safely, and understand how ACME pays its workforce.

## Problem

Salary data is distributed across spreadsheets, making it slow to locate an employee, error-prone to update pay, difficult to retain history, and unreliable to analyze compensation across countries and departments.

## V1 outcomes

An HR Manager can:

1. Find an employee using name, employee number, email, country, department, status, and server-side sorting/pagination.
2. View employee details, current salary, and a chronological salary history.
3. Add a salary record with amount, currency, effective date, pay frequency, and change reason; previous records remain unchanged.
4. Answer routine compensation questions through filtered analytics: active headcount, payroll totals by country and currency, average/median salary, salary bands, highest/lowest salaries, and recent changes.

## Functional scope

- Responsive React HR interface backed by a documented Python API.
- Deterministic fictional seed data for 10,000 employees across countries, departments, currencies, and salary histories.
- Database-backed filtering, pagination, aggregation, validation, and audit-friendly historical records.
- Automated tests for core domain rules, APIs, UI behavior, and one end-to-end HR journey.
- Repeatable local setup, containerized delivery, deployment instructions, and a short demo video.

## Success measures

- HR can locate a seeded employee and view history in a few interactions without downloading a spreadsheet.
- A salary update is validated and visible in history without overwriting prior compensation.
- The directory never sends all 10,000 employees to the browser; reporting aggregates run in the database.
- A reviewer can start, seed, test, and evaluate the application using documented commands.

## Product rules

- Salary values are stored in integer minor units with an ISO currency code; floating point is prohibited.
- A current salary is the most recent effective salary record, not a mutable field on the employee.
- Monetary aggregates remain grouped and labelled by currency. Cross-currency totals require an agreed FX policy and are not shown in V1.
- Seed data is entirely fictional; no production employee or salary data is used.

## Deliberately out of scope

- Payroll processing, taxes, benefits, payslips, banking data, and jurisdiction-specific compliance: these are separate, high-risk domains.
- Free-form AI question answering and salary recommendations: curated analytics are more accurate, explainable, and appropriate for sensitive compensation data in V1.
- Currency conversion/consolidated payroll: requires a rate source, effective-date policy, and accounting agreement.
- Bulk import/export, approval workflows, notifications, enterprise SSO/SCIM, and granular role-based access control: valuable follow-ups, but not needed to validate the core HR workflow.

## Constraints and assumptions

- Backend: Python/FastAPI; UI: React/TypeScript; local database: SQLite; deployment database: PostgreSQL.
- V1 is evaluated as a single HR-admin workflow. Authentication is a deployment-hardening concern, not a substitute for the requested product flow.
- Deployment hosting credentials will be supplied or deployment will be documented for a free-tier compatible host.
