from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Search API", version="v1")

class SearchRequest(BaseModel):
    query: str

class SearchResult(BaseModel):
    id: str
    name: str

SAMPLE_DATA = {
    "p1": ["p2", "p3"],
    "p2": ["p1", "p4"],
}

@app.post("/search", response_model=List[SearchResult])
async def search(req: SearchRequest):
    return [SearchResult(id="1", name=f"Fake result for {req.query}")]


@app.get("/recommendations/{product_id}")
async def get_recommendations(product_id: str):
    return SAMPLE_DATA.get(product_id, [])

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
