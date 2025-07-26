from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_moderate():
    resp = client.post('/moderate', json={'text':'ok'})
    assert resp.status_code == 200
    assert resp.json()['flagged'] is False
