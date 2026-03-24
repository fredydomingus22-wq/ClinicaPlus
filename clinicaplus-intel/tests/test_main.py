import pytest
import os
from fastapi.testclient import TestClient
from main import app

# Need to set mock DB URL for testing lifespan if tests trigger it,
# But TestClient triggers lifespan automatically.
os.environ["DATABASE_URL"] = "postgresql://dummy:dummy@localhost:5432/dummy"

client = TestClient(app)

from unittest.mock import patch, AsyncMock, MagicMock

def test_health_check():
    """Testa se o serviço está activo."""
    mock_conn = AsyncMock()
    mock_acquire = MagicMock()
    mock_acquire.__aenter__.return_value = mock_conn
    mock_acquire.__aexit__.return_value = None
    
    # O pool em si não precisa ser async para acquire(), actua como objecto com métodos async
    mock_pool = MagicMock()
    mock_pool.acquire.return_value = mock_acquire

    # get_pool é de facto coroutine, então o objecto testado (health) espera coroutine
    mock_get_pool = AsyncMock(return_value=mock_pool)

    with patch("routers.health.get_pool", new=mock_get_pool):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "up"

def test_admin_cache_reload():
    """Testa endpoint auxiliar."""
    response = client.get("/admin/cache-reload")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
