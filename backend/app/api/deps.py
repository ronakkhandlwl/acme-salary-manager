from fastapi import Request
from sqlalchemy.orm import Session, sessionmaker

from app.db.session import get_session


def request_session(request: Request):
    factory: sessionmaker[Session] = request.app.state.session_factory
    yield from get_session(factory)
