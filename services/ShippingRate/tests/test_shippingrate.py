from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_rate():
    resp = client.post('/rates', json={'weight': 2.0})
    assert resp.status_code == 200
    data = resp.json()
    assert 'price' in data
    assert data['price'] == round(5 + 2.0 * 0.5, 2)
