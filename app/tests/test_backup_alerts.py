import os
import json
import time
import pytest
from app import create_app  # imports your Flask app factory

@pytest.fixture
def app_client():
    """Fixture to provide a Flask test client."""
    app = create_app()
    app.testing = True
    with app.test_client() as client:
        yield client

def test_backup_alert_when_backup_missing(app_client):
    # Remove any existing backup logs folder
    if os.path.exists("backup_logs"):
        for f in os.listdir("backup_logs"):
            os.remove(os.path.join("backup_logs", f))
    else:
        os.makedirs("backup_logs", exist_ok=True)

    # Call the new alert endpoint
    response = app_client.get("/api/backup/alerts")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ALERT"
    assert "No recent backup found" in data["message"]

def test_backup_alert_when_recent_backup_exists(app_client):
    # Create recent backup log file (within 2 hours)
    os.makedirs("backup_logs", exist_ok=True)
    logfile = os.path.join("backup_logs", "recent_backup.log")
    with open(logfile, "w") as f:
        f.write("Backup completed successfully")

    os.utime(logfile, (time.time(), time.time()))  # Current time

    response = app_client.get("/api/backup/alerts")
    data = response.get_json()

    assert response.status_code == 200
    assert data["status"] == "OK"
    assert "Recent backup found" in data["message"]