from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Consent Service API", version="v1")

class ConsentRecord(BaseModel):
    user_id: str
    accepted: bool

consent_db = {}

@app.post("/consent")
async def set_consent(record: ConsentRecord):
    consent_db[record.user_id] = record.accepted
    return {"ok": True}

@app.get("/consent/{user_id}")
async def get_consent(user_id: str):
    return {"user_id": user_id, "accepted": consent_db.get(user_id, False)}

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
