from fastapi import FastAPI
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

app = FastAPI(title="Shipping Rate API", version="v1")

QUOTE_COUNTER = Counter("quote_requests_total", "Shipping quote requests")

@app.post("/rates")
def get_rate(weight: float):
    QUOTE_COUNTER.inc()
    price = round(5 + weight * 0.5, 2)
    return {"price": price}

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
