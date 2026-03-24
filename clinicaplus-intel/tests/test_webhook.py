import pytest
import hmac
import hashlib
from fastapi.testclient import TestClient
from lib.evolution_client import EvolutionClient
from unittest.mock import patch, AsyncMock

# Fast mock for the app router to test webhook directly
from fastapi import FastAPI
from routers.webhook import router, WEBHOOK_SECRET

app = FastAPI()
app.include_router(router)

client = TestClient(app)

def create_hmac(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode('utf-8'), body, hashlib.sha256).hexdigest()

def test_webhook_bloqueia_sem_hmac():
    response = client.post("/webhook/whatsapp", json={"test": 1})
    assert response.status_code == 401
    assert "Invalid HMAC signature" in response.json()["detail"]

@patch("routers.webhook.WEBHOOK_SECRET", "test_secret")
def test_webhook_aceita_hmac_valido():
    body_str = '{"event":"status.update"}'
    valid_hmac = create_hmac(body_str.encode('utf-8'), "test_secret")
    
    response = client.post(
        "/webhook/whatsapp", 
        content=body_str, 
        headers={"x-evolution-hmac": valid_hmac}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

@patch("routers.webhook.WEBHOOK_SECRET", "test_secret")
def test_webhook_mensagens_vazia():
    body = {"event": "messages.upsert", "data": {"messages": []}, "instance": "cli-1"}
    body_str = '{"event": "messages.upsert", "data": {"messages": []}, "instance": "cli-1"}'
    
    valid_hmac = create_hmac(body_str.encode('utf-8'), "test_secret")
    
    response = client.post("/webhook/whatsapp", content=body_str, headers={"x-evolution-hmac": valid_hmac})
    assert response.status_code == 200
