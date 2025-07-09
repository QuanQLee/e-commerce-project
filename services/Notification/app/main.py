import os
import logging
from email.message import EmailMessage

from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel, EmailStr
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
import aiosmtplib

logging.basicConfig(format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}', level=logging.INFO)
logger = logging.getLogger("notification")

app = FastAPI(title="Notification API", version="v1")

SEND_COUNTER = Counter("notifications_sent_total", "Total notifications sent", ["status"])
SEND_DURATION = Histogram(
    "notification_send_seconds",
    "Time spent sending an email",
    buckets=(0.1, 0.25, 0.5, 1, 2, 5)
)

class EmailRequest(BaseModel):
    to: EmailStr
    subject: str
    body: str

async def _send_email(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["From"] = os.getenv("SMTP_FROM", "no-reply@example.com")
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        with SEND_DURATION.time():
            await aiosmtplib.send(
            msg,
            hostname=os.getenv("SMTP_HOST", "localhost"),
            port=int(os.getenv("SMTP_PORT", "25")),
            username=os.getenv("SMTP_USER"),
            password=os.getenv("SMTP_PASSWORD"),
            start_tls=True,
        )
        logger.info("sent email", extra={"to": to})
        SEND_COUNTER.labels("success").inc()
    except Exception as e:
        logger.error(f"send_email failed: {e}")
        SEND_COUNTER.labels("failed").inc()

@app.post("/email")
async def send_email(req: EmailRequest, bg: BackgroundTasks):
    bg.add_task(_send_email, req.to, req.subject, req.body)
    return {"status": "queued"}

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/prometheus")
async def prometheus_metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
