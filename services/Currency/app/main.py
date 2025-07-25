from fastapi import FastAPI
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

app = FastAPI(title="Currency API", version="v1")

FX_COUNTER = Counter("fx_requests_total", "FX rate lookups")

RATES = {"USD": 1.0, "EUR": 0.92, "JPY": 157.5}

@app.get("/rate/{currency}")
def get_rate(currency: str):
    FX_COUNTER.inc()
    return {"currency": currency, "rate": RATES.get(currency.upper(), 1.0)}

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
