import logging
from typing import List
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}', level=logging.INFO)
logger = logging.getLogger("tenant")

app = FastAPI(title="Tenant API", version="v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Tenant(BaseModel):
    id: int
    name: str

TENANTS: List[Tenant] = []

@app.post("/tenants")
async def create_tenant(t: Tenant):
    TENANTS.append(t)
    logger.info("created tenant", extra={"id": t.id})
    return {"status": "created"}

@app.get("/tenants")
async def list_tenants():
    return TENANTS

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
