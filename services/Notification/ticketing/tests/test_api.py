from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_ticket_flow():
    resp = client.post('/tickets', json={'msg':'help'})
    assert resp.status_code == 200
    ticket_id = resp.json()['id']
    resp = client.get(f'/tickets/{ticket_id}')
    assert resp.status_code == 200
    assert resp.json()['msg'] == 'help'
