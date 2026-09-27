import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def spa_client(tmp_path, database_url: str):
    (tmp_path / "dist" / "assets").mkdir(parents=True)
    (tmp_path / "dist" / "index.html").write_text("<div id='root'></div>")
    (tmp_path / "dist" / "assets" / "app.js").write_text("console.log('ok')")
    (tmp_path / "secret.txt").write_text("outside build")
    application = create_app(
        database_url, create_schema=True, frontend_dist_dir=str(tmp_path / "dist")
    )
    with TestClient(application) as client:
        yield client


def test_serves_index_for_client_side_routes(spa_client: TestClient) -> None:
    response = spa_client.get("/employees/abc")

    assert response.status_code == 200
    assert "root" in response.text


def test_serves_built_assets(spa_client: TestClient) -> None:
    assert spa_client.get("/assets/app.js").text == "console.log('ok')"


def test_api_routes_are_not_shadowed_by_spa(spa_client: TestClient) -> None:
    assert spa_client.get("/health").json() == {"status": "ok"}
    assert spa_client.get("/api/v1/unknown").status_code == 404


def test_does_not_serve_files_outside_build_directory(spa_client: TestClient) -> None:
    response = spa_client.get("/..%2Fsecret.txt")

    assert "outside build" not in response.text


def test_missing_build_fails_fast(tmp_path) -> None:
    with pytest.raises(RuntimeError):
        create_app("sqlite://", frontend_dist_dir=str(tmp_path / "missing"))


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("postgres://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("postgresql://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("sqlite:///./x.db", "sqlite:///./x.db"),
    ],
)
def test_normalizes_provider_database_urls(raw: str, expected: str) -> None:
    assert Settings(database_url=raw).sqlalchemy_database_url == expected
