from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_validate():
    resp = client.get('/validate', params={'address': '123 Main St'})
    assert resp.status_code == 200
    data = resp.json()
    assert data['address'] == '123 Main St'
    assert data['valid'] is True
