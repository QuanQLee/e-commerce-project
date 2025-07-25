from fastapi import FastAPI
from fastapi.responses import Response

app = FastAPI(title="SEO API", version="v1")
SITEMAP = "<urlset></urlset>"

@app.get("/sitemap.xml")
async def sitemap():
    return Response(content=SITEMAP, media_type="application/xml")

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
