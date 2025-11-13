from app import create_app
import pytest

@pytest.fixture
def client():
    app = create_app()
    app.testing = True
    with app.test_client() as client:
        yield client

def test_dashboard_overview_structure(client):
    response = client.get("/api/dashboard/overview")
    assert response.status_code == 200
    data = response.get_json()
    assert "assets" in data
    assert "licenses" in data
    assert "backups" in data
    assert "metrics" in data
