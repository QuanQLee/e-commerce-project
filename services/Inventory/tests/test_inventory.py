from fastapi.testclient import TestClient
from app.main import app, init_db

client = TestClient(app)

init_db()

def test_reserve_and_release():
    # ensure initial zero
    r = client.get('/inventory/product1')
    assert r.status_code == 200
    assert r.json()['quantity'] == 0
    # release 10 -> quantity 10
    r = client.post('/inventory/release', json={'product_id': 'product1', 'quantity': 10})
    assert r.status_code == 200
    r = client.get('/inventory/product1')
    assert r.json()['quantity'] == 10
    # reserve 4 -> quantity 6
    r = client.post('/inventory/reserve', json={'product_id': 'product1', 'quantity': 4})
    assert r.status_code == 200
    r = client.get('/inventory/product1')
    assert r.json()['quantity'] == 6
