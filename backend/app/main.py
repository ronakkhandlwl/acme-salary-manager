from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker

from app.api.employees import router as employees_router
from app.db.base import Base
from app.db.session import build_engine
from app.models import Employee, SalaryRecord  # noqa: F401


def create_app(
    database_url: str = "sqlite:///./acme_salary_manager.db", *, create_schema: bool = False
) -> FastAPI:
    """Create a configured API application for the supplied database."""

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        engine = build_engine(database_url)
        application.state.engine = engine
        application.state.session_factory = sessionmaker(
            bind=engine, autoflush=False, expire_on_commit=False
        )
        if create_schema:
            Base.metadata.create_all(engine)
        yield
        engine.dispose()

    application = FastAPI(title="ACME Salary Manager API", version="0.1.0", lifespan=lifespan)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(employees_router)

    @application.get("/health", tags=["system"])
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    return application


app = create_app()
