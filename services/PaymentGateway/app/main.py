from fastapi import FastAPI
from pydantic import BaseModel
import httpx
from tenacity import retry, stop_after_attempt

app = FastAPI(title="Payment Gateway API", version="v1")

class PaymentRequest(BaseModel):
    provider: str
    amount: float

class PaymentResponse(BaseModel):
    status: str
    provider: str

@retry(stop=stop_after_attempt(3))
async def call_provider(provider: str, payload: dict) -> dict:
    # Simulate provider call; in reality would route to Stripe/PayPal/etc
    # Here we just echo the provider name
    return {"ok": True, "provider": provider}

@app.post("/pay", response_model=PaymentResponse)
async def pay(req: PaymentRequest):
    result = await call_provider(req.provider, req.model_dump())
    return PaymentResponse(status="success" if result.get("ok") else "failed", provider=result["provider"])

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
