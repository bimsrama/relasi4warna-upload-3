from fastapi.testclient import TestClient

# Import app directly (no server run)
from server import app


client = TestClient(app)


def test_health_endpoint_returns_ok():
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, dict)
    assert data.get("status") in ("ok", "healthy")
