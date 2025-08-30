import os
from typing import Optional, List

import httpx
from fastapi import FastAPI
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

app = FastAPI(title="Shipping Rate API", version="v1")

QUOTE_COUNTER = Counter("quote_requests_total", "Shipping quote requests")
PURCHASE_COUNTER = Counter("label_purchases_total", "Simulated label purchases")

SHIPPING_API_URL = os.getenv("SHIPPING_API_URL", "http://shipping.api:80")


@app.post("/rates")
def get_rate(weight: float):
    QUOTE_COUNTER.inc()
    price = round(5 + weight * 0.5, 2)
    return {"price": price}


@app.post("/rates/aggregate")
def aggregate_rates(weight: float, destination: Optional[str] = None) -> dict:
    """Simulate querying multiple providers and returning the best quote.

    This stays fully offline for tests and does not call real providers.
    """
    QUOTE_COUNTER.inc()
    # Dummy provider formulas
    providers = [
        {
            "name": "acmeship",
            "price": round(4.5 + weight * 0.55, 2),
            "eta_days": 5,
        },
        {
            "name": "fastx",
            "price": round(6.0 + weight * 0.45, 2),
            "eta_days": 3,
        },
    ]
    best = min(providers, key=lambda p: p["price"]) if providers else None
    return {"quotes": providers, "best": best}


@app.post("/labels/purchase")
def purchase_label(shipment_id: str, provider: str, weight: float) -> dict:
    """Simulate a label purchase with a provider and trigger Shipping callback.

    For testing, we don't contact a real carrier; instead we:
      - compute a dummy label id
      - POST a callback payload to Shipping: /labels/callback
    """
    PURCHASE_COUNTER.inc()
    label_id = f"{provider}-{shipment_id}-L001"
    callback_payload = {
        "shipmentId": shipment_id,
        "provider": provider,
        "labelId": label_id,
        "weight": weight,
        "status": "LABEL_CREATED",
    }
    try:
        with httpx.Client(timeout=3.0) as client:
            client.post(f"{SHIPPING_API_URL}/labels/callback", json=callback_payload)
    except Exception:
        # In tests we ignore callback errors to keep flow simple
        pass
    return {"ok": True, "label_id": label_id}


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
