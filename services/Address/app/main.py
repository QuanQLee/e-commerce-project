from fastapi import FastAPI
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

app = FastAPI(title="Address API", version="v1")

VALIDATION_COUNTER = Counter("address_validations_total", "Address validations")

@app.get("/validate")
def validate(address: str):
    VALIDATION_COUNTER.inc()
    return {"address": address, "valid": True}

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
