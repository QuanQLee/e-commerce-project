import logging
import random
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

logging.basicConfig(
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}',
    level=logging.INFO,
)
logger = logging.getLogger("experiment")

app = FastAPI(title="Experiment API", version="v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ASSIGN_COUNTER = Counter(
    "experiment_assignments_total", "Experiment assignments", ["experiment", "variant"]
)

@app.get("/assign/{experiment_id}")
async def assign_variant(experiment_id: str):
    variant = random.choice(["A", "B"])
    ASSIGN_COUNTER.labels(experiment=experiment_id, variant=variant).inc()
    logger.info(
        "assigned variant", extra={"experiment": experiment_id, "variant": variant}
    )
    return {"experiment": experiment_id, "variant": variant}

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/prometheus")
async def prometheus_metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
