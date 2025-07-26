import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}', level=logging.INFO)
logger = logging.getLogger("performance")

app = FastAPI(title="Performance API", version="v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/optimize")
async def optimize():
    """Placeholder endpoint for SSR/SSG or caching."""
    logger.info("optimizing page")
    return {"status": "optimized"}
