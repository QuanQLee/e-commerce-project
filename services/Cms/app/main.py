import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

logging.basicConfig(
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}',
    level=logging.INFO,
)
logger = logging.getLogger("cms")

app = FastAPI(title="CMS API", version="v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REQUEST_COUNTER = Counter("cms_requests_total", "CMS requests")

class Article(BaseModel):
    title: str
    content: str

articles = []

@app.post("/articles")
async def create_article(article: Article):
    REQUEST_COUNTER.inc()
    articles.append(article)
    logger.info("created article", extra={"title": article.title})
    return {"status": "created"}

@app.get("/articles")
async def list_articles():
    REQUEST_COUNTER.inc()
    return articles

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/prometheus")
async def prometheus_metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
