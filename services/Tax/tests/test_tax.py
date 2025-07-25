from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_rate():
    resp = client.get('/rates/US')
    assert resp.status_code == 200
    data = resp.json()
    assert data['country'] == 'US'
    assert isinstance(data['rate'], float)
