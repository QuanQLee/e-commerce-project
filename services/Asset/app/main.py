from fastapi import FastAPI, UploadFile
import uuid
from pathlib import Path

app = FastAPI(title="Asset API", version="v1")
STORAGE_DIR = Path("/tmp/assets")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

@app.post("/assets")
async def upload_asset(file: UploadFile):
    dest = STORAGE_DIR / f"{uuid.uuid4()}_{file.filename}"
    with dest.open("wb") as buffer:
        data = await file.read()
        buffer.write(data)
    return {"url": str(dest)}

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
