import asyncio
import json
import logging
import os
import secrets
import time
from enum import Enum
from typing import Any, Dict, Optional
from urllib.parse import urlparse

import httpx
from fastapi import Cookie, Depends, FastAPI, Form, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from prometheus_fastapi_instrumentator import Instrumentator
import redis.asyncio as redis
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor


def _configure_logging() -> logging.Logger:
    logging.basicConfig(
        format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}',
        level=logging.INFO,
    )
    return logging.getLogger("bff")


logger = _configure_logging()

app = FastAPI(title="BFF API", version="v1")

def _configure_tracing() -> None:
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if not endpoint:
        return
    service_name = os.getenv("OTEL_SERVICE_NAME", "bff")
    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=endpoint)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    HTTPXClientInstrumentor().instrument()


def _csv_env(name: str, default: Optional[str] = None) -> list[str]:
    raw = os.getenv(name, default or "")
    values = [item.strip() for item in raw.split(",") if item.strip()]
    return values or (default.split(",") if default else [])


ALLOWED_ORIGINS = _csv_env(
    "BFF_ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3002,http://localhost:4000",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
_configure_tracing()
FastAPIInstrumentor.instrument_app(app)


def _env(
    name: str,
    default: Optional[str] = None,
    *,
    required: bool = False,
    allow_placeholder: bool = False,
) -> Optional[str]:
    value = os.getenv(name, default)
    if required and not value:
        raise RuntimeError(f"{name} environment variable must be set for the BFF service.")
    if (
        not allow_placeholder
        and value
        and value.startswith("__")
        and value.endswith("__")
    ):
        raise RuntimeError(f"{name} is using a placeholder value; set a real secret.")
    return value


AUTH_INTERNAL_BASE = _env("AUTH_INTERNAL_BASE", "http://auth.api").rstrip("/")
AUTH_PUBLIC_BASE = _env("AUTH_PUBLIC_BASE", "http://localhost:7000").rstrip("/")
BFF_CLIENT_ID = _env("BFF_CLIENT_ID", required=True)
BFF_CLIENT_SECRET = _env("BFF_CLIENT_SECRET", required=True)
BFF_SCOPE = _env("BFF_SCOPE", "api1 offline_access", allow_placeholder=True) or "api1"
BFF_ALLOW_PASSWORD_GRANT = (
    _env("BFF_ALLOW_PASSWORD_GRANT", "false", allow_placeholder=True) or "false"
).lower() in {"1", "true", "yes"}
SESSION_TTL = int(_env("BFF_SESSION_TTL", str(60 * 60 * 4), allow_placeholder=True))

_cookie_secure_raw = _env("BFF_COOKIE_SECURE", None, allow_placeholder=True)
if _cookie_secure_raw is None:
    COOKIE_SECURE = AUTH_PUBLIC_BASE.startswith("https://")
else:
    COOKIE_SECURE = _cookie_secure_raw.lower() in {"1", "true", "yes"}

COOKIE_DOMAIN = _env("BFF_COOKIE_DOMAIN", None, allow_placeholder=True)
COOKIE_SAMESITE = (_env("BFF_COOKIE_SAMESITE", "lax", allow_placeholder=True) or "lax").lower()
if COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    logger.warning("Unsupported same-site value '%s', defaulting to 'lax'.", COOKIE_SAMESITE)
    COOKIE_SAMESITE = "lax"
if COOKIE_SAMESITE == "none" and not COOKIE_SECURE:
    logger.warning("SameSite=None requires secure cookies; forcing secure flag.")
    COOKIE_SECURE = True

REDIS_URL = _env("BFF_SESSION_REDIS_URL", "redis://bff-redis:6379/0")
SESSION_NAMESPACE = _env("BFF_SESSION_NAMESPACE", "bff-session", allow_placeholder=True) or "bff-session"
USE_MEMORY_STORE = REDIS_URL.startswith("memory://")

TOKEN_ENDPOINT = f"{AUTH_INTERNAL_BASE}/connect/token"


def _session_key(sid: str) -> str:
    return f"{SESSION_NAMESPACE}:{sid}"


@app.on_event("startup")
async def _startup() -> None:
    global _redis_client
    if USE_MEMORY_STORE:
        _redis_client = _MemorySessionStore()
        logger.warning("Using in-memory session store. Configure Redis for production workloads.")
        return

    _redis_client = redis.from_url(
        REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )
    try:
        await _redis_client.ping()
        logger.info("Connected to Redis session store.")
        parsed = urlparse(REDIS_URL)
        if parsed.scheme != "rediss":
            logger.warning(
                "Redis connection is not TLS-protected (scheme=%s). "
                "Use rediss:// endpoints for production clusters.",
                parsed.scheme or "unknown",
            )
        if not parsed.password:
            logger.warning(
                "Redis URL does not include a password. Configure AUTH for production clusters."
            )
    except Exception as exc:  # pragma: no cover - startup failure path
        logger.error("Failed to connect to Redis at %s: %s", REDIS_URL, exc)
        raise


@app.on_event("shutdown")
async def _shutdown() -> None:
    if _redis_client is not None:
        close = getattr(_redis_client, "close", None)
        if callable(close):
            result = close()
            if asyncio.iscoroutine(result):
                await result


async def _redis_or_raise() -> Any:
    if _redis_client is None:
        raise RuntimeError("Redis client not initialised yet.")
    return _redis_client


@app.get("/healthz")
async def healthz() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz")
async def readyz() -> Dict[str, str]:
    client = await _redis_or_raise()
    await client.ping()
    return {"status": "ready"}


# --------------------
# Session store
# --------------------

class _MemorySessionStore:
    def __init__(self) -> None:
        self._data: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def setex(self, key: str, ttl: int, value: str) -> None:
        async with self._lock:
            self._data[key] = {"value": value, "expires_at": _now() + ttl}

    async def get(self, key: str) -> Optional[str]:
        async with self._lock:
            record = self._data.get(key)
            if not record:
                return None
            if record["expires_at"] <= _now():
                self._data.pop(key, None)
                return None
            return record["value"]

    async def expire(self, key: str, ttl: int) -> None:
        async with self._lock:
            if key in self._data:
                self._data[key]["expires_at"] = _now() + ttl

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._data.pop(key, None)

    async def ping(self) -> bool:
        return True

    async def close(self) -> None:
        async with self._lock:
            self._data.clear()


_redis_client: Optional[Any] = None


def _now() -> int:
    return int(time.time())


async def issue_session(
    access_token: str,
    expires_in: int,
    refresh_token: Optional[str] = None,
    scope: Optional[str] = None,
) -> str:
    ttl = min(expires_in, SESSION_TTL)
    sid = secrets.token_urlsafe(32)
    session = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "exp": _now() + ttl,
        "scope": scope or BFF_SCOPE,
    }
    client = await _redis_or_raise()
    await client.setex(_session_key(sid), ttl, json.dumps(session))
    return sid


async def get_session(sid: Optional[str]) -> Dict[str, Any]:
    if not sid:
        raise HTTPException(status_code=401, detail="Not authenticated")
    client = await _redis_or_raise()
    raw = await client.get(_session_key(sid))
    if not raw:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        session: Dict[str, Any] = json.loads(raw)
    except json.JSONDecodeError:
        await client.delete(_session_key(sid))
        raise HTTPException(status_code=401, detail="Session invalidated")
    remaining = int(session.get("exp", 0)) - _now()
    if remaining <= 0:
        await client.delete(_session_key(sid))
        raise HTTPException(status_code=401, detail="Session expired")
    await client.expire(_session_key(sid), max(remaining, 1))
    return session


async def delete_session(sid: Optional[str]) -> None:
    if not sid:
        return
    client = await _redis_or_raise()
    await client.delete(_session_key(sid))


def _set_session_cookie(response: Response, sid: str, expires_in: int) -> None:
    max_age = min(expires_in, SESSION_TTL)
    response.set_cookie(
        key="sid",
        value=sid,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=max_age,
        path="/",
        domain=COOKIE_DOMAIN,
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie("sid", path="/", domain=COOKIE_DOMAIN)


async def require_session(sid: Optional[str] = Cookie(default=None, alias="sid")) -> Dict[str, Any]:
    return await get_session(sid)


async def _call_token_endpoint(form: Dict[str, str]) -> Dict[str, Any]:
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(TOKEN_ENDPOINT, data=form, headers=headers)
    if response.status_code != 200:
        logger.warning(
            "Token endpoint returned %s: %s", response.status_code, response.text[:500]
        )
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail="Failed to exchange token with auth service.",
        ) from exc
    return response.json()


class LoginGrant(str, Enum):
    PASSWORD = "password"
    AUTHORIZATION_CODE = "authorization_code"


class SessionCreateRequest(BaseModel):
    grant_type: LoginGrant = LoginGrant.AUTHORIZATION_CODE
    username: Optional[str] = None
    password: Optional[str] = None
    code: Optional[str] = None
    code_verifier: Optional[str] = None
    redirect_uri: Optional[HttpUrl] = None
    scope: Optional[str] = None


def _scope_or_default(scope: Optional[str]) -> str:
    return scope or BFF_SCOPE


async def _create_session_from_token_response(
    token_body: Dict[str, Any],
    response: Response,
) -> Dict[str, bool]:
    access_token = token_body.get("access_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="Auth server response missing access_token.")
    expires_in = int(token_body.get("expires_in", SESSION_TTL))
    refresh_token = token_body.get("refresh_token")
    scope = token_body.get("scope", BFF_SCOPE)

    sid = await issue_session(access_token, expires_in, refresh_token, scope)
    _set_session_cookie(response, sid, expires_in)
    return {"ok": True}


async def _exchange_session(payload: SessionCreateRequest, response: Response) -> Dict[str, bool]:
    form: Dict[str, str] = {
        "client_id": BFF_CLIENT_ID,
        "scope": _scope_or_default(payload.scope),
    }

    if payload.grant_type is LoginGrant.PASSWORD:
        if not BFF_ALLOW_PASSWORD_GRANT:
            raise HTTPException(status_code=400, detail="Password grant is disabled.")
        if not payload.username or not payload.password:
            raise HTTPException(status_code=422, detail="Username and password are required.")
        form.update(
            grant_type="password",
            username=payload.username,
            password=payload.password,
            client_secret=BFF_CLIENT_SECRET,
        )
    else:
        if not payload.code or not payload.code_verifier or not payload.redirect_uri:
            raise HTTPException(
                status_code=422,
                detail="Authorization code, verifier and redirect_uri are required.",
            )
        form.update(
            grant_type="authorization_code",
            code=payload.code,
            code_verifier=payload.code_verifier,
            redirect_uri=str(payload.redirect_uri),
            client_secret=BFF_CLIENT_SECRET,
        )

    token_body = await _call_token_endpoint(form)
    return await _create_session_from_token_response(token_body, response)


@app.post("/auth/session")
async def create_session(payload: SessionCreateRequest, response: Response) -> Dict[str, bool]:
    return await _exchange_session(payload, response)


@app.post("/auth/login")
async def legacy_login(
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
) -> Dict[str, bool]:
    payload = SessionCreateRequest(
        grant_type=LoginGrant.PASSWORD,
        username=username,
        password=password,
    )
    return await _exchange_session(payload, response)


@app.post("/auth/refresh")
async def refresh_session(response: Response, sid: Optional[str] = Cookie(default=None, alias="sid")) -> Dict[str, bool]:
    session = await get_session(sid)
    refresh_token = session.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Session cannot be refreshed.")

    form = {
        "client_id": BFF_CLIENT_ID,
        "client_secret": BFF_CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "scope": session.get("scope", BFF_SCOPE),
    }
    token_body = await _call_token_endpoint(form)

    await delete_session(sid)
    return await _create_session_from_token_response(token_body, response)


@app.post("/auth/logout")
async def auth_logout(response: Response, sid: Optional[str] = Cookie(default=None, alias="sid")) -> Dict[str, bool]:
    await delete_session(sid)
    _clear_session_cookie(response)
    return {"ok": True}


@app.get("/aggregate")
async def aggregate(session: Dict[str, Any] = Depends(require_session)) -> Dict[str, Any]:
    token = session["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        res_catalog = await client.get("http://catalog.api/products", headers=headers)
        res_user = await client.get("http://user.api/users", headers=headers)
    return {
        "products": res_catalog.json() if res_catalog.status_code == 200 else [],
        "users": res_user.json() if res_user.status_code == 200 else [],
    }


@app.get("/healthz")
async def healthz() -> Dict[str, str]:
    return {"status": "ok"}


SERVICE_BASES = {
    "catalog": "http://catalog.api",
    "order": "http://order.api",
    "user": "http://user.api",
    "shipping": "http://shipping.api",
    "payment": "http://payment.api:8080",
    "analytics": "http://analytics.api:8000",
    "inventory": "http://inventory.api:8000",
    "promotion": "http://promotion.api:8000",
    "review": "http://review.api:8000",
    "recommendation": "http://recommendation.api:8000",
    "wishlist": "http://wishlist.api:8000",
    "experiment": "http://experiment.api:8000",
    "cms": "http://cms.api:8000",
    "rma": "http://rma.api:8000",
    "tax": "http://tax.api:8000",
    "currency": "http://currency.api:8000",
    "address": "http://address.api:8000",
    "shippingrate": "http://shippingrate.api:8000",
    "auth": "http://auth.api",
    "security": "http://security.api:8082",
    "admin": "http://admin.api:8000",
}


async def _proxy(
    request: Request,
    service: str,
    rest: str,
    session: Dict[str, Any] = Depends(require_session),
) -> Response:
    base = SERVICE_BASES.get(service)
    if not base:
        raise HTTPException(status_code=404, detail=f"Unknown service: {service}")

    url = f"{base}/{rest}"
    token = session["access_token"]

    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "cookie", "content-length"}
    }
    headers["Authorization"] = f"Bearer {token}"

    body = await request.body()
    async with httpx.AsyncClient(timeout=30.0) as client:
        upstream = await client.request(request.method, url, headers=headers, content=body)

    filtered_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in {"content-length", "transfer-encoding", "connection"}
    }
    return Response(content=upstream.content, status_code=upstream.status_code, headers=filtered_headers)


for method in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
    app.add_api_route("/api/v1/{service}/{rest:path}", _proxy, methods=[method])
