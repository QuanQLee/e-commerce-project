import logging
import secrets
import time
from typing import Any, Dict, Optional

import httpx
from fastapi import Cookie, Depends, FastAPI, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import base64
import hashlib

logging.basicConfig(format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}', level=logging.INFO)
logger = logging.getLogger("bff")

app = FastAPI(title="BFF API", version="v1")

# In dev, explicitly list the frontend origins so cookies can be sent with credentials
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Admin
    "http://localhost:3002",  # Merchant
    "http://localhost:4000",  # Storefront
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------
# Minimal session store
# --------------------
_SESSIONS: Dict[str, Dict[str, Any]] = {}
_SESSION_TTL = 60 * 60 * 4  # 4 hours
AUTH_INTERNAL_BASE = os.getenv('AUTH_INTERNAL_BASE', 'http://auth.api')
AUTH_PUBLIC_BASE = os.getenv('AUTH_PUBLIC_BASE', 'http://localhost:7000')
BFF_CLIENT_ID = os.getenv('BFF_CLIENT_ID', '1')
BFF_CLIENT_SECRET = os.getenv('BFF_CLIENT_SECRET', 'secret1')

def _now() -> int:
    return int(time.time())

def _cleanup_sessions() -> None:
    now = _now()
    expired = [sid for sid, s in _SESSIONS.items() if s.get("exp", 0) <= now]
    for sid in expired:
        _SESSIONS.pop(sid, None)



def issue_session(access_token: str, expires_in: int, refresh_token: Optional[str] = None) -> str:
    sid = secrets.token_urlsafe(32)
    _SESSIONS[sid] = {
        "access_token": access_token,
        "exp": _now() + min(expires_in, _SESSION_TTL),
        "refresh_token": refresh_token,
    }
    return sid
def get_session(sid: Optional[str]) -> Dict[str, Any]:
    _cleanup_sessions()
    if not sid or sid not in _SESSIONS:
        raise HTTPException(status_code=401, detail="Not authenticated")
    sess = _SESSIONS[sid]
    if sess.get("exp", 0) <= _now():
        _SESSIONS.pop(sid, None)
        raise HTTPException(status_code=401, detail="Session expired")
    return sess

def require_session(sid: Optional[str] = Cookie(default=None, alias="sid")) -> Dict[str, Any]:
    return get_session(sid)

# --------------------
# Auth endpoints (dev)
# --------------------
@app.post("/auth/login")
async def auth_login(response: Response, username: str, password: str):
    """
    Dev-friendly login that exchanges credentials with the Auth service (ROPC)
    and issues a short-lived HttpOnly session cookie. Frontends never see tokens.
    """
    data = {
        "client_id": "1",
        "client_secret": "secret1",
        "grant_type": "password",
        "username": username,
        "password": password,
        "scope": "api1 offline_access",
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(f"{AUTH_INTERNAL_BASE}/connect/token", data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    body = r.json()
    access_token = body.get("access_token")
    expires_in = int(body.get("expires_in", 3600))
    if not access_token:
        raise HTTPException(status_code=500, detail="Auth server did not return access_token")
    sid = issue_session(access_token, expires_in)
    # HttpOnly cookie; in dev we skip Secure to work on http://localhost
    response.set_cookie(
        key="sid",
        value=sid,
        httponly=True,
        samesite="lax",
        max_age=min(expires_in, _SESSION_TTL),
        path="/",
    )
    return {"ok": True}

@app.post("/auth/logout")
async def auth_logout(response: Response, sid: Optional[str] = Cookie(default=None, alias="sid")):
    if sid:
        _SESSIONS.pop(sid, None)
    response.delete_cookie("sid", path="/")
    return {"ok": True}

@app.get("/aggregate")
async def aggregate(session=Depends(require_session)) -> Any:
    """Example endpoint aggregating data from other services."""
    token = session["access_token"]
    async with httpx.AsyncClient() as client:
        res_catalog = await client.get("http://catalog.api/products", headers={"Authorization": f"Bearer {token}"})
        res_user = await client.get("http://user.api/users", headers={"Authorization": f"Bearer {token}"})
    return {
        "products": res_catalog.json() if res_catalog.status_code == 200 else [],
        "users": res_user.json() if res_user.status_code == 200 else [],

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

# ---------------------------
# Proxied API for frontends
# ---------------------------
@app.get("/api/v1/catalog/products")
async def catalog_products(session=Depends(require_session)):
    token = session["access_token"]
    async with httpx.AsyncClient() as client:
        r = await client.get("http://catalog.api/products", headers={"Authorization": f"Bearer {token}"})
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()

# Generic pass-through for /api/v1/<service>/... so UI pages can reuse the same paths.
# This is a minimal router; in production you may want explicit per-service policies.
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

async def _proxy(request: Request, service: str, rest: str, session=Depends(require_session)):
    base = SERVICE_BASES.get(service)
    if not base:
        raise HTTPException(status_code=404, detail=f"Unknown service: {service}")
    url = f"{base}/{rest}"
    token = session["access_token"]
    method = request.method.lower()
    headers = {k: v for k, v in request.headers.items() if k.lower() not in {"host", "cookie", "content-length"}}
    headers["Authorization"] = f"Bearer {token}"
    content = await request.body()
    timeout = httpx.Timeout(30.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.request(method, url, headers=headers, content=content)
    return Response(content=resp.content, status_code=resp.status_code, headers={k: v for k, v in resp.headers.items() if k.lower() not in {"content-length", "transfer-encoding", "connection"}})

for m in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
    app.add_api_route("/api/v1/{service}/{rest:path}", _proxy, methods=[m])







import logging
import secrets
import time
from typing import Any, Dict, Optional

import os
import httpx
from urllib.parse import urlencode, urlparse
from fastapi import Cookie, Depends, FastAPI, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}', level=logging.INFO)
logger = logging.getLogger("bff")

app = FastAPI(title="BFF API", version="v1")

# In dev, explicitly list the frontend origins so cookies can be sent with credentials
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Admin
    "http://localhost:3002",  # Merchant
    "http://localhost:4000",  # Storefront
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------
# Minimal session store
# --------------------
_SESSIONS: Dict[str, Dict[str, Any]] = {}
_SESSION_TTL = 60 * 60 * 4  # 4 hours
AUTH_INTERNAL_BASE = os.getenv('AUTH_INTERNAL_BASE', 'http://auth.api')
BFF_CLIENT_ID = os.getenv('BFF_CLIENT_ID', '1')
BFF_CLIENT_SECRET = os.getenv('BFF_CLIENT_SECRET', 'secret1')
# Public base URLs used in browser redirects
AUTH_PUBLIC_BASE = os.getenv('AUTH_PUBLIC_BASE', 'http://localhost:7000')
BFF_PUBLIC_BASE = os.getenv('BFF_PUBLIC_BASE', 'http://localhost:9080')

# OIDC (authorization code + PKCE) transient store
_OIDC: Dict[str, Dict[str, Any]] = {}
_OIDC_TTL = 600

def _now() -> int:
    return int(time.time())

def _cleanup_sessions() -> None:
    now = _now()
    expired = [sid for sid, s in _SESSIONS.items() if s.get("exp", 0) <= now]
    for sid in expired:
        _SESSIONS.pop(sid, None)

def issue_session(access_token: str, expires_in: int, refresh_token: Optional[str] = None) -> str:
    sid = secrets.token_urlsafe(32)
    _SESSIONS[sid] = {
        "access_token": access_token,
        "exp": _now() + min(expires_in, _SESSION_TTL),
        "refresh_token": refresh_token,
    }
    return sid

def get_session(sid: Optional[str]) -> Dict[str, Any]:
    _cleanup_sessions()
    if not sid or sid not in _SESSIONS:
        raise HTTPException(status_code=401, detail="Not authenticated")
    sess = _SESSIONS[sid]
    if sess.get("exp", 0) <= _now():
        _SESSIONS.pop(sid, None)
        raise HTTPException(status_code=401, detail="Session expired")
    return sess

async def _refresh_if_needed(sess: Dict[str, Any]) -> Dict[str, Any]:
    # Refresh if token expires within 60 seconds
    if sess.get("exp", 0) - _now() > 60:
        return sess
    rt = sess.get("refresh_token")
    if not rt:
        return sess
    data = {
        "client_id": BFF_CLIENT_ID,
        "client_secret": BFF_CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": rt,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(f"{AUTH_INTERNAL_BASE}/connect/token", data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    if r.status_code != 200:
        return sess
    body = r.json()
    sess["access_token"] = body.get("access_token", sess.get("access_token"))
    if body.get("refresh_token"):
        sess["refresh_token"] = body.get("refresh_token")
    expires_in = int(body.get("expires_in", 3600))
    sess["exp"] = _now() + min(expires_in, _SESSION_TTL)
    return sess

async def require_session(sid: Optional[str] = Cookie(default=None, alias="sid")) -> Dict[str, Any]:
    sess = get_session(sid)
    return await _refresh_if_needed(sess)

def _is_allowed_origin(url: str) -> bool:
    try:
        p = urlparse(url)
        origin = f"{p.scheme}://{p.netloc}"
        return origin in ALLOWED_ORIGINS
    except Exception:
        return False

@app.get("/auth/oidc/login")
async def oidc_login(redirect: str = "/"):
    # build return_to
    return_to = redirect
    if not redirect.startswith("http"):
        # make absolute using first allowed origin
        base = ALLOWED_ORIGINS[0].rstrip('/')
        path = redirect if redirect.startswith('/') else f"/{redirect}"
        return_to = f"{base}{path}"
    if not _is_allowed_origin(return_to):
        return_to = f"{ALLOWED_ORIGINS[0].rstrip('/')}/"

    # PKCE
    verifier = secrets.token_urlsafe(45)
    import hashlib, base64
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    state = secrets.token_urlsafe(24)
    _OIDC[state] = {"verifier": verifier, "return_to": return_to, "exp": _now() + _OIDC_TTL}

    params = {
        "client_id": "bff-web",
        "redirect_uri": f"{BFF_PUBLIC_BASE}/auth/callback",
        "response_type": "code",
        "scope": "openid profile api1 offline_access",
        "state": state,
        "code_challenge_method": "S256",
        "code_challenge": challenge,
    }
    url = f"{AUTH_PUBLIC_BASE}/connect/authorize?{urlencode(params)}"
    return RedirectResponse(url, status_code=307)

@app.get("/auth/callback")
async def oidc_callback(code: str, state: str):
    data = _OIDC.get(state)
    if not data or data.get("exp", 0) <= _now():
        raise HTTPException(status_code=400, detail="Invalid or expired state")
    verifier = data["verifier"]
    return_to = data["return_to"]
    # one-time use
    _OIDC.pop(state, None)

    form = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": f"{BFF_PUBLIC_BASE}/auth/callback",
        "client_id": "bff-web",
        "code_verifier": verifier,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(f"{AUTH_INTERNAL_BASE}/connect/token", data=form, headers={"Content-Type": "application/x-www-form-urlencoded"})
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Token exchange failed: {r.text}")
    body = r.json()
    access_token = body.get("access_token")
    refresh_token = body.get("refresh_token")
    expires_in = int(body.get("expires_in", 3600))
    if not access_token:
        raise HTTPException(status_code=500, detail="No access token")
    sid = issue_session(access_token, expires_in, refresh_token)
    resp = RedirectResponse(return_to, status_code=302)
    resp.set_cookie(
        key="sid", value=sid, httponly=True, samesite="lax", max_age=min(expires_in, _SESSION_TTL), path="/"
    )
    return resp

# --------------------
# Auth endpoints (dev)
# --------------------
@app.post("/auth/login")
async def auth_login(response: Response, username: str, password: str):
    """
    Dev-friendly login that exchanges credentials with the Auth service (ROPC)
    and issues a short-lived HttpOnly session cookie. Frontends never see tokens.
    """
    data = {
        "client_id": BFF_CLIENT_ID,
        "client_secret": BFF_CLIENT_SECRET,
        "grant_type": "password",
        "username": username,
        "password": password,
        "scope": "api1 offline_access",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(f"{AUTH_INTERNAL_BASE}/connect/token", data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    body = r.json()
    access_token = body.get("access_token")
    expires_in = int(body.get("expires_in", 3600))
    refresh_token = body.get("refresh_token")
    if not access_token:
        raise HTTPException(status_code=500, detail="Auth server did not return access_token")
    sid = issue_session(access_token, expires_in, refresh_token)
    # HttpOnly cookie; in dev we skip Secure to work on http://localhost
    response.set_cookie(
        key="sid",
        value=sid,
        httponly=True,
        samesite="lax",
        max_age=min(expires_in, _SESSION_TTL),
        path="/",
    )
    return {"ok": True}

@app.post("/auth/logout")
async def auth_logout(response: Response, sid: Optional[str] = Cookie(default=None, alias="sid")):
    if sid:
        _SESSIONS.pop(sid, None)
    response.delete_cookie("sid", path="/")
    return {"ok": True}

@app.get("/aggregate")
async def aggregate(session=Depends(require_session)) -> Any:
    """Example endpoint aggregating data from other services."""
    token = session["access_token"]
    async with httpx.AsyncClient() as client:
        res_catalog = await client.get("http://catalog.api/products", headers={"Authorization": f"Bearer {token}"})
        res_user = await client.get("http://user.api/users", headers={"Authorization": f"Bearer {token}"})
    return {
        "products": res_catalog.json() if res_catalog.status_code == 200 else [],
        "users": res_user.json() if res_user.status_code == 200 else [],
    }

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

# ---------------------------
# Proxied API for frontends
# ---------------------------
@app.get("/api/v1/catalog/products")
async def catalog_products(session=Depends(require_session)):
    token = session["access_token"]
    async with httpx.AsyncClient() as client:
        r = await client.get("http://catalog.api/products", headers={"Authorization": f"Bearer {token}"})
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()

# Generic pass-through for /api/v1/<service>/... so UI pages can reuse the same paths.
# This is a minimal router; in production you may want explicit per-service policies.
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
    "auth": "http://auth.api",  # token endpoints are handled separately
    "security": "http://security.api:8082",
    "admin": "http://admin.api:8000",
}

async def _proxy(request: Request, service: str, rest: str, session=Depends(require_session)):
    base = SERVICE_BASES.get(service)
    if not base:
        raise HTTPException(status_code=404, detail=f"Unknown service: {service}")
    url = f"{base}/{rest}"
    token = session["access_token"]
    method = request.method.lower()
    headers = {k: v for k, v in request.headers.items() if k.lower() not in {"host", "cookie", "content-length"}}
    headers["Authorization"] = f"Bearer {token}"
    content = await request.body()
    timeout = httpx.Timeout(30.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.request(method, url, headers=headers, content=content)
    return Response(content=resp.content, status_code=resp.status_code, headers={k: v for k, v in resp.headers.items() if k.lower() not in {"content-length", "transfer-encoding", "connection"}})

for m in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
    app.add_api_route("/api/v1/{service}/{rest:path}", _proxy, methods=[m])
