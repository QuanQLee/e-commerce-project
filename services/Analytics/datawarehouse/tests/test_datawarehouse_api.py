from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_ingest():
    resp = client.post('/ingest', json={'e':1})
    assert resp.status_code == 200
    assert resp.json()['status'] == 'accepted'
