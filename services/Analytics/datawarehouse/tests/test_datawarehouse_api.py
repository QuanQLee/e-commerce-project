import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.main import app

client = TestClient(app)

def test_ingest():
    resp = client.post('/ingest', json={'e':1})
    assert resp.status_code == 200
    assert resp.json()['status'] == 'accepted'
