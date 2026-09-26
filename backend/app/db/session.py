from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker


def build_engine(database_url: str) -> Engine:
    """Create an engine compatible with the configured relational database."""
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_engine(database_url, connect_args=connect_args)


def build_session_factory(database_url: str) -> sessionmaker[Session]:
    """Return a factory for short-lived request sessions."""
    return sessionmaker(bind=build_engine(database_url), autoflush=False, expire_on_commit=False)


def get_session(session_factory: sessionmaker[Session]) -> Generator[Session, None, None]:
    """Yield and reliably close one database session."""
    with session_factory() as session:
        yield session
