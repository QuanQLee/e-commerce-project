from fastapi import FastAPI
from fastapi.responses import Response
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

app = FastAPI(title="Forecasting API", version="v1")

REQUEST_COUNTER = Counter("forecast_requests_total", "Forecast requests")

@app.get("/forecast/{sku}")
async def forecast(sku: str):
    REQUEST_COUNTER.inc()
    return {"sku": sku, "forecast": 42}

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/prometheus")
async def prometheus_metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
