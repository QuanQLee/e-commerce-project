from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

app = FastAPI(title="Ticketing API", version="v1")

TICKET_COUNTER = Counter("tickets_created_total", "Tickets created")

tickets = {}

@app.post("/tickets")
async def create_ticket(payload: dict):
    ticket_id = str(len(tickets) + 1)
    tickets[ticket_id] = payload
    TICKET_COUNTER.inc()
    return {"id": ticket_id}

@app.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str):
    ticket = tickets.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="not found")
    return ticket

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/prometheus")
async def prometheus_metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
