from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_rate():
    resp = client.get('/rate/USD')
    assert resp.status_code == 200
    data = resp.json()
    assert data['currency'] == 'USD'
    assert isinstance(data['rate'], float)
