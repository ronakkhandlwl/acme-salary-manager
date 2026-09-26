"""Create employee and salary record tables.

Revision ID: 20260926_01
Revises:
Create Date: 2026-09-26
"""

import sqlalchemy as sa

from alembic import op

revision = "20260926_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "employees",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("employee_number", sa.String(length=32), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("department", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("employment_status", sa.String(length=20), nullable=False),
        sa.Column("hire_date", sa.Date(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("employee_number"),
    )
    op.create_index("ix_employees_employee_number", "employees", ["employee_number"])
    op.create_index("ix_employees_email", "employees", ["email"])
    op.create_index("ix_employees_country_code", "employees", ["country_code"])
    op.create_index("ix_employees_department", "employees", ["department"])
    op.create_index("ix_employees_employment_status", "employees", ["employment_status"])
    op.create_index(
        "ix_employees_country_department_status",
        "employees",
        ["country_code", "department", "employment_status"],
    )
    op.create_table(
        "salary_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("employee_id", sa.String(length=36), nullable=False),
        sa.Column("amount_minor", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("pay_frequency", sa.String(length=20), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("change_reason", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_salary_records_employee_id", "salary_records", ["employee_id"])
    op.create_index("ix_salary_records_effective_from", "salary_records", ["effective_from"])
    op.create_index(
        "ix_salary_records_employee_effective_from",
        "salary_records",
        ["employee_id", "effective_from"],
    )


def downgrade() -> None:
    op.drop_table("salary_records")
    op.drop_table("employees")
