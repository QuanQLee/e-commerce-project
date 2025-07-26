from fastapi.testclient import TestClient
from forecasting.app.main import app

client = TestClient(app)

def test_forecast():
    resp = client.get('/forecast/sku')
    assert resp.status_code == 200
    assert resp.json()['sku'] == 'sku'
