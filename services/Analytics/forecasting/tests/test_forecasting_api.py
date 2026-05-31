import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.main import app

client = TestClient(app)

def test_forecast():
    resp = client.get('/forecast/sku')
    assert resp.status_code == 200
    assert resp.json()['sku'] == 'sku'
