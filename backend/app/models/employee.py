from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Date, DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

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
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    employee_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    country_code: Mapped[str] = mapped_column(String(2), index=True)
    department: Mapped[str] = mapped_column(String(100), index=True)
    title: Mapped[str] = mapped_column(String(150))
    employment_status: Mapped[str] = mapped_column(String(20), index=True)
    hire_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    salary_records: Mapped[list[SalaryRecord]] = relationship(
        back_populates="employee", cascade="all, delete-orphan", lazy="selectin"
    )
