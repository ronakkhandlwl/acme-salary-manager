from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.employee import Employee


class SalaryRecord(Base):
    __tablename__ = "salary_records"
    __table_args__ = (
        Index("ix_salary_records_employee_effective_from", "employee_id", "effective_from"),
        Index("ix_salary_records_currency", "currency"),
        Index("ix_salary_records_created_at", "created_at"),
        Index(
            "ix_salary_records_employee_effective_created",
            "employee_id",
            "effective_from",
            "created_at",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    employee_id: Mapped[str] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True
    )
    amount_minor: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3))
    pay_frequency: Mapped[str] = mapped_column(String(20))
    effective_from: Mapped[date] = mapped_column(Date, index=True)
    change_reason: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    employee: Mapped[Employee] = relationship(back_populates="salary_records")
