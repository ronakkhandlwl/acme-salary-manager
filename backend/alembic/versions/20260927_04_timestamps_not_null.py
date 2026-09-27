"""Make audit timestamps mandatory, matching the ORM models.

Revision ID: 20260927_04
Revises: 20260927_03
Create Date: 2026-09-27
"""

import sqlalchemy as sa

from alembic import op

revision = "20260927_04"
down_revision = "20260927_03"
branch_labels = None
depends_on = None

TIMESTAMP_COLUMNS = {
    "employees": ("created_at", "updated_at"),
    "salary_records": ("created_at",),
}


def _set_nullable(nullable: bool) -> None:
    for table, columns in TIMESTAMP_COLUMNS.items():
        with op.batch_alter_table(table) as batch:
            for column in columns:
                batch.alter_column(
                    column,
                    existing_type=sa.DateTime(timezone=True),
                    existing_server_default=sa.text("CURRENT_TIMESTAMP"),
                    nullable=nullable,
                )


def upgrade() -> None:
    _set_nullable(False)


def downgrade() -> None:
    _set_nullable(True)
