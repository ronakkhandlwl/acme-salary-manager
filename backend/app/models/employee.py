from __future__ import annotations

from datetime import UTC, date, datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Date, DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _utc_now() -> datetime:
    return datetime.now(UTC)


if TYPE_CHECKING:
    from app.models.salary_record import SalaryRecord


class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = (
        Index(
            "ix_employees_country_department_status",
            "country_code",
            "department",
            "employment_status",
        ),
        # Unique constraints come from the columns; these plain indexes speed up lookups.
        Index("ix_employees_employee_number", "employee_number"),
        Index("ix_employees_email", "email"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    employee_number: Mapped[str] = mapped_column(String(32), unique=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    country_code: Mapped[str] = mapped_column(String(2), index=True)
    department: Mapped[str] = mapped_column(String(100), index=True)
    title: Mapped[str] = mapped_column(String(150))
    employment_status: Mapped[str] = mapped_column(String(20), index=True)
    hire_date: Mapped[date] = mapped_column(Date)
    # App-side microsecond timestamps order same-day corrections deterministically
    # (SQLite's CURRENT_TIMESTAMP only has one-second resolution).
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    salary_records: Mapped[list[SalaryRecord]] = relationship(
        back_populates="employee", cascade="all, delete-orphan", lazy="selectin"
    )
