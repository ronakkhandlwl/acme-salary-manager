"""Widen salary amounts to BIGINT so large minor-unit values cannot overflow.

Revision ID: 20260927_03
Revises: 20260926_02
Create Date: 2026-09-27
"""

import sqlalchemy as sa

from alembic import op

revision = "20260927_03"
down_revision = "20260926_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("salary_records") as batch:
        batch.alter_column(
            "amount_minor", existing_type=sa.Integer(), type_=sa.BigInteger(), nullable=False
        )


def downgrade() -> None:
    with op.batch_alter_table("salary_records") as batch:
        batch.alter_column(
            "amount_minor", existing_type=sa.BigInteger(), type_=sa.Integer(), nullable=False
        )
