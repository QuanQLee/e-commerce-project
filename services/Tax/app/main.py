from fastapi import FastAPI
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

app = FastAPI(title="Tax API", version="v1")

RATE_COUNTER = Counter("tax_requests_total", "Tax calculations")

RATES = {"US": 0.07, "DE": 0.19, "UK": 0.20}

@app.get("/rates/{country}")
def get_rate(country: str):
    RATE_COUNTER.inc()
    return {"country": country, "rate": RATES.get(country.upper(), 0)}

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
