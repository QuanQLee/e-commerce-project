from fastapi import FastAPI

app = FastAPI(title="Facet API", version="v1")

@app.get("/facets")
async def list_facets():
    return {
        "brand": {"ACME": 10, "Globex": 7},
        "color": {"red": 5, "blue": 3}
    }

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
