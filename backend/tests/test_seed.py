from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.employee import Employee
from app.models.salary_record import SalaryRecord
from scripts.seed import seed_database


def test_seed_database_creates_requested_unique_employees_and_salary_history(tmp_path) -> None:
    database_url = f"sqlite:///{tmp_path / 'seed.db'}"
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)

    summary = seed_database(database_url, employee_count=40, random_seed=7)

    with Session(engine) as session:
        employees = session.scalars(select(Employee)).all()
        salaries = session.scalars(select(SalaryRecord)).all()

    engine.dispose()

    assert summary.employee_count == 40
    assert len(employees) == 40
    assert len({employee.employee_number for employee in employees}) == 40
    assert len(salaries) >= 40
