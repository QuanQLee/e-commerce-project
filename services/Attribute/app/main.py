from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, List

app = FastAPI(title="Attribute API", version="v1")

class Attribute(BaseModel):
    name: str
    values: List[str]

attributes: Dict[str, Attribute] = {}

@app.post("/attributes")
async def create_attribute(attr: Attribute):
    attributes[attr.name] = attr
    return {"status": "created"}

@app.get("/attributes")
async def list_attributes():
    return list(attributes.values())

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
