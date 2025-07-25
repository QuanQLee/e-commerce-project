from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Fraud Detection API", version="v1")

class OrderInfo(BaseModel):
    order_id: str
    user_ip: str
    device_fingerprint: str

class FraudResult(BaseModel):
    order_id: str
    suspicious: bool

@app.post("/fraud/check", response_model=FraudResult)
async def check_fraud(info: OrderInfo):
    # Dummy rules placeholder
    suspicious = info.user_ip.startswith("192.0.2.")
    return FraudResult(order_id=info.order_id, suspicious=suspicious)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
