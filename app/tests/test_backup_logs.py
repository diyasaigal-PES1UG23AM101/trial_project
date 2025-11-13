# app/tests/test_backup_logs.py
import os
import json
import time
import shutil
import pytest

from app import create_app, db

@pytest.fixture
def app_client(tmp_path, monkeypatch):
    """
    Creates a Flask test client with an isolated CWD and in-memory DB.
    Also prepares a temporary working directory so the endpoint's
    os.getcwd()/backup_logs logic is predictable.
    """
    # 1) Use a temp working directory for this test run
    monkeypatch.chdir(tmp_path)

    # 2) Create the Flask app with a test config
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "SECRET_KEY": "test",
    })

    with app.app_context():
        db.create_all()

    client = app.test_client()
    yield client

    # Cleanup: nothing special; tmp_path is auto-removed by pytest

def test_backup_logs_returns_404_when_missing(app_client):
    # No backup_logs directory created => should return 404
    resp = app_client.get("/api/backup/logs")
    assert resp.status_code == 404
    data = resp.get_json()
    assert "No backup logs found" in data.get("message", "")

def test_backup_logs_happy_path(app_client):
    # Create backup_logs directory and a dummy .log file
    os.makedirs("backup_logs", exist_ok=True)
    logfile = os.path.join("backup_logs", "test_backup_1.log")

    with open(logfile, "w", encoding="utf-8") as f:
        f.write("Backup completed successfully at 2025-11-06 16:15\n")

    # Ensure mtime differs from now (not required, but realistic)
    os.utime(logfile, (time.time(), time.time()))

    resp = app_client.get("/api/backup/logs")
    assert resp.status_code == 200

    data = resp.get_json()
    assert "logs" in data
    assert isinstance(data["logs"], list)
    assert len(data["logs"]) >= 1

    # Validate structure of an item
    entry = data["logs"][0]
    assert "filename" in entry
    assert "size" in entry
    assert "last_modified" in entry

    # Validate filename & size match what we wrote
    assert entry["filename"] == "test_backup_1.log"
    assert entry["size"] > 0