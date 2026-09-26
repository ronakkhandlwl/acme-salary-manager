"""Create reporting indexes for current-salary and recent-change queries.

Revision ID: 20260926_02
Revises: 20260926_01
Create Date: 2026-09-26
"""

from alembic import op

revision = "20260926_02"
down_revision = "20260926_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_salary_records_currency", "salary_records", ["currency"])
    op.create_index("ix_salary_records_created_at", "salary_records", ["created_at"])
    op.create_index(
        "ix_salary_records_employee_effective_created",
        "salary_records",
        ["employee_id", "effective_from", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_salary_records_employee_effective_created", table_name="salary_records")
    op.drop_index("ix_salary_records_created_at", table_name="salary_records")
    op.drop_index("ix_salary_records_currency", table_name="salary_records")
