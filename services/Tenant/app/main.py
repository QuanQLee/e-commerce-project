import logging
import os
import sqlite3
from datetime import datetime, timezone
from importlib import reload
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import app.config as tenant_config
import app.db as tenant_db

reload(tenant_config)
reload(tenant_db)

from app.config import DB_PATH, PLAN_LIMITS, PLAN_PRICING
from app.db import (
    _conn,
    _ensure_quota_policy,
    _get_application_or_404,
    _get_role_or_404,
    _get_tenant_or_404,
    _init_db,
    _insert_audit_log,
    _mask_email,
    _require_second_verification,
    _role_permissions,
    _to_application_out,
    _to_bill_out,
    _to_subscription_out,
    _to_tenant,
    _utc_now,
)
from app.schemas import (
    AuditLogOut,
    AuthorizationCheck,
    AuthorizationResult,
    BillOut,
    BillPayRequest,
    InviteMemberRequest,
    InvitationAcceptRequest,
    InvitationOut,
    MemberOut,
    MemberScopeUpdate,
    MerchantApplicationCreate,
    MerchantApplicationOut,
    MerchantApplicationReview,
    OpenStoreRequest,
    QualificationInput,
    QuotaPolicyUpdate,
    RoleCloneCreate,
    RoleCreate,
    RoleOut,
    RolePermissionsOut,
    RolePermissionsUpdate,
    SubscriptionCreate,
    SubscriptionOut,
    TenantCreate,
    TenantOut,
    TenantPlanUpdate,
    TenantQuotaUpdate,
    TenantStatusUpdate,
    TenantUsageCheck,
    UsageEnforceRequest,
    UsageValidationResult,
    UserPermissionsOut,
    UserRoleAssign,
)

logging.basicConfig(format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}', level=logging.INFO)
logger = logging.getLogger("tenant")

app = FastAPI(title="Tenant API", version="v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup() -> None:
    _init_db()
    logger.info("tenant_db_ready", extra={"path": DB_PATH})


@app.post("/tenants", response_model=TenantOut, status_code=201)
async def create_tenant(payload: TenantCreate) -> TenantOut:
    now = _utc_now()
    try:
        with _conn() as conn:
            cursor = conn.execute(
                """
                INSERT INTO tenants (code, name, region, plan, status, max_products, max_users, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)
                """,
                (
                    payload.code.strip(),
                    payload.name.strip(),
                    payload.region.strip(),
                    payload.plan.strip(),
                    payload.max_products,
                    payload.max_users,
                    now,
                    now,
                ),
            )
            conn.commit()
            tenant_id = int(cursor.lastrowid)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="tenant code already exists")

    tenant = _get_tenant_or_404(tenant_id)
    logger.info("tenant_created", extra={"tenant_id": tenant.id, "code": tenant.code})
    return tenant


@app.get("/tenants", response_model=list[TenantOut])
async def list_tenants(status: str | None = None, region: str | None = None) -> list[TenantOut]:
    clauses: list[str] = []
    params: list[Any] = []
    if status:
        clauses.append("status = ?")
        params.append(status)
    if region:
        clauses.append("region = ?")
        params.append(region)

    where = ""
    if clauses:
        where = f" WHERE {' AND '.join(clauses)}"

    with _conn() as conn:
        rows = conn.execute(f"SELECT * FROM tenants{where} ORDER BY id ASC", params).fetchall()
    return [_to_tenant(row) for row in rows]


@app.get("/tenants/{tenant_id}", response_model=TenantOut)
async def get_tenant(tenant_id: int) -> TenantOut:
    return _get_tenant_or_404(tenant_id)


@app.patch("/tenants/{tenant_id}/status", response_model=TenantOut)
async def update_tenant_status(tenant_id: int, payload: TenantStatusUpdate) -> TenantOut:
    _get_tenant_or_404(tenant_id)
    now = _utc_now()
    with _conn() as conn:
        conn.execute(
            "UPDATE tenants SET status = ?, updated_at = ? WHERE id = ?",
            (payload.status, now, tenant_id),
        )
        conn.commit()
    logger.info("tenant_status_updated", extra={"tenant_id": tenant_id, "status": payload.status})
    return _get_tenant_or_404(tenant_id)


@app.patch("/tenants/{tenant_id}/quota", response_model=TenantOut)
async def update_tenant_quota(tenant_id: int, payload: TenantQuotaUpdate) -> TenantOut:
    _get_tenant_or_404(tenant_id)
    now = _utc_now()
    with _conn() as conn:
        conn.execute(
            "UPDATE tenants SET max_products = ?, max_users = ?, updated_at = ? WHERE id = ?",
            (payload.max_products, payload.max_users, now, tenant_id),
        )
        conn.commit()
    logger.info(
        "tenant_quota_updated",
        extra={
            "tenant_id": tenant_id,
            "max_products": payload.max_products,
            "max_users": payload.max_users,
        },
    )
    return _get_tenant_or_404(tenant_id)


@app.patch("/tenants/{tenant_id}/plan", response_model=TenantOut)
async def update_tenant_plan(tenant_id: int, payload: TenantPlanUpdate) -> TenantOut:
    _get_tenant_or_404(tenant_id)
    normalized = payload.plan.strip().lower()
    if normalized not in PLAN_LIMITS:
        raise HTTPException(status_code=400, detail=f"unsupported plan: {normalized}")

    max_products, max_users = PLAN_LIMITS[normalized]
    now = _utc_now()
    with _conn() as conn:
        conn.execute(
            "UPDATE tenants SET plan = ?, max_products = ?, max_users = ?, updated_at = ? WHERE id = ?",
            (normalized, max_products, max_users, now, tenant_id),
        )
        conn.commit()
    logger.info("tenant_plan_updated", extra={"tenant_id": tenant_id, "plan": normalized})
    return _get_tenant_or_404(tenant_id)


@app.post("/tenants/{tenant_id}/usage/validate", response_model=UsageValidationResult)
async def validate_usage(tenant_id: int, payload: TenantUsageCheck) -> UsageValidationResult:
    tenant = _get_tenant_or_404(tenant_id)
    reasons: list[str] = []
    if tenant.status != "active":
        reasons.append("tenant is not active")
    if payload.product_count > tenant.max_products:
        reasons.append("product quota exceeded")
    if payload.user_count > tenant.max_users:
        reasons.append("user quota exceeded")

    return UsageValidationResult(
        allowed=len(reasons) == 0,
        reasons=reasons,
        limits={"max_products": tenant.max_products, "max_users": tenant.max_users},
    )


@app.post("/onboarding/applications", response_model=MerchantApplicationOut, status_code=201)
async def create_onboarding_application(payload: MerchantApplicationCreate) -> MerchantApplicationOut:
    now = _utc_now()
    with _conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO merchant_applications (
                merchant_name, contact_name, contact_email, region,
                status, contract_status, tenant_id, reviewer, note, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, 'pending', 'unsigned', NULL, NULL, NULL, ?, ?)
            """,
            (
                payload.merchant_name.strip(),
                payload.contact_name.strip(),
                payload.contact_email.strip().lower(),
                payload.region.strip(),
                now,
                now,
            ),
        )
        application_id = int(cursor.lastrowid)
        for item in payload.qualifications:
            conn.execute(
                """
                INSERT INTO merchant_qualifications (application_id, doc_type, doc_url, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (application_id, item.doc_type.strip(), item.doc_url.strip(), now),
            )
        conn.commit()
        row = conn.execute("SELECT * FROM merchant_applications WHERE id = ?", (application_id,)).fetchone()
        return _to_application_out(conn, row)


@app.get("/onboarding/applications", response_model=list[MerchantApplicationOut])
async def list_onboarding_applications(status: str | None = None) -> list[MerchantApplicationOut]:
    params: list[Any] = []
    where = ""
    if status:
        where = " WHERE status = ?"
        params.append(status)
    with _conn() as conn:
        rows = conn.execute(f"SELECT * FROM merchant_applications{where} ORDER BY id DESC", params).fetchall()
        return [_to_application_out(conn, row) for row in rows]


@app.get("/onboarding/applications/{application_id}", response_model=MerchantApplicationOut)
async def get_onboarding_application(application_id: int) -> MerchantApplicationOut:
    with _conn() as conn:
        row = conn.execute("SELECT * FROM merchant_applications WHERE id = ?", (application_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="application not found")
        return _to_application_out(conn, row)


@app.post("/onboarding/applications/{application_id}/review", response_model=MerchantApplicationOut)
async def review_onboarding_application(
    application_id: int,
    payload: MerchantApplicationReview,
) -> MerchantApplicationOut:
    _get_application_or_404(application_id)
    now = _utc_now()
    with _conn() as conn:
        conn.execute(
            """
            UPDATE merchant_applications
            SET status = ?, reviewer = ?, note = ?, updated_at = ?
            WHERE id = ?
            """,
            (payload.status, payload.reviewer.strip(), payload.note, now, application_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM merchant_applications WHERE id = ?", (application_id,)).fetchone()
        return _to_application_out(conn, row)


@app.post("/onboarding/applications/{application_id}/contract/sign", response_model=MerchantApplicationOut)
async def sign_onboarding_contract(application_id: int, actor: str) -> MerchantApplicationOut:
    application = _get_application_or_404(application_id)
    if application["status"] != "approved":
        raise HTTPException(status_code=400, detail="application must be approved before contract signing")
    now = _utc_now()
    with _conn() as conn:
        conn.execute(
            """
            UPDATE merchant_applications
            SET contract_status = 'signed', updated_at = ?, note = COALESCE(note, '') || ?
            WHERE id = ?
            """,
            (now, f" | contract signed by {actor}", application_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM merchant_applications WHERE id = ?", (application_id,)).fetchone()
        return _to_application_out(conn, row)


@app.post("/onboarding/applications/{application_id}/open-store", response_model=TenantOut)
async def open_store(application_id: int, payload: OpenStoreRequest) -> TenantOut:
    application = _get_application_or_404(application_id)
    if application["status"] != "approved":
        raise HTTPException(status_code=400, detail="application must be approved before opening store")
    if application["contract_status"] != "signed":
        raise HTTPException(status_code=400, detail="contract must be signed before opening store")
    if application["tenant_id"] is not None:
        return _get_tenant_or_404(int(application["tenant_id"]))

    plan = payload.plan.strip().lower()
    if plan not in PLAN_LIMITS:
        raise HTTPException(status_code=400, detail=f"unsupported plan: {plan}")
    max_products, max_users = PLAN_LIMITS[plan]
    now = _utc_now()
    try:
        with _conn() as conn:
            cursor = conn.execute(
                """
                INSERT INTO tenants (code, name, region, plan, status, max_products, max_users, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)
                """,
                (
                    payload.tenant_code.strip(),
                    payload.tenant_name.strip(),
                    application["region"],
                    plan,
                    max_products,
                    max_users,
                    now,
                    now,
                ),
            )
            tenant_id = int(cursor.lastrowid)
            conn.execute(
                """
                UPDATE merchant_applications
                SET status = 'store_opened', tenant_id = ?, updated_at = ?
                WHERE id = ?
                """,
                (tenant_id, now, application_id),
            )
            conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="tenant code already exists")
    return _get_tenant_or_404(tenant_id)


@app.post("/tenants/{tenant_id}/rbac/roles", response_model=RoleOut, status_code=201)
async def create_role(tenant_id: int, payload: RoleCreate) -> RoleOut:
    _get_tenant_or_404(tenant_id)
    now = _utc_now()
    code = payload.code.strip().lower()
    name = payload.name.strip()
    try:
        with _conn() as conn:
            cursor = conn.execute(
                """
                INSERT INTO tenant_roles (tenant_id, code, name, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (tenant_id, code, name, now, now),
            )
            conn.commit()
            role_id = int(cursor.lastrowid)
            row = conn.execute("SELECT * FROM tenant_roles WHERE id = ?", (role_id,)).fetchone()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="role code already exists")
    return RoleOut(**dict(row))


@app.get("/tenants/{tenant_id}/rbac/roles", response_model=list[RoleOut])
async def list_roles(tenant_id: int) -> list[RoleOut]:
    _get_tenant_or_404(tenant_id)
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM tenant_roles WHERE tenant_id = ? ORDER BY code ASC",
            (tenant_id,),
        ).fetchall()
    return [RoleOut(**dict(row)) for row in rows]


@app.get("/tenants/{tenant_id}/rbac/roles/{role_id}/permissions", response_model=RolePermissionsOut)
async def get_role_permissions(tenant_id: int, role_id: int) -> RolePermissionsOut:
    _get_tenant_or_404(tenant_id)
    _get_role_or_404(tenant_id, role_id)
    with _conn() as conn:
        current = _role_permissions(conn, role_id)
    return RolePermissionsOut(role_id=role_id, permissions=current)


@app.post("/tenants/{tenant_id}/rbac/roles/{role_id}/clone", response_model=RoleOut, status_code=201)
async def clone_role(tenant_id: int, role_id: int, payload: RoleCloneCreate) -> RoleOut:
    _get_tenant_or_404(tenant_id)
    _get_role_or_404(tenant_id, role_id)

    now = _utc_now()
    new_code = payload.code.strip().lower()
    new_name = payload.name.strip()
    try:
        with _conn() as conn:
            cursor = conn.execute(
                """
                INSERT INTO tenant_roles (tenant_id, code, name, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (tenant_id, new_code, new_name, now, now),
            )
            new_role_id = int(cursor.lastrowid)
            source_permissions = _role_permissions(conn, role_id)
            for permission in source_permissions:
                conn.execute(
                    "INSERT INTO tenant_role_permissions (role_id, permission) VALUES (?, ?)",
                    (new_role_id, permission),
                )
            conn.commit()
            row = conn.execute("SELECT * FROM tenant_roles WHERE id = ?", (new_role_id,)).fetchone()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="role code already exists")

    return RoleOut(**dict(row))


@app.put("/tenants/{tenant_id}/rbac/roles/{role_id}/permissions")
async def set_role_permissions(
    tenant_id: int,
    role_id: int,
    payload: RolePermissionsUpdate,
) -> RolePermissionsOut:
    _get_tenant_or_404(tenant_id)
    _get_role_or_404(tenant_id, role_id)

    cleaned = sorted({item.strip() for item in payload.permissions if item and item.strip()})
    with _conn() as conn:
        conn.execute("DELETE FROM tenant_role_permissions WHERE role_id = ?", (role_id,))
        for permission in cleaned:
            conn.execute(
                "INSERT INTO tenant_role_permissions (role_id, permission) VALUES (?, ?)",
                (role_id, permission),
            )
        conn.execute(
            "UPDATE tenant_roles SET updated_at = ? WHERE id = ?",
            (_utc_now(), role_id),
        )
        conn.commit()
        current = _role_permissions(conn, role_id)
    return RolePermissionsOut(role_id=role_id, permissions=current)


@app.delete("/tenants/{tenant_id}/rbac/roles/{role_id}")
async def delete_role(tenant_id: int, role_id: int) -> dict[str, str]:
    _get_tenant_or_404(tenant_id)
    _get_role_or_404(tenant_id, role_id)
    with _conn() as conn:
        conn.execute("DELETE FROM tenant_roles WHERE tenant_id = ? AND id = ?", (tenant_id, role_id))
        conn.commit()
    return {"status": "deleted"}


@app.post("/tenants/{tenant_id}/rbac/roles/{role_id}/assign")
async def assign_role_to_user(tenant_id: int, role_id: int, payload: UserRoleAssign) -> dict[str, str]:
    _get_tenant_or_404(tenant_id)
    _get_role_or_404(tenant_id, role_id)
    user_id = payload.user_id.strip()
    now = _utc_now()
    with _conn() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO tenant_user_roles (tenant_id, user_id, role_id, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (tenant_id, user_id, role_id, now),
        )
        conn.commit()
    return {"status": "assigned"}


@app.delete("/tenants/{tenant_id}/rbac/roles/{role_id}/assign/{user_id}")
async def unassign_role_from_user(tenant_id: int, role_id: int, user_id: str) -> dict[str, str]:
    _get_tenant_or_404(tenant_id)
    _get_role_or_404(tenant_id, role_id)
    with _conn() as conn:
        conn.execute(
            """
            DELETE FROM tenant_user_roles
            WHERE tenant_id = ? AND role_id = ? AND user_id = ?
            """,
            (tenant_id, role_id, user_id.strip()),
        )
        conn.commit()
    return {"status": "unassigned"}


@app.get("/tenants/{tenant_id}/rbac/users/{user_id}/permissions", response_model=UserPermissionsOut)
async def get_user_permissions(tenant_id: int, user_id: str) -> UserPermissionsOut:
    _get_tenant_or_404(tenant_id)
    with _conn() as conn:
        role_rows = conn.execute(
            """
            SELECT r.id, r.code
            FROM tenant_roles r
            JOIN tenant_user_roles ur ON ur.role_id = r.id
            WHERE ur.tenant_id = ? AND ur.user_id = ?
            ORDER BY r.code ASC
            """,
            (tenant_id, user_id.strip()),
        ).fetchall()
        role_codes = [row["code"] for row in role_rows]

        permissions: set[str] = set()
        for row in role_rows:
            permissions.update(_role_permissions(conn, int(row["id"])))
    return UserPermissionsOut(
        user_id=user_id.strip(),
        tenant_id=tenant_id,
        roles=role_codes,
        permissions=sorted(permissions),
    )


@app.post("/tenants/{tenant_id}/rbac/authorize", response_model=AuthorizationResult)
async def authorize(tenant_id: int, payload: AuthorizationCheck) -> AuthorizationResult:
    user_permissions = await get_user_permissions(tenant_id, payload.user_id)
    if payload.permission in user_permissions.permissions:
        return AuthorizationResult(allowed=True, reason="granted_by_role")
    return AuthorizationResult(allowed=False, reason="missing_permission")


@app.post("/tenants/{tenant_id}/org/invitations", response_model=InvitationOut, status_code=201)
async def invite_member(tenant_id: int, payload: InviteMemberRequest) -> InvitationOut:
    _get_tenant_or_404(tenant_id)
    now = datetime.now(timezone.utc)
    expires_at = now.timestamp() + payload.expires_in_hours * 3600
    expires_iso = datetime.fromtimestamp(expires_at, timezone.utc).isoformat()
    token = os.urandom(16).hex()
    with _conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO tenant_invitations (
                tenant_id, email, role_code, status, token, invited_by, expires_at, created_at, updated_at
            )
            VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)
            """,
            (
                tenant_id,
                payload.email.strip().lower(),
                payload.role_code.strip().lower(),
                token,
                payload.invited_by.strip(),
                expires_iso,
                now.isoformat(),
                now.isoformat(),
            ),
        )
        invitation_id = int(cursor.lastrowid)
        _insert_audit_log(
            conn,
            tenant_id,
            "org.invite_member",
            f"invitation:{invitation_id}",
            payload.invited_by.strip(),
            f"email={payload.email.strip().lower()},role={payload.role_code.strip().lower()}",
        )
        conn.commit()
        row = conn.execute("SELECT * FROM tenant_invitations WHERE id = ?", (invitation_id,)).fetchone()
    return InvitationOut(**dict(row))


@app.get("/tenants/{tenant_id}/org/invitations", response_model=list[InvitationOut])
async def list_invitations(
    tenant_id: int,
    status: str | None = None,
    masked: bool = False,
) -> list[InvitationOut]:
    _get_tenant_or_404(tenant_id)
    params: list[Any] = [tenant_id]
    where = " WHERE tenant_id = ?"
    if status:
        where += " AND status = ?"
        params.append(status)
    with _conn() as conn:
        rows = conn.execute(f"SELECT * FROM tenant_invitations{where} ORDER BY id DESC", params).fetchall()
        output: list[InvitationOut] = []
        for row in rows:
            data = dict(row)
            if masked:
                data["email"] = _mask_email(data["email"])
                data["token"] = "***"
            output.append(InvitationOut(**data))
        return output


@app.post("/tenants/{tenant_id}/org/invitations/{invitation_id}/accept", response_model=MemberOut)
async def accept_invitation(tenant_id: int, invitation_id: int, payload: InvitationAcceptRequest) -> MemberOut:
    _get_tenant_or_404(tenant_id)
    with _conn() as conn:
        invitation = conn.execute(
            "SELECT * FROM tenant_invitations WHERE tenant_id = ? AND id = ?",
            (tenant_id, invitation_id),
        ).fetchone()
        if not invitation:
            raise HTTPException(status_code=404, detail="invitation not found")
        if invitation["status"] != "pending":
            raise HTTPException(status_code=400, detail="invitation is not pending")
        if invitation["token"] != payload.token:
            raise HTTPException(status_code=400, detail="invalid invitation token")
        if datetime.fromisoformat(invitation["expires_at"]).timestamp() < datetime.now(timezone.utc).timestamp():
            raise HTTPException(status_code=400, detail="invitation expired")

        now = _utc_now()
        conn.execute(
            """
            INSERT INTO tenant_members (
                tenant_id, user_id, email, display_name, role_code, status, data_scope, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, 'active', 'self', ?, ?)
            ON CONFLICT(tenant_id, user_id) DO UPDATE SET
                email = excluded.email,
                display_name = excluded.display_name,
                role_code = excluded.role_code,
                status = 'active',
                updated_at = excluded.updated_at
            """,
            (
                tenant_id,
                payload.user_id.strip(),
                invitation["email"],
                payload.display_name.strip(),
                invitation["role_code"],
                now,
                now,
            ),
        )
        conn.execute(
            "UPDATE tenant_invitations SET status = 'accepted', updated_at = ? WHERE id = ?",
            (now, invitation_id),
        )
        _insert_audit_log(
            conn,
            tenant_id,
            "org.accept_invitation",
            f"member:{payload.user_id.strip()}",
            payload.user_id.strip(),
            f"invitation={invitation_id}",
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM tenant_members WHERE tenant_id = ? AND user_id = ?",
            (tenant_id, payload.user_id.strip()),
        ).fetchone()
    return MemberOut(**dict(row))


@app.get("/tenants/{tenant_id}/org/members", response_model=list[MemberOut])
async def list_members(tenant_id: int, masked: bool = False) -> list[MemberOut]:
    _get_tenant_or_404(tenant_id)
    with _conn() as conn:
        rows = conn.execute(
            """
            SELECT * FROM tenant_members
            WHERE tenant_id = ?
            ORDER BY created_at ASC
            """,
            (tenant_id,),
        ).fetchall()
        output: list[MemberOut] = []
        for row in rows:
            data = dict(row)
            if masked:
                data["email"] = _mask_email(data["email"])
            output.append(MemberOut(**data))
        return output


@app.patch("/tenants/{tenant_id}/org/members/{user_id}/scope", response_model=MemberOut)
async def update_member_scope(tenant_id: int, user_id: str, payload: MemberScopeUpdate) -> MemberOut:
    _get_tenant_or_404(tenant_id)
    now = _utc_now()
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM tenant_members WHERE tenant_id = ? AND user_id = ?",
            (tenant_id, user_id.strip()),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="member not found")
        conn.execute(
            """
            UPDATE tenant_members
            SET data_scope = ?, updated_at = ?
            WHERE tenant_id = ? AND user_id = ?
            """,
            (payload.data_scope, now, tenant_id, user_id.strip()),
        )
        _insert_audit_log(
            conn,
            tenant_id,
            "org.update_member_scope",
            f"member:{user_id.strip()}",
            payload.actor.strip(),
            f"data_scope={payload.data_scope}",
        )
        conn.commit()
        updated = conn.execute(
            "SELECT * FROM tenant_members WHERE tenant_id = ? AND user_id = ?",
            (tenant_id, user_id.strip()),
        ).fetchone()
    return MemberOut(**dict(updated))


@app.delete("/tenants/{tenant_id}/org/members/{user_id}")
async def remove_member(
    tenant_id: int,
    user_id: str,
    actor: str,
    second_verify_token: str | None = None,
) -> dict[str, str]:
    _require_second_verification(second_verify_token)
    _get_tenant_or_404(tenant_id)
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM tenant_members WHERE tenant_id = ? AND user_id = ?",
            (tenant_id, user_id.strip()),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="member not found")
        conn.execute(
            "DELETE FROM tenant_members WHERE tenant_id = ? AND user_id = ?",
            (tenant_id, user_id.strip()),
        )
        _insert_audit_log(
            conn,
            tenant_id,
            "org.remove_member",
            f"member:{user_id.strip()}",
            actor.strip(),
            "",
        )
        conn.commit()
    return {"status": "removed"}


@app.get("/tenants/{tenant_id}/org/audit-logs", response_model=list[AuditLogOut])
async def list_audit_logs(tenant_id: int, limit: int = 100) -> list[AuditLogOut]:
    _get_tenant_or_404(tenant_id)
    safe_limit = max(1, min(limit, 1000))
    with _conn() as conn:
        rows = conn.execute(
            """
            SELECT * FROM tenant_audit_logs
            WHERE tenant_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (tenant_id, safe_limit),
        ).fetchall()
        return [AuditLogOut(**dict(row)) for row in rows]


@app.post("/tenants/{tenant_id}/subscriptions", response_model=SubscriptionOut, status_code=201)
async def create_subscription(tenant_id: int, payload: SubscriptionCreate) -> SubscriptionOut:
    _get_tenant_or_404(tenant_id)
    plan = payload.plan.strip().lower()
    if plan not in PLAN_LIMITS:
        raise HTTPException(status_code=400, detail=f"unsupported plan: {plan}")

    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat()
    days = 30 if payload.billing_cycle == "monthly" else 365
    period_end = (now_dt.timestamp() + days * 24 * 3600)
    period_end_iso = datetime.fromtimestamp(period_end, timezone.utc).isoformat()

    amount = PLAN_PRICING[plan] if payload.billing_cycle == "monthly" else round(PLAN_PRICING[plan] * 10, 2)
    max_products, max_users = PLAN_LIMITS[plan]
    due_at = now

    with _conn() as conn:
        conn.execute(
            "UPDATE tenant_subscriptions SET status = 'expired', updated_at = ? WHERE tenant_id = ? AND status = 'active'",
            (now, tenant_id),
        )
        cursor = conn.execute(
            """
            INSERT INTO tenant_subscriptions (
                tenant_id, plan, billing_cycle, status, period_start, period_end, auto_renew, created_at, updated_at
            ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)
            """,
            (tenant_id, plan, payload.billing_cycle, int(payload.auto_renew), now, period_end_iso, now, now),
        )
        subscription_id = int(cursor.lastrowid)
        conn.execute(
            """
            INSERT INTO tenant_bills (
                tenant_id, subscription_id, amount, currency, status, due_at, paid_at,
                period_start, period_end, created_at, updated_at
            ) VALUES (?, ?, ?, 'CNY', 'pending', ?, NULL, ?, ?, ?, ?)
            """,
            (tenant_id, subscription_id, amount, due_at, now, period_end_iso, now, now),
        )
        conn.execute(
            """
            UPDATE tenants
            SET plan = ?, max_products = ?, max_users = ?, updated_at = ?
            WHERE id = ?
            """,
            (plan, max_products, max_users, now, tenant_id),
        )
        _ensure_quota_policy(conn, tenant_id)
        conn.commit()
        row = conn.execute("SELECT * FROM tenant_subscriptions WHERE id = ?", (subscription_id,)).fetchone()
    return _to_subscription_out(row)


@app.get("/tenants/{tenant_id}/subscriptions/current", response_model=SubscriptionOut)
async def current_subscription(tenant_id: int) -> SubscriptionOut:
    _get_tenant_or_404(tenant_id)
    with _conn() as conn:
        row = conn.execute(
            """
            SELECT * FROM tenant_subscriptions
            WHERE tenant_id = ? AND status = 'active'
            ORDER BY id DESC LIMIT 1
            """,
            (tenant_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="active subscription not found")
    return _to_subscription_out(row)


@app.post("/tenants/{tenant_id}/subscriptions/{subscription_id}/renew", response_model=BillOut)
async def renew_subscription(tenant_id: int, subscription_id: int) -> BillOut:
    _get_tenant_or_404(tenant_id)
    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat()
    with _conn() as conn:
        sub = conn.execute(
            "SELECT * FROM tenant_subscriptions WHERE tenant_id = ? AND id = ?",
            (tenant_id, subscription_id),
        ).fetchone()
        if not sub:
            raise HTTPException(status_code=404, detail="subscription not found")
        if sub["status"] != "active":
            raise HTTPException(status_code=400, detail="subscription is not active")

        days = 30 if sub["billing_cycle"] == "monthly" else 365
        next_end_ts = datetime.fromisoformat(sub["period_end"]).timestamp() + days * 24 * 3600
        next_end = datetime.fromtimestamp(next_end_ts, timezone.utc).isoformat()
        amount = PLAN_PRICING[sub["plan"]] if sub["billing_cycle"] == "monthly" else round(PLAN_PRICING[sub["plan"]] * 10, 2)

        conn.execute(
            "UPDATE tenant_subscriptions SET period_end = ?, updated_at = ? WHERE id = ?",
            (next_end, now, subscription_id),
        )
        cursor = conn.execute(
            """
            INSERT INTO tenant_bills (
                tenant_id, subscription_id, amount, currency, status, due_at, paid_at,
                period_start, period_end, created_at, updated_at
            ) VALUES (?, ?, ?, 'CNY', 'pending', ?, NULL, ?, ?, ?, ?)
            """,
            (tenant_id, subscription_id, amount, now, sub["period_end"], next_end, now, now),
        )
        bill_id = int(cursor.lastrowid)
        conn.commit()
        bill = conn.execute("SELECT * FROM tenant_bills WHERE id = ?", (bill_id,)).fetchone()
    return _to_bill_out(bill)


@app.get("/tenants/{tenant_id}/billing/bills", response_model=list[BillOut])
async def list_bills(tenant_id: int, status: str | None = None) -> list[BillOut]:
    _get_tenant_or_404(tenant_id)
    params: list[Any] = [tenant_id]
    where = " WHERE tenant_id = ?"
    if status:
        where += " AND status = ?"
        params.append(status)
    with _conn() as conn:
        rows = conn.execute(f"SELECT * FROM tenant_bills{where} ORDER BY id DESC", params).fetchall()
    return [_to_bill_out(row) for row in rows]


@app.post("/tenants/{tenant_id}/billing/bills/{bill_id}/pay", response_model=BillOut)
async def pay_bill(
    tenant_id: int,
    bill_id: int,
    payload: BillPayRequest,
    second_verify_token: str | None = None,
) -> BillOut:
    _require_second_verification(second_verify_token)
    _get_tenant_or_404(tenant_id)
    now = _utc_now()
    with _conn() as conn:
        bill = conn.execute(
            "SELECT * FROM tenant_bills WHERE tenant_id = ? AND id = ?",
            (tenant_id, bill_id),
        ).fetchone()
        if not bill:
            raise HTTPException(status_code=404, detail="bill not found")
        if bill["status"] == "paid":
            return _to_bill_out(bill)
        conn.execute(
            "UPDATE tenant_bills SET status = 'paid', paid_at = ?, updated_at = ? WHERE id = ?",
            (now, now, bill_id),
        )
        _insert_audit_log(conn, tenant_id, "billing.pay_bill", f"bill:{bill_id}", payload.actor.strip(), "")
        conn.commit()
        updated = conn.execute("SELECT * FROM tenant_bills WHERE id = ?", (bill_id,)).fetchone()
    return _to_bill_out(updated)


@app.put("/tenants/{tenant_id}/quota/policy")
async def update_quota_policy(
    tenant_id: int,
    payload: QuotaPolicyUpdate,
    second_verify_token: str | None = None,
) -> dict[str, Any]:
    _require_second_verification(second_verify_token)
    _get_tenant_or_404(tenant_id)
    now = _utc_now()
    with _conn() as conn:
        _ensure_quota_policy(conn, tenant_id)
        conn.execute(
            """
            UPDATE tenant_quota_policies
            SET strategy = ?, grace_limit_pct = ?, updated_at = ?
            WHERE tenant_id = ?
            """,
            (payload.strategy, payload.grace_limit_pct, now, tenant_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM tenant_quota_policies WHERE tenant_id = ?", (tenant_id,)).fetchone()
    return dict(row)


@app.post("/tenants/{tenant_id}/usage/enforce")
async def enforce_usage(tenant_id: int, payload: UsageEnforceRequest) -> dict[str, Any]:
    tenant = _get_tenant_or_404(tenant_id)
    over_products = payload.product_count - tenant.max_products
    over_users = payload.user_count - tenant.max_users
    with _conn() as conn:
        policy = _ensure_quota_policy(conn, tenant_id)
        conn.commit()

    if over_products <= 0 and over_users <= 0:
        return {"allowed": True, "action": "allow", "reason": "within_quota"}

    strategy = policy["strategy"]
    grace_limit_pct = int(policy["grace_limit_pct"])
    grace_products = int(tenant.max_products * grace_limit_pct / 100)
    grace_users = int(tenant.max_users * grace_limit_pct / 100)

    within_grace = over_products <= grace_products and over_users <= grace_users
    if strategy == "hard_block":
        return {"allowed": False, "action": "block", "reason": "quota_exceeded_hard_block"}
    if strategy == "soft_block":
        return {"allowed": True, "action": "allow_with_warning", "reason": "quota_exceeded_soft_block"}
    if strategy == "grace" and within_grace:
        return {"allowed": True, "action": "allow_in_grace", "reason": "within_grace_limit"}
    return {"allowed": False, "action": "block", "reason": "quota_exceeded_grace_limit"}


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}
