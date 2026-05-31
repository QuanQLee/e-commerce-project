import base64
import asyncio
import hashlib
import json
import logging
import os
import secrets
import time
from contextlib import asynccontextmanager
from enum import Enum
from typing import Any, Dict, Optional
from urllib.parse import parse_qsl, quote, urlencode, urlparse

import httpx
from fastapi import Cookie, Depends, FastAPI, Form, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
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


AUTH_INTERNAL_BASE = _env("AUTH_INTERNAL_BASE", "http://auth.api:8080").rstrip("/")
AUTH_PUBLIC_BASE = _env("AUTH_PUBLIC_BASE", "http://localhost:7000").rstrip("/")
USER_SERVICE_BASE = _env("USER_SERVICE_BASE", "http://user.api").rstrip("/")
BFF_CLIENT_ID = _env("BFF_CLIENT_ID", required=True)
BFF_CLIENT_SECRET = _env("BFF_CLIENT_SECRET", required=True)
BFF_SCOPE = _env("BFF_SCOPE", "api1 offline_access", allow_placeholder=True) or "api1"
BFF_REDIRECT_URI = (
    _env("BFF_REDIRECT_URI", "http://localhost:8000/auth/callback", allow_placeholder=True)
    or "http://localhost:8000/auth/callback"
)
BFF_OIDC_CLIENT_ID = _env("BFF_OIDC_CLIENT_ID", "bff-web", allow_placeholder=True) or "bff-web"
BFF_OIDC_CLIENT_SECRET = _env("BFF_OIDC_CLIENT_SECRET", "", allow_placeholder=True) or ""
BFF_OIDC_SCOPE = (
    _env("BFF_OIDC_SCOPE", f"openid profile {BFF_SCOPE}", allow_placeholder=True)
    or f"openid profile {BFF_SCOPE}"
)
BFF_MOBILE_OIDC_CLIENT_ID = (
    _env("BFF_MOBILE_OIDC_CLIENT_ID", "mobile-native", allow_placeholder=True) or "mobile-native"
)
BFF_MOBILE_OIDC_SCOPE = (
    _env("BFF_MOBILE_OIDC_SCOPE", f"openid profile {BFF_SCOPE}", allow_placeholder=True)
    or f"openid profile {BFF_SCOPE}"
)
BFF_MOBILE_REDIRECT_URIS = _csv_env(
    "BFF_MOBILE_REDIRECT_URIS",
    "dsmobile://auth/callback",
)
BFF_ALLOW_PASSWORD_GRANT = (
    _env("BFF_ALLOW_PASSWORD_GRANT", "false", allow_placeholder=True) or "false"
).lower() in {"1", "true", "yes"}
BFF_ALLOW_SELF_REGISTRATION = (
    _env("BFF_ALLOW_SELF_REGISTRATION", "false", allow_placeholder=True) or "false"
).lower() in {"1", "true", "yes"}
APP_ENVIRONMENT = (
    _env("BFF_ENVIRONMENT", None, allow_placeholder=True)
    or os.getenv("ASPNETCORE_ENVIRONMENT")
    or os.getenv("ENVIRONMENT")
    or "Development"
)
DEFAULT_TENANT_ID = _env("BFF_DEFAULT_TENANT_ID", "public", allow_placeholder=True) or "public"
TENANT_MAP_RAW = _env("BFF_TENANT_MAP_JSON", '{"user1":"tenant-a"}', allow_placeholder=True) or "{}"
try:
    TENANT_MAP = json.loads(TENANT_MAP_RAW)
    if not isinstance(TENANT_MAP, dict):
        TENANT_MAP = {}
except Exception:
    logger.warning("Invalid BFF_TENANT_MAP_JSON, falling back to empty mapping.")
    TENANT_MAP = {}
SESSION_TTL = int(_env("BFF_SESSION_TTL", str(60 * 60 * 4), allow_placeholder=True))
OIDC_STATE_TTL = int(_env("BFF_OIDC_STATE_TTL", "600", allow_placeholder=True) or "600")
BFF_HTTP_CONNECT_TIMEOUT = float(_env("BFF_HTTP_CONNECT_TIMEOUT", "2.0", allow_placeholder=True) or "2.0")
BFF_HTTP_READ_TIMEOUT = float(_env("BFF_HTTP_READ_TIMEOUT", "15.0", allow_placeholder=True) or "15.0")
BFF_HTTP_WRITE_TIMEOUT = float(_env("BFF_HTTP_WRITE_TIMEOUT", "15.0", allow_placeholder=True) or "15.0")
BFF_HTTP_POOL_TIMEOUT = float(_env("BFF_HTTP_POOL_TIMEOUT", "2.0", allow_placeholder=True) or "2.0")
BFF_HTTP_MAX_CONNECTIONS = int(_env("BFF_HTTP_MAX_CONNECTIONS", "512", allow_placeholder=True) or "512")
BFF_HTTP_MAX_KEEPALIVE_CONNECTIONS = int(
    _env("BFF_HTTP_MAX_KEEPALIVE_CONNECTIONS", "128", allow_placeholder=True) or "128"
)
BFF_HTTP_KEEPALIVE_EXPIRY = float(_env("BFF_HTTP_KEEPALIVE_EXPIRY", "30.0", allow_placeholder=True) or "30.0")
BFF_HTTP2_ENABLED = (
    _env("BFF_HTTP2_ENABLED", "false", allow_placeholder=True) or "false"
).lower() in {"1", "true", "yes"}
BFF_REDIS_MAX_CONNECTIONS = int(_env("BFF_REDIS_MAX_CONNECTIONS", "256", allow_placeholder=True) or "256")
BFF_REDIS_SOCKET_TIMEOUT = float(_env("BFF_REDIS_SOCKET_TIMEOUT", "2.0", allow_placeholder=True) or "2.0")

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
USERINFO_ENDPOINT = f"{AUTH_INTERNAL_BASE}/connect/userinfo"


def _is_non_production_environment() -> bool:
    return APP_ENVIRONMENT.strip().lower() in {"development", "dev", "testing", "test", "local"}


def _is_https_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme == "https"


def _validate_runtime_settings() -> None:
    if _is_non_production_environment():
        return

    if USE_MEMORY_STORE:
        raise RuntimeError("BFF_SESSION_REDIS_URL cannot use memory:// outside development or testing.")
    if BFF_ALLOW_PASSWORD_GRANT:
        raise RuntimeError("BFF_ALLOW_PASSWORD_GRANT must be false outside development or testing.")
    if BFF_ALLOW_SELF_REGISTRATION:
        raise RuntimeError("BFF_ALLOW_SELF_REGISTRATION must be false outside development or testing.")
    if not COOKIE_SECURE:
        raise RuntimeError("BFF cookies must be secure outside development or testing.")
    if not _is_https_url(AUTH_PUBLIC_BASE):
        raise RuntimeError("AUTH_PUBLIC_BASE must use https:// outside development or testing.")
    if not _is_https_url(BFF_REDIRECT_URI):
        raise RuntimeError("BFF_REDIRECT_URI must use https:// outside development or testing.")
    if not REDIS_URL.startswith("rediss://"):
        raise RuntimeError("BFF_SESSION_REDIS_URL must use rediss:// outside development or testing.")

    redis_url = urlparse(REDIS_URL)
    if not redis_url.password:
        raise RuntimeError("BFF_SESSION_REDIS_URL must include a password outside development or testing.")

    for origin in ALLOWED_ORIGINS:
        if not _is_https_url(origin):
            raise RuntimeError("BFF_ALLOWED_ORIGINS must use https:// outside development or testing.")


_validate_runtime_settings()


def _http_timeout(timeout_seconds: float) -> httpx.Timeout:
    return httpx.Timeout(
        timeout=timeout_seconds,
        connect=min(BFF_HTTP_CONNECT_TIMEOUT, timeout_seconds),
        read=timeout_seconds,
        write=min(BFF_HTTP_WRITE_TIMEOUT, timeout_seconds),
        pool=min(BFF_HTTP_POOL_TIMEOUT, timeout_seconds),
    )


def _create_http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=_http_timeout(BFF_HTTP_READ_TIMEOUT),
        limits=httpx.Limits(
            max_connections=BFF_HTTP_MAX_CONNECTIONS,
            max_keepalive_connections=BFF_HTTP_MAX_KEEPALIVE_CONNECTIONS,
            keepalive_expiry=BFF_HTTP_KEEPALIVE_EXPIRY,
        ),
        http2=BFF_HTTP2_ENABLED,
        follow_redirects=False,
    )


def _shared_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = _create_http_client()
    return _http_client


async def _request_upstream(
    method: str,
    url: str,
    *,
    timeout_seconds: float = 15.0,
    **kwargs: Any,
) -> httpx.Response:
    try:
        return await _shared_http_client().request(
            method,
            url,
            timeout=_http_timeout(timeout_seconds),
            **kwargs,
        )
    except httpx.TimeoutException as exc:
        logger.warning(
            "upstream_timeout",
            extra={"method": method, "url": url, "timeout_seconds": timeout_seconds},
        )
        raise HTTPException(status_code=504, detail="Upstream service timed out.") from exc
    except httpx.RequestError as exc:
        logger.warning(
            "upstream_request_failed",
            extra={"method": method, "url": url, "error": str(exc)},
        )
        raise HTTPException(status_code=502, detail="Upstream service unavailable.") from exc


def _session_key(sid: str) -> str:
    return f"{SESSION_NAMESPACE}:{sid}"


def _oidc_state_key(state: str) -> str:
    return f"{SESSION_NAMESPACE}:oidc:{state}"


async def _open_session_store() -> None:
    global _redis_client
    if USE_MEMORY_STORE:
        _redis_client = _MemorySessionStore()
        logger.warning("Using in-memory session store. Configure Redis for production workloads.")
        return

    _redis_client = redis.from_url(
        REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        max_connections=BFF_REDIS_MAX_CONNECTIONS,
        socket_connect_timeout=BFF_REDIS_SOCKET_TIMEOUT,
        socket_timeout=BFF_REDIS_SOCKET_TIMEOUT,
        health_check_interval=30,
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


async def _close_session_store() -> None:
    if _redis_client is not None:
        close = getattr(_redis_client, "aclose", None) or getattr(_redis_client, "close", None)
        if callable(close):
            result = close()
            if asyncio.iscoroutine(result):
                await result


async def _open_http_client() -> None:
    _shared_http_client()


async def _close_http_client() -> None:
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None


@asynccontextmanager
async def _lifespan(_: FastAPI):
    await _open_session_store()
    await _open_http_client()
    try:
        yield
    finally:
        await _close_http_client()
        await _close_session_store()


app = FastAPI(title="BFF API", version="v1", lifespan=_lifespan)
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


async def _redis_or_raise() -> Any:
    global _redis_client
    if _redis_client is None:
        if USE_MEMORY_STORE:
            _redis_client = _MemorySessionStore()
            return _redis_client
        raise RuntimeError("Redis client not initialised yet.")
    return _redis_client


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
_http_client: Optional[httpx.AsyncClient] = None


def _now() -> int:
    return int(time.time())


async def issue_session(
    access_token: str,
    expires_in: int,
    refresh_token: Optional[str] = None,
    scope: Optional[str] = None,
    tenant_id: Optional[str] = None,
    oauth_client_id: Optional[str] = None,
    user_profile: Optional[Dict[str, Any]] = None,
    auth_subject_id: Optional[str] = None,
) -> str:
    ttl = min(expires_in, SESSION_TTL)
    sid = secrets.token_urlsafe(32)
    mobile_user = _to_mobile_user_profile(user_profile)
    session = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "exp": _now() + ttl,
        "scope": scope or BFF_SCOPE,
        "tenant_id": tenant_id or DEFAULT_TENANT_ID,
        "oauth_client_id": oauth_client_id or BFF_CLIENT_ID,
    }
    if auth_subject_id:
        session["auth_subject_id"] = auth_subject_id
    if mobile_user:
        session["user_id"] = mobile_user.id
        session["user_name"] = mobile_user.user_name
        session["user_email"] = mobile_user.email
        session["tenant_id"] = mobile_user.tenant_id
        if mobile_user.auth_subject_id:
            session["auth_subject_id"] = mobile_user.auth_subject_id
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


async def issue_oidc_state(redirect_target: str, tenant_id: str) -> Dict[str, str]:
    state = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(64)
    payload = {
        "redirect": redirect_target,
        "tenant_id": tenant_id,
        "code_verifier": code_verifier,
    }
    client = await _redis_or_raise()
    await client.setex(_oidc_state_key(state), OIDC_STATE_TTL, json.dumps(payload))
    return {"state": state, "code_verifier": code_verifier}


async def pop_oidc_state(state: Optional[str]) -> Dict[str, Any]:
    if not state:
        raise HTTPException(status_code=400, detail="Missing state.")
    client = await _redis_or_raise()
    raw = await client.get(_oidc_state_key(state))
    await client.delete(_oidc_state_key(state))
    if not raw:
        raise HTTPException(status_code=400, detail="OIDC state expired or invalid.")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="OIDC state is invalid.") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="OIDC state is invalid.")
    return payload


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


async def maybe_session(sid: Optional[str] = Cookie(default=None, alias="sid")) -> Optional[Dict[str, Any]]:
    if not sid:
        return None
    try:
        return await get_session(sid)
    except HTTPException:
        return None


def _normalize_tenant_id(value: Optional[str]) -> str:
    if value and value.strip():
        return value.strip()
    return DEFAULT_TENANT_ID


def _validate_mobile_redirect_uri(value: str) -> str:
    redirect_uri = value.strip()
    if not redirect_uri:
        raise HTTPException(status_code=422, detail="redirect_uri is required.")
    if redirect_uri not in BFF_MOBILE_REDIRECT_URIS:
        raise HTTPException(status_code=400, detail="redirect_uri is not allowed for mobile PKCE.")
    return redirect_uri


def _oauth_client_secret(client_id: Optional[str]) -> Optional[str]:
    if client_id == BFF_OIDC_CLIENT_ID:
        return BFF_OIDC_CLIENT_SECRET or None
    if client_id == BFF_MOBILE_OIDC_CLIENT_ID:
        return None
    if client_id == BFF_CLIENT_ID or not client_id:
        return BFF_CLIENT_SECRET
    return None


def _base64url_sha256(value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")


def _base64url_decode(segment: str) -> bytes:
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(f"{segment}{padding}")


def _decode_jwt_claims(token: Optional[str]) -> Dict[str, Any]:
    if not isinstance(token, str) or token.count(".") < 2:
        return {}
    try:
        payload = token.split(".")[1]
        decoded = _base64url_decode(payload).decode("utf-8")
        claims = json.loads(decoded)
        if isinstance(claims, dict):
            return claims
    except Exception as exc:
        logger.warning("jwt_decode_failed", extra={"error": str(exc)})
    return {}


def _extract_identity_claims(claims: Optional[Dict[str, Any]]) -> Dict[str, Optional[str]]:
    if not isinstance(claims, dict):
        return {"subject_id": None, "username": None, "email": None}
    subject_id = claims.get("sub")
    username = (
        claims.get("preferred_username")
        or claims.get("name")
        or claims.get("unique_name")
        or claims.get("username")
    )
    email = claims.get("email")
    return {
        "subject_id": subject_id.strip() if isinstance(subject_id, str) and subject_id.strip() else None,
        "username": username.strip() if isinstance(username, str) and username.strip() else None,
        "email": email.strip() if isinstance(email, str) and email.strip() else None,
    }


def _redirect_origin(value: str) -> Optional[str]:
    parsed = urlparse(value)
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def _sanitize_redirect_target(value: Optional[str]) -> str:
    if not value:
        return "/"
    trimmed = value.strip()
    if not trimmed:
        return "/"
    if trimmed.startswith("/") and not trimmed.startswith("//"):
        return trimmed
    origin = _redirect_origin(trimmed)
    if origin and origin in ALLOWED_ORIGINS:
        return trimmed
    logger.warning("Ignoring unsafe redirect target: %s", trimmed[:200])
    return "/"


def _resolve_proxy_tenant_id(request: Request, session: Optional[Dict[str, Any]]) -> str:
    if session:
        return _normalize_tenant_id(session.get("tenant_id"))
    return _normalize_tenant_id(request.headers.get("X-Tenant-Id"))


def _resolve_proxy_authorization(
    request: Request,
    session: Optional[Dict[str, Any]],
) -> str:
    if session:
        token = session.get("access_token")
        if isinstance(token, str) and token.strip():
            return f"Bearer {token.strip()}"

    incoming = request.headers.get("Authorization")
    if incoming and incoming.strip():
        return incoming.strip()

    raise HTTPException(status_code=401, detail="Not authenticated")


async def _call_token_endpoint(form: Dict[str, str]) -> Dict[str, Any]:
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    response = await _request_upstream(
        "POST",
        TOKEN_ENDPOINT,
        data=form,
        headers=headers,
        timeout_seconds=15.0,
    )
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
    tenant_id: Optional[str] = None


class RegisterRequest(BaseModel):
    username: str
    password: str
    tenant_id: Optional[str] = None


class MobileLoginRequest(BaseModel):
    username: str
    password: str
    tenant_id: Optional[str] = None
    scope: Optional[str] = None


class MobileRefreshRequest(BaseModel):
    refresh_token: str
    tenant_id: Optional[str] = None
    scope: Optional[str] = None
    oauth_client_id: Optional[str] = None


class MobileAuthorizeRequest(BaseModel):
    redirect_uri: str
    code_challenge: str
    state: str
    tenant_id: Optional[str] = None
    scope: Optional[str] = None


class MobileAuthorizeResponse(BaseModel):
    authorize_url: str
    client_id: str
    redirect_uri: str
    tenant_id: str
    state: str


class MobileExchangeRequest(BaseModel):
    code: str
    code_verifier: str
    redirect_uri: str
    tenant_id: Optional[str] = None
    scope: Optional[str] = None


class MobileUserProfile(BaseModel):
    id: str
    auth_subject_id: Optional[str] = None
    user_name: str
    email: Optional[str] = None
    tenant_id: str


class MobileTokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "Bearer"
    expires_in: int
    expires_at: int
    scope: str
    tenant_id: str
    oauth_client_id: str
    user: Optional[MobileUserProfile] = None


def _scope_or_default(scope: Optional[str]) -> str:
    return scope or BFF_SCOPE


async def _create_session_from_token_response(
    token_body: Dict[str, Any],
    response: Response,
    tenant_id: Optional[str] = None,
    oauth_client_id: Optional[str] = None,
    user_profile: Optional[Dict[str, Any]] = None,
    auth_subject_id: Optional[str] = None,
) -> Dict[str, Any]:
    access_token = token_body.get("access_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="Auth server response missing access_token.")
    expires_in = int(token_body.get("expires_in", SESSION_TTL))
    refresh_token = token_body.get("refresh_token")
    scope = token_body.get("scope", BFF_SCOPE)

    resolved_tenant_id = tenant_id or DEFAULT_TENANT_ID
    sid = await issue_session(
        access_token,
        expires_in,
        refresh_token,
        scope,
        resolved_tenant_id,
        oauth_client_id,
        user_profile,
        auth_subject_id,
    )
    _set_session_cookie(response, sid, expires_in)
    payload = {"ok": True, "tenant_id": resolved_tenant_id}
    mobile_user = _to_mobile_user_profile(user_profile)
    if mobile_user:
        payload["user_id"] = mobile_user.id
        payload["user_name"] = mobile_user.user_name
    return payload


async def _lookup_tenant_id_by_username(username: str) -> Optional[str]:
    url = f"{USER_SERVICE_BASE}/users/by-username/{quote(username, safe='')}"
    try:
        response = await _request_upstream("GET", url, timeout_seconds=5.0)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        payload = response.json()
        tenant_id = payload.get("tenantId")
        if isinstance(tenant_id, str) and tenant_id.strip():
            return tenant_id.strip()
    except Exception as exc:
        logger.warning("lookup_tenant_id_failed", extra={"username": username, "error": str(exc)})
    return None


def _user_lookup_by_username_url(username: str, tenant_id: Optional[str] = None) -> str:
    url = f"{USER_SERVICE_BASE}/users/by-username/{quote(username, safe='')}"
    normalized_tenant_id = _normalize_tenant_id(tenant_id) if tenant_id and tenant_id.strip() else None
    if not normalized_tenant_id:
        return url
    return f"{url}?{urlencode({'tenantId': normalized_tenant_id})}"


async def _lookup_user_profile_by_username(
    username: str,
    tenant_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    url = _user_lookup_by_username_url(username, tenant_id)
    try:
        response = await _request_upstream("GET", url, timeout_seconds=5.0)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            return None
        return payload
    except Exception as exc:
        logger.warning("lookup_user_profile_failed", extra={"username": username, "error": str(exc)})
    return None


async def _lookup_user_profile_by_auth_subject(auth_subject_id: str) -> Optional[Dict[str, Any]]:
    url = f"{USER_SERVICE_BASE}/users/by-auth-subject/{quote(auth_subject_id, safe='')}"
    try:
        response = await _request_upstream("GET", url, timeout_seconds=5.0)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            return None
        return payload
    except Exception as exc:
        logger.warning(
            "lookup_user_profile_by_subject_failed",
            extra={"auth_subject_id": auth_subject_id, "error": str(exc)},
        )
    return None


async def _fetch_userinfo(access_token: str) -> Optional[Dict[str, Any]]:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }
    try:
        response = await _request_upstream(
            "GET",
            USERINFO_ENDPOINT,
            headers=headers,
            timeout_seconds=10.0,
        )
        if response.status_code >= 400:
            logger.warning(
                "userinfo_failed",
                extra={"status_code": response.status_code, "body": response.text[:300]},
            )
            return None
        payload = response.json()
        if isinstance(payload, dict):
            return payload
    except Exception as exc:
        logger.warning("userinfo_request_failed", extra={"error": str(exc)})
    return None


async def _ensure_user_profile_for_identity(
    auth_subject_id: Optional[str],
    username: Optional[str],
    tenant_id: str,
    email: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    if auth_subject_id:
        profile = await _lookup_user_profile_by_auth_subject(auth_subject_id)
        if profile:
            return profile
    if username:
        profile = await _lookup_user_profile_by_username(username, tenant_id)
        if profile:
            return profile
    await _sync_user_profile(username, tenant_id, auth_subject_id, email)
    if auth_subject_id:
        profile = await _lookup_user_profile_by_auth_subject(auth_subject_id)
        if profile:
            return profile
    if username:
        return await _lookup_user_profile_by_username(username, tenant_id)
    return None


async def _ensure_user_profile(username: str, tenant_id: str) -> Optional[Dict[str, Any]]:
    profile = await _lookup_user_profile_by_username(username, tenant_id)
    if profile:
        return profile
    await _sync_user_profile(username, tenant_id)
    return await _lookup_user_profile_by_username(username, tenant_id)


async def _resolve_tenant_id(username: Optional[str], tenant_id: Optional[str]) -> str:
    if tenant_id and tenant_id.strip():
        return tenant_id.strip()
    if username:
        resolved = await _lookup_tenant_id_by_username(username)
        if resolved:
            return resolved
        mapped = TENANT_MAP.get(username)
        if isinstance(mapped, str) and mapped.strip():
            return mapped.strip()
    return DEFAULT_TENANT_ID


async def _sync_user_profile(
    username: Optional[str],
    tenant_id: str,
    auth_subject_id: Optional[str] = None,
    email: Optional[str] = None,
) -> None:
    normalized_username = (username or "").strip()
    if not normalized_username and not auth_subject_id:
        return

    lookup_url = (
        f"{USER_SERVICE_BASE}/users/by-auth-subject/{quote(auth_subject_id, safe='')}"
        if auth_subject_id
        else _user_lookup_by_username_url(normalized_username, tenant_id)
    )
    create_url = f"{USER_SERVICE_BASE}/users"
    lookup = await _request_upstream("GET", lookup_url, timeout_seconds=10.0)
    if lookup.status_code == 200:
        return
    if lookup.status_code != 404:
        logger.warning(
            "user_profile_lookup_failed",
            extra={
                "username": normalized_username,
                "auth_subject_id": auth_subject_id,
                "status_code": lookup.status_code,
                "body": lookup.text[:300],
            },
        )
        return

    create = await _request_upstream(
        "POST",
        create_url,
        json={
            "authSubjectId": auth_subject_id,
            "userName": normalized_username or auth_subject_id or "user",
            "email": (email or f"{normalized_username or auth_subject_id or 'user'}@example.com"),
            "tenantId": tenant_id,
        },
        timeout_seconds=10.0,
    )
    if create.status_code not in {200, 201, 409}:
        logger.warning(
            "user_profile_create_failed",
            extra={
                "username": normalized_username,
                "auth_subject_id": auth_subject_id,
                "status_code": create.status_code,
                "body": create.text[:300],
            },
        )


async def _resolve_user_profile_from_token(
    access_token: str,
    tenant_id: str,
    username_hint: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    userinfo = await _fetch_userinfo(access_token)
    claims = _extract_identity_claims(userinfo or _decode_jwt_claims(access_token))
    username = claims["username"] or username_hint
    resolved_tenant_id = await _resolve_tenant_id(username, tenant_id)
    return await _ensure_user_profile_for_identity(
        claims["subject_id"],
        username,
        resolved_tenant_id,
        claims["email"],
    )


async def _register_account(payload: RegisterRequest) -> Response:
    if not BFF_ALLOW_SELF_REGISTRATION:
        raise HTTPException(status_code=403, detail="Self-service registration is disabled.")

    username = payload.username.strip()
    password = payload.password.strip()
    if not username or not password:
        raise HTTPException(status_code=422, detail="Username and password are required.")

    auth_response = await _request_upstream(
        "POST",
        f"{AUTH_INTERNAL_BASE}/account/register",
        json={"username": username, "password": password},
        timeout_seconds=15.0,
    )

    if auth_response.status_code >= 400:
        return Response(
            content=auth_response.content,
            status_code=auth_response.status_code,
            media_type=auth_response.headers.get("content-type", "application/json"),
        )

    tenant_id = await _resolve_tenant_id(username, payload.tenant_id)
    await _sync_user_profile(username, tenant_id)
    return Response(
        content=auth_response.content,
        status_code=auth_response.status_code,
        media_type=auth_response.headers.get("content-type", "application/json"),
    )


async def _exchange_session(payload: SessionCreateRequest, response: Response) -> Dict[str, Any]:
    form: Dict[str, str]
    oauth_client_id: str
    user_profile: Optional[Dict[str, Any]] = None
    auth_subject_id: Optional[str] = None

    if payload.grant_type is LoginGrant.PASSWORD:
        if not BFF_ALLOW_PASSWORD_GRANT:
            raise HTTPException(status_code=400, detail="Password grant is disabled.")
        if not payload.username or not payload.password:
            raise HTTPException(status_code=422, detail="Username and password are required.")
        oauth_client_id = BFF_CLIENT_ID
        form = {
            "client_id": oauth_client_id,
            "scope": _scope_or_default(payload.scope),
            "grant_type": "password",
            "username": payload.username,
            "password": payload.password,
            "client_secret": BFF_CLIENT_SECRET,
        }
    else:
        if not payload.code or not payload.code_verifier or not payload.redirect_uri:
            raise HTTPException(
                status_code=422,
                detail="Authorization code, verifier and redirect_uri are required.",
            )
        oauth_client_id = BFF_OIDC_CLIENT_ID
        form = {
            "client_id": oauth_client_id,
            "grant_type": "authorization_code",
            "code": payload.code,
            "code_verifier": payload.code_verifier,
            "redirect_uri": str(payload.redirect_uri),
        }
        oidc_client_secret = _oauth_client_secret(oauth_client_id)
        if oidc_client_secret:
            form["client_secret"] = oidc_client_secret

    token_body = await _call_token_endpoint(form)
    tenant_id = await _resolve_tenant_id(payload.username, payload.tenant_id)
    if payload.grant_type is LoginGrant.PASSWORD and payload.username:
        user_profile = await _ensure_user_profile(payload.username, tenant_id)
    else:
        user_profile = await _resolve_user_profile_from_token(
            str(token_body.get("access_token") or ""),
            tenant_id,
            payload.username,
        )
        mobile_user = _to_mobile_user_profile(user_profile)
        auth_subject_id = mobile_user.auth_subject_id if mobile_user else None
        if mobile_user:
            tenant_id = mobile_user.tenant_id
    return await _create_session_from_token_response(
        token_body,
        response,
        tenant_id,
        oauth_client_id,
        user_profile,
        auth_subject_id,
    )


def _to_mobile_user_profile(profile: Optional[Dict[str, Any]]) -> Optional[MobileUserProfile]:
    if not profile:
        return None
    user_id = profile.get("id")
    auth_subject_id = profile.get("authSubjectId") or profile.get("auth_subject_id")
    user_name = profile.get("userName") or profile.get("user_name")
    tenant_id = profile.get("tenantId") or profile.get("tenant_id") or DEFAULT_TENANT_ID
    if user_id is None or not isinstance(user_name, str) or not user_name.strip():
        return None
    email = profile.get("email")
    return MobileUserProfile(
        id=str(user_id),
        auth_subject_id=str(auth_subject_id).strip() if isinstance(auth_subject_id, str) and auth_subject_id.strip() else None,
        user_name=user_name.strip(),
        email=email if isinstance(email, str) and email.strip() else None,
        tenant_id=_normalize_tenant_id(str(tenant_id)),
    )


def _build_mobile_token_response(
    token_body: Dict[str, Any],
    tenant_id: str,
    user_profile: Optional[Dict[str, Any]] = None,
    oauth_client_id: Optional[str] = None,
) -> MobileTokenResponse:
    access_token = token_body.get("access_token")
    if not isinstance(access_token, str) or not access_token.strip():
        raise HTTPException(status_code=502, detail="Auth server response missing access_token.")
    expires_in = int(token_body.get("expires_in", SESSION_TTL))
    return MobileTokenResponse(
        access_token=access_token,
        refresh_token=token_body.get("refresh_token"),
        expires_in=expires_in,
        expires_at=_now() + expires_in,
        scope=str(token_body.get("scope", BFF_SCOPE)),
        tenant_id=_normalize_tenant_id(tenant_id),
        oauth_client_id=oauth_client_id or BFF_CLIENT_ID,
        user=_to_mobile_user_profile(user_profile),
    )


def _profile_from_session(session: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not isinstance(session, dict):
        return None
    user_id = session.get("user_id")
    user_name = session.get("user_name")
    tenant_id = session.get("tenant_id")
    if not isinstance(user_id, str) or not user_id.strip():
        return None
    if not isinstance(user_name, str) or not user_name.strip():
        return None
    profile: Dict[str, Any] = {
        "id": user_id.strip(),
        "userName": user_name.strip(),
        "tenantId": _normalize_tenant_id(str(tenant_id)) if tenant_id is not None else DEFAULT_TENANT_ID,
    }
    auth_subject_id = session.get("auth_subject_id")
    if isinstance(auth_subject_id, str) and auth_subject_id.strip():
        profile["authSubjectId"] = auth_subject_id.strip()
    email = session.get("user_email")
    if isinstance(email, str) and email.strip():
        profile["email"] = email.strip()
    return profile


async def _resolve_current_user_profile(
    authorization: str,
    tenant_id: str,
    session: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    session_profile = _profile_from_session(session)
    if session_profile:
        return session_profile

    if not authorization.lower().startswith("bearer "):
        return None
    access_token = authorization.split(" ", 1)[1].strip()
    if not access_token:
        return None
    return await _resolve_user_profile_from_token(access_token, tenant_id)


async def _rewrite_order_request_for_current_user(
    request: Request,
    authorization: str,
    tenant_id: str,
    session: Optional[Dict[str, Any]],
    body: bytes,
) -> tuple[list[tuple[str, str]], bytes, str]:
    profile = await _resolve_current_user_profile(authorization, tenant_id, session)
    mobile_user = _to_mobile_user_profile(profile)
    if not mobile_user:
        raise HTTPException(status_code=401, detail="Unable to resolve current user.")

    query_params = parse_qsl(request.url.query, keep_blank_values=True)
    rewritten_body = body

    if request.method.upper() == "GET":
        query_params = [(key, value) for key, value in query_params if key != "userId"]
        return query_params, rewritten_body, mobile_user.id

    if request.method.upper() == "POST":
        try:
            payload = json.loads(body.decode("utf-8") or "{}")
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Order payload must be valid JSON.") from exc
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Order payload must be a JSON object.")
        payload.pop("userId", None)
        rewritten_body = json.dumps(payload).encode("utf-8")
        return query_params, rewritten_body, mobile_user.id

    return query_params, rewritten_body, mobile_user.id


@app.post("/auth/session")
async def create_session(payload: SessionCreateRequest, response: Response) -> Dict[str, Any]:
    return await _exchange_session(payload, response)


@app.post("/auth/login")
async def legacy_login(
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    tenant_id: Optional[str] = Form(default=None),
) -> Dict[str, Any]:
    payload = SessionCreateRequest(
        grant_type=LoginGrant.PASSWORD,
        username=username,
        password=password,
        tenant_id=tenant_id,
    )
    return await _exchange_session(payload, response)


@app.post("/auth/register")
async def register(payload: RegisterRequest) -> Response:
    return await _register_account(payload)


@app.post("/auth/mobile/login", response_model=MobileTokenResponse)
async def mobile_login(payload: MobileLoginRequest) -> MobileTokenResponse:
    username = payload.username.strip()
    password = payload.password.strip()
    if not BFF_ALLOW_PASSWORD_GRANT:
        raise HTTPException(status_code=400, detail="Password grant is disabled.")
    if not username or not password:
        raise HTTPException(status_code=422, detail="Username and password are required.")

    token_body = await _call_token_endpoint(
        {
            "client_id": BFF_CLIENT_ID,
            "client_secret": BFF_CLIENT_SECRET,
            "grant_type": "password",
            "username": username,
            "password": password,
            "scope": _scope_or_default(payload.scope),
        }
    )
    tenant_id = await _resolve_tenant_id(username, payload.tenant_id)
    user_profile = await _ensure_user_profile(username, tenant_id)
    return _build_mobile_token_response(token_body, tenant_id, user_profile, BFF_CLIENT_ID)


@app.post("/auth/mobile/refresh", response_model=MobileTokenResponse)
async def mobile_refresh(payload: MobileRefreshRequest) -> MobileTokenResponse:
    refresh_token = payload.refresh_token.strip()
    if not refresh_token:
        raise HTTPException(status_code=422, detail="Refresh token is required.")

    oauth_client_id = payload.oauth_client_id or BFF_CLIENT_ID
    form = {
        "client_id": oauth_client_id,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "scope": _scope_or_default(payload.scope),
    }
    client_secret = _oauth_client_secret(oauth_client_id)
    if client_secret:
        form["client_secret"] = client_secret
    token_body = await _call_token_endpoint(form)
    tenant_id = _normalize_tenant_id(payload.tenant_id)
    user_profile = await _resolve_user_profile_from_token(
        str(token_body.get("access_token") or ""),
        tenant_id,
    )
    mobile_user = _to_mobile_user_profile(user_profile)
    if mobile_user:
        tenant_id = mobile_user.tenant_id
    return _build_mobile_token_response(token_body, tenant_id, user_profile, oauth_client_id)


@app.post("/auth/mobile/authorize", response_model=MobileAuthorizeResponse)
async def mobile_authorize(payload: MobileAuthorizeRequest) -> MobileAuthorizeResponse:
    redirect_uri = _validate_mobile_redirect_uri(payload.redirect_uri)
    state = payload.state.strip()
    code_challenge = payload.code_challenge.strip()
    if not state:
        raise HTTPException(status_code=422, detail="state is required.")
    if not code_challenge:
        raise HTTPException(status_code=422, detail="code_challenge is required.")
    tenant_id = _normalize_tenant_id(payload.tenant_id)
    authorize_params = {
        "response_type": "code",
        "client_id": BFF_MOBILE_OIDC_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": payload.scope or BFF_MOBILE_OIDC_SCOPE,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    authorize_url = f"{AUTH_PUBLIC_BASE}/connect/authorize?{urlencode(authorize_params)}"
    return MobileAuthorizeResponse(
        authorize_url=authorize_url,
        client_id=BFF_MOBILE_OIDC_CLIENT_ID,
        redirect_uri=redirect_uri,
        tenant_id=tenant_id,
        state=state,
    )


@app.post("/auth/mobile/exchange", response_model=MobileTokenResponse)
async def mobile_exchange(payload: MobileExchangeRequest) -> MobileTokenResponse:
    code = payload.code.strip()
    code_verifier = payload.code_verifier.strip()
    redirect_uri = _validate_mobile_redirect_uri(payload.redirect_uri)
    if not code:
        raise HTTPException(status_code=422, detail="code is required.")
    if not code_verifier:
        raise HTTPException(status_code=422, detail="code_verifier is required.")

    token_body = await _call_token_endpoint(
        {
            "client_id": BFF_MOBILE_OIDC_CLIENT_ID,
            "grant_type": "authorization_code",
            "code": code,
            "code_verifier": code_verifier,
            "redirect_uri": redirect_uri,
        }
    )
    tenant_id = _normalize_tenant_id(payload.tenant_id)
    user_profile = await _resolve_user_profile_from_token(
        str(token_body.get("access_token") or ""),
        tenant_id,
    )
    mobile_user = _to_mobile_user_profile(user_profile)
    if mobile_user:
        tenant_id = mobile_user.tenant_id
    return _build_mobile_token_response(token_body, tenant_id, user_profile, BFF_MOBILE_OIDC_CLIENT_ID)


@app.get("/auth/oidc/login")
async def oidc_login(redirect: Optional[str] = None, tenant_id: Optional[str] = None) -> RedirectResponse:
    redirect_target = _sanitize_redirect_target(redirect)
    resolved_tenant_id = _normalize_tenant_id(tenant_id)
    oidc_state = await issue_oidc_state(redirect_target, resolved_tenant_id)
    authorize_params = {
        "response_type": "code",
        "client_id": BFF_OIDC_CLIENT_ID,
        "redirect_uri": BFF_REDIRECT_URI,
        "scope": BFF_OIDC_SCOPE,
        "state": oidc_state["state"],
        "code_challenge": _base64url_sha256(oidc_state["code_verifier"]),
        "code_challenge_method": "S256",
    }
    authorize_url = f"{AUTH_PUBLIC_BASE}/connect/authorize?{urlencode(authorize_params)}"
    return RedirectResponse(authorize_url, status_code=302)


@app.get("/auth/callback")
async def auth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
) -> RedirectResponse:
    if error:
        description = (error_description or error).strip()
        raise HTTPException(status_code=400, detail=f"OIDC login failed: {description}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code.")

    oidc_state = await pop_oidc_state(state)
    form = {
        "client_id": BFF_OIDC_CLIENT_ID,
        "grant_type": "authorization_code",
        "code": code,
        "code_verifier": str(oidc_state.get("code_verifier") or ""),
        "redirect_uri": BFF_REDIRECT_URI,
    }
    oidc_client_secret = _oauth_client_secret(BFF_OIDC_CLIENT_ID)
    if oidc_client_secret:
        form["client_secret"] = oidc_client_secret

    token_body = await _call_token_endpoint(form)
    user_profile = await _resolve_user_profile_from_token(
        str(token_body.get("access_token") or ""),
        _normalize_tenant_id(str(oidc_state.get("tenant_id") or DEFAULT_TENANT_ID)),
    )
    mobile_user = _to_mobile_user_profile(user_profile)
    resolved_tenant_id = mobile_user.tenant_id if mobile_user else _normalize_tenant_id(
        str(oidc_state.get("tenant_id") or DEFAULT_TENANT_ID)
    )
    redirect_response = RedirectResponse(
        _sanitize_redirect_target(str(oidc_state.get("redirect") or "/")),
        status_code=302,
    )
    await _create_session_from_token_response(
        token_body,
        redirect_response,
        resolved_tenant_id,
        BFF_OIDC_CLIENT_ID,
        user_profile,
        mobile_user.auth_subject_id if mobile_user else None,
    )
    return redirect_response


@app.post("/auth/refresh")
async def refresh_session(response: Response, sid: Optional[str] = Cookie(default=None, alias="sid")) -> Dict[str, Any]:
    session = await get_session(sid)
    refresh_token = session.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Session cannot be refreshed.")

    oauth_client_id = str(session.get("oauth_client_id") or BFF_CLIENT_ID)
    form = {
        "client_id": oauth_client_id,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "scope": session.get("scope", BFF_SCOPE),
    }
    client_secret = _oauth_client_secret(oauth_client_id)
    if client_secret:
        form["client_secret"] = client_secret
    token_body = await _call_token_endpoint(form)

    await delete_session(sid)
    existing_profile = _profile_from_session(session)
    user_profile = existing_profile or await _resolve_user_profile_from_token(
        str(token_body.get("access_token") or ""),
        _normalize_tenant_id(session.get("tenant_id")),
    )
    mobile_user = _to_mobile_user_profile(user_profile)
    return await _create_session_from_token_response(
        token_body,
        response,
        mobile_user.tenant_id if mobile_user else session.get("tenant_id"),
        oauth_client_id,
        user_profile,
        mobile_user.auth_subject_id if mobile_user else session.get("auth_subject_id"),
    )


@app.post("/auth/logout")
async def auth_logout(response: Response, sid: Optional[str] = Cookie(default=None, alias="sid")) -> Dict[str, bool]:
    await delete_session(sid)
    _clear_session_cookie(response)
    return {"ok": True}


@app.get("/auth/me")
async def auth_me(session: Dict[str, Any] = Depends(require_session)) -> Dict[str, Any]:
    return {
        "authenticated": True,
        "tenant_id": session.get("tenant_id", DEFAULT_TENANT_ID),
        "scope": session.get("scope", BFF_SCOPE),
        "expires_at": session.get("exp"),
        "user_id": session.get("user_id"),
        "user_name": session.get("user_name"),
        "auth_subject_id": session.get("auth_subject_id"),
    }


@app.get("/aggregate")
async def aggregate(session: Dict[str, Any] = Depends(require_session)) -> Dict[str, Any]:
    token = session["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Id": session.get("tenant_id", DEFAULT_TENANT_ID),
    }
    res_catalog, res_user = await asyncio.gather(
        _request_upstream(
            "GET",
            "http://catalog.api:8080/products",
            headers=headers,
            timeout_seconds=15.0,
        ),
        _request_upstream(
            "GET",
            "http://user.api/users",
            headers=headers,
            timeout_seconds=15.0,
        ),
    )
    return {
        "products": res_catalog.json() if res_catalog.status_code == 200 else [],
        "users": res_user.json() if res_user.status_code == 200 else [],
    }


@app.get("/healthz")
async def healthz() -> Dict[str, str]:
    return {"status": "ok"}


SERVICE_BASES = {
    "catalog": (_env("CATALOG_SERVICE_BASE", "http://catalog.api:8080", allow_placeholder=True) or "http://catalog.api:8080").rstrip("/"),
    "order": "http://order.api:8080",
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
    "auth": "http://auth.api:8080",
    "security": "http://security.api:8082",
    "admin": "http://admin.api:8000",
    "tenant": "http://tenant.api:8000",
}


async def _proxy(
    request: Request,
    service: str,
    rest: str,
    session: Optional[Dict[str, Any]] = Depends(maybe_session),
) -> Response:
    base = SERVICE_BASES.get(service)
    if not base:
        raise HTTPException(status_code=404, detail=f"Unknown service: {service}")
    authorization = _resolve_proxy_authorization(request, session)
    tenant_id = _resolve_proxy_tenant_id(request, session)

    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "cookie", "content-length", "authorization", "x-tenant-id", "x-user-id"}
    }
    headers["Authorization"] = authorization
    headers["X-Tenant-Id"] = tenant_id

    body = await request.body()
    query_params = parse_qsl(request.url.query, keep_blank_values=True)
    if service == "order" and (
        rest == "orders"
        or (request.method.upper() == "GET" and rest.startswith("orders/") and not rest.endswith("/status"))
    ):
        query_params, body, current_user_id = await _rewrite_order_request_for_current_user(
            request,
            authorization,
            tenant_id,
            session,
            body,
        )
        headers["X-User-Id"] = current_user_id

    url = f"{base}/{rest}"
    if query_params:
        url = f"{url}?{urlencode(query_params)}"
    upstream = await _request_upstream(
        request.method,
        url,
        headers=headers,
        content=body,
        timeout_seconds=30.0,
    )

    filtered_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in {"content-length", "transfer-encoding", "connection"}
    }
    return Response(content=upstream.content, status_code=upstream.status_code, headers=filtered_headers)


for method in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
    app.add_api_route("/api/v1/{service}/{rest:path}", _proxy, methods=[method])
