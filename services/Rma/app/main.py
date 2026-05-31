from __future__ import annotations

import os
import sqlite3
from enum import Enum

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest

from app.migrations import run_sqlite_migrations

DB_PATH = os.getenv("RMA_DB_PATH", "rma.db")


class ReturnStatus(str, Enum):
    requested = "requested"
    approved = "approved"
    in_transit = "in_transit"
    received = "received"
    refunded = "refunded"
    rejected = "rejected"


class TicketStatus(str, Enum):
    open = "open"
    resolved = "resolved"


class ReturnRequest(BaseModel):
    order_id: str
    reason: str


class CancelOrderRequest(BaseModel):
    order_id: str
    reason: str


class CreateReturnRequest(BaseModel):
    order_id: str
    reason: str
    refund_amount: float = Field(gt=0)


class ReturnDecisionRequest(BaseModel):
    approved: bool
    note: str | None = None


class ReverseLogisticsRequest(BaseModel):
    tracking_no: str
    carrier: str


class RefundRequest(BaseModel):
    amount: float = Field(gt=0)
    channel: str = "original"
    idempotency_key: str | None = None


class TicketCreateRequest(BaseModel):
    order_id: str
    subject: str
    content: str


app = FastAPI(title="RMA API", version="v1")

REQUEST_COUNTER = Counter("rma_requests_total", "Return requests")
REFUND_COUNTER = Counter("rma_refunds_total", "Refunds")
TICKET_COUNTER = Counter("rma_tickets_total", "Tickets")


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db() -> None:
    run_sqlite_migrations(DB_PATH)


@app.on_event("startup")
def startup() -> None:
    _init_db()


def _return_or_404(rma_id: str) -> sqlite3.Row:
    with _conn() as conn:
        row = conn.execute("SELECT * FROM returns WHERE rma_id = ?", (rma_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="not found")
    return row


@app.post("/returns/{rma_id}")
def create_return_legacy(rma_id: str, req: ReturnRequest):
    with _conn() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO returns (
                rma_id, order_id, reason, status, refund_amount, tracking_no, carrier,
                decision_note, refund_paid, refund_channel
            ) VALUES (?, ?, ?, ?, 0, NULL, NULL, NULL, NULL, NULL)
            """,
            (rma_id, req.order_id, req.reason, ReturnStatus.requested.value),
        )
        conn.commit()
    REQUEST_COUNTER.inc()
    return {"rma_id": rma_id}


@app.post("/after-sales/cancel")
def cancel_order(req: CancelOrderRequest):
    with _conn() as conn:
        count = conn.execute("SELECT COUNT(*) AS c FROM cancels").fetchone()["c"]
        cancel_id = f"CAN-{count + 1:06d}"
        conn.execute(
            "INSERT INTO cancels (cancel_id, order_id, reason, status) VALUES (?, ?, ?, 'cancelled')",
            (cancel_id, req.order_id, req.reason),
        )
        conn.commit()
    return {"cancel_id": cancel_id, "order_id": req.order_id, "reason": req.reason, "status": "cancelled"}


@app.post("/returns")
def create_return(req: CreateReturnRequest):
    with _conn() as conn:
        count = conn.execute("SELECT COUNT(*) AS c FROM returns").fetchone()["c"]
        rma_id = f"RMA-{count + 1:06d}"
        conn.execute(
            """
            INSERT INTO returns (
                rma_id, order_id, reason, status, refund_amount, tracking_no, carrier,
                decision_note, refund_paid, refund_channel
            ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL)
            """,
            (rma_id, req.order_id, req.reason, ReturnStatus.requested.value, req.refund_amount),
        )
        conn.commit()
    REQUEST_COUNTER.inc()
    return get_return(rma_id)


@app.get("/returns/{rma_id}")
def get_return(rma_id: str):
    return dict(_return_or_404(rma_id))


@app.post("/returns/{rma_id}/decision")
def decide_return(rma_id: str, req: ReturnDecisionRequest):
    record = _return_or_404(rma_id)
    if record["status"] != ReturnStatus.requested.value:
        raise HTTPException(status_code=400, detail="return is not in requested status")
    status = ReturnStatus.approved.value if req.approved else ReturnStatus.rejected.value
    with _conn() as conn:
        conn.execute(
            "UPDATE returns SET status = ?, decision_note = ? WHERE rma_id = ?",
            (status, req.note, rma_id),
        )
        conn.commit()
    return get_return(rma_id)


@app.post("/returns/{rma_id}/reverse-logistics")
def reverse_logistics(rma_id: str, req: ReverseLogisticsRequest):
    record = _return_or_404(rma_id)
    if record["status"] not in (ReturnStatus.approved.value, ReturnStatus.in_transit.value):
        raise HTTPException(status_code=400, detail="return must be approved first")
    with _conn() as conn:
        conn.execute(
            "UPDATE returns SET tracking_no = ?, carrier = ?, status = ? WHERE rma_id = ?",
            (req.tracking_no, req.carrier, ReturnStatus.in_transit.value, rma_id),
        )
        conn.commit()
    return get_return(rma_id)


@app.post("/returns/{rma_id}/receive")
def receive_return(rma_id: str):
    record = _return_or_404(rma_id)
    if record["status"] != ReturnStatus.in_transit.value:
        raise HTTPException(status_code=400, detail="return is not in transit")
    with _conn() as conn:
        conn.execute("UPDATE returns SET status = ? WHERE rma_id = ?", (ReturnStatus.received.value, rma_id))
        conn.commit()
    return get_return(rma_id)


@app.post("/returns/{rma_id}/refund")
def refund_return(rma_id: str, req: RefundRequest):
    record = _return_or_404(rma_id)
    if record["status"] not in (ReturnStatus.received.value, ReturnStatus.refunded.value):
        raise HTTPException(status_code=400, detail="return must be received before refund")
    if req.amount > float(record["refund_amount"]):
        raise HTTPException(status_code=400, detail="refund amount exceeds request amount")

    idem_key = (req.idempotency_key or "").strip()
    with _conn() as conn:
        if idem_key:
            existing = conn.execute(
                "SELECT * FROM refund_operations WHERE rma_id = ? AND idempotency_key = ?",
                (rma_id, idem_key),
            ).fetchone()
            if existing is not None:
                return get_return(rma_id)

        conn.execute(
            "UPDATE returns SET status = ?, refund_paid = ?, refund_channel = ? WHERE rma_id = ?",
            (ReturnStatus.refunded.value, req.amount, req.channel, rma_id),
        )
        if idem_key:
            conn.execute(
                "INSERT INTO refund_operations (rma_id, idempotency_key, amount, channel) VALUES (?, ?, ?, ?)",
                (rma_id, idem_key, req.amount, req.channel),
            )
        conn.commit()

    REFUND_COUNTER.inc()
    return get_return(rma_id)


@app.post("/tickets")
def create_ticket(req: TicketCreateRequest):
    with _conn() as conn:
        count = conn.execute("SELECT COUNT(*) AS c FROM tickets").fetchone()["c"]
        ticket_id = f"TIC-{count + 1:06d}"
        conn.execute(
            "INSERT INTO tickets (ticket_id, order_id, subject, content, status) VALUES (?, ?, ?, ?, ?)",
            (ticket_id, req.order_id, req.subject, req.content, TicketStatus.open.value),
        )
        conn.commit()
    TICKET_COUNTER.inc()
    return get_ticket(ticket_id)


@app.post("/tickets/{ticket_id}/resolve")
def resolve_ticket(ticket_id: str):
    with _conn() as conn:
        row = conn.execute("SELECT * FROM tickets WHERE ticket_id = ?", (ticket_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="ticket not found")
        conn.execute("UPDATE tickets SET status = ? WHERE ticket_id = ?", (TicketStatus.resolved.value, ticket_id))
        conn.commit()
    return get_ticket(ticket_id)


@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str):
    with _conn() as conn:
        row = conn.execute("SELECT * FROM tickets WHERE ticket_id = ?", (ticket_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="ticket not found")
    return dict(row)


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
