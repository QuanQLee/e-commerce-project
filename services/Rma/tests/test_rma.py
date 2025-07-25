from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_and_get_return():
    resp = client.post('/returns/1', json={'order_id': 'o123', 'reason': 'damaged'})
    assert resp.status_code == 200
    data = resp.json()
    assert data['rma_id'] == '1'

    resp = client.get('/returns/1')
    assert resp.status_code == 200
    data = resp.json()
    assert data['status'] == 'requested'
    assert data['order_id'] == 'o123'
