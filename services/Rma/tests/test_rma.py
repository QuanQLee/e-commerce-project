import os

from fastapi.testclient import TestClient

os.environ["RMA_DB_PATH"] = os.path.join(os.path.dirname(__file__), "test_rma.db")
if os.path.exists(os.environ["RMA_DB_PATH"]):
    os.remove(os.environ["RMA_DB_PATH"])

from app.main import _init_db, app

_init_db()

client = TestClient(app)


def test_after_sales_closed_loop_with_idempotent_refund():
    cancel = client.post("/after-sales/cancel", json={"order_id": "o-c-1", "reason": "changed mind"})
    assert cancel.status_code == 200
    assert cancel.json()["status"] == "cancelled"

    create = client.post(
        "/returns",
        json={"order_id": "o123", "reason": "damaged", "refund_amount": 88.8},
    )
    assert create.status_code == 200
    rma_id = create.json()["rma_id"]

    approved = client.post(f"/returns/{rma_id}/decision", json={"approved": True, "note": "ok"})
    assert approved.status_code == 200

    in_transit = client.post(
        f"/returns/{rma_id}/reverse-logistics",
        json={"tracking_no": "SF123", "carrier": "SF"},
    )
    assert in_transit.status_code == 200

    received = client.post(f"/returns/{rma_id}/receive")
    assert received.status_code == 200

    refunded = client.post(
        f"/returns/{rma_id}/refund",
        json={"amount": 88.8, "channel": "original", "idempotency_key": "idem-1"},
    )
    assert refunded.status_code == 200
    assert refunded.json()["status"] == "refunded"

    refunded2 = client.post(
        f"/returns/{rma_id}/refund",
        json={"amount": 88.8, "channel": "original", "idempotency_key": "idem-1"},
    )
    assert refunded2.status_code == 200
    assert refunded2.json()["status"] == "refunded"


def test_ticket_lifecycle_and_legacy_return():
    legacy = client.post('/returns/1', json={'order_id': 'o123', 'reason': 'damaged'})
    assert legacy.status_code == 200

    resp = client.get('/returns/1')
    assert resp.status_code == 200
    assert resp.json()['status'] == 'requested'

    ticket = client.post(
        "/tickets",
        json={"order_id": "o123", "subject": "refund timeout", "content": "please check"},
    )
    assert ticket.status_code == 200
    ticket_id = ticket.json()["ticket_id"]

    resolved = client.post(f"/tickets/{ticket_id}/resolve")
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"
