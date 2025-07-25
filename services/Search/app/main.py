from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Search API", version="v1")

class SearchRequest(BaseModel):
    query: str

class SearchResult(BaseModel):
    id: str
    name: str

@app.post("/search", response_model=List[SearchResult])
async def search(req: SearchRequest):
    return [SearchResult(id="1", name=f"Fake result for {req.query}")]

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
