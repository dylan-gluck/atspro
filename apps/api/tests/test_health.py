from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Test that the health endpoint returns successfully."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "atspro-api"


def test_api_root_available():
    """Test that the API root is accessible."""
    response = client.get("/")
    # Should return 404 since no root endpoint exists, but API should be running
    assert response.status_code == 404
