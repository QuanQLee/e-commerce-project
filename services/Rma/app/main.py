from enum import Enum
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

class Status(str, Enum):
    requested = "requested"
    approved = "approved"
    shipped = "shipped"
    received = "received"
    refunded = "refunded"

class ReturnRequest(BaseModel):
    order_id: str
    reason: str

app = FastAPI(title="RMA API", version="v1")

RETURNS = {}
REQUEST_COUNTER = Counter("rma_requests_total", "Return requests")

@app.post("/returns/{rma_id}")
def create_return(rma_id: str, req: ReturnRequest):
    RETURNS[rma_id] = {"status": Status.requested, "order_id": req.order_id, "reason": req.reason}
    REQUEST_COUNTER.inc()
    return {"rma_id": rma_id}

@app.get("/returns/{rma_id}")
def get_return(rma_id: str):
    if rma_id not in RETURNS:
        raise HTTPException(status_code=404, detail="not found")
    return RETURNS[rma_id]

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
