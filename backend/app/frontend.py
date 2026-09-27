from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

API_PREFIXES = ("api/", "docs", "openapi.json", "redoc", "health")


def mount_frontend(application: FastAPI, dist_dir: str) -> None:
    """Serve the built single-page app, falling back to index.html for client routes."""
    root = Path(dist_dir).resolve()
    index = root / "index.html"
    if not index.is_file():
        raise RuntimeError(f"frontend build not found at {root}")
    application.mount("/assets", StaticFiles(directory=root / "assets"), name="assets")

    @application.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        if path.startswith(API_PREFIXES):
            raise HTTPException(status_code=404)
        candidate = (root / path).resolve()
        # Only serve real files inside the build directory (blocks ../ traversal).
        if path and candidate.is_file() and candidate.is_relative_to(root):
            return FileResponse(candidate)
        return FileResponse(index)
