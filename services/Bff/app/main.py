import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Any
import httpx

logging.basicConfig(format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}', level=logging.INFO)
logger = logging.getLogger("bff")

app = FastAPI(title="BFF API", version="v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/aggregate")
async def aggregate() -> Any:
    """Example endpoint aggregating data from other services."""
    async with httpx.AsyncClient() as client:
        res_catalog = await client.get("http://catalog.api/products")
        res_user = await client.get("http://user.api/users")
    return {
        "products": res_catalog.json() if res_catalog.status_code == 200 else [],
        "users": res_user.json() if res_user.status_code == 200 else [],
    }

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
