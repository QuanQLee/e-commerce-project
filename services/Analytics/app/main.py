from fastapi import FastAPI, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, field_validator
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import logging

from .db import AsyncSessionLocal, init_db
from .models import Event, Metric
from .scheduler import start_scheduler
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("analytics")

app = FastAPI(title="Analytics API", version="v1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EVENT_COUNTER = Counter("analytics_events_total", "Total events", ["event_type"])
INVALID_COUNTER = Counter("analytics_invalid_events_total", "Total invalid events")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.warning("invalid analytics event: %s", exc.errors())
    INVALID_COUNTER.inc()
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(exc.errors())})

class EventIn(BaseModel):
    event_type: str
    payload: dict

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        if len(v) > 50:
            raise ValueError("event_type too long")
        return v

    @field_validator("payload")
    @classmethod
    def validate_payload(cls, v: dict) -> dict:
        import json
        if len(json.dumps(v)) > 1000:
            raise ValueError("payload too large")
        return v

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

@app.on_event("startup")
async def startup_event():
    await init_db()
    start_scheduler(AsyncSessionLocal)

@app.post("/events")
async def create_event(event: EventIn, session: AsyncSession = Depends(get_session)):
    db_event = Event(event_type=event.event_type, payload=event.payload)
    session.add(db_event)
    await session.commit()
    EVENT_COUNTER.labels(event.event_type).inc()
    return {"status": "received"}

@app.get("/metrics")
async def get_metrics(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Metric.event_type, Metric.count))
    metrics = {row.event_type: row.count for row in result.all()}
    return metrics

@app.get("/prometheus")
async def prometheus_metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
