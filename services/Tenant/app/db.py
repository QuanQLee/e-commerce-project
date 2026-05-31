import os
import sqlite3
from datetime import datetime, timezone

from fastapi import HTTPException

from app.config import DB_PATH, SENSITIVE_OPS_TOKEN
from app.schemas import BillOut, MerchantApplicationOut, QualificationOut, SubscriptionOut, TenantOut


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _mask_email(email: str) -> str:
    parts = email.split("@")
    if len(parts) != 2:
        return "***"
    name, domain = parts
    if len(name) <= 2:
        masked_name = name[:1] + "*"
    else:
        masked_name = name[:2] + "*" * (len(name) - 2)
    return f"{masked_name}@{domain}"


def _require_second_verification(token: str | None) -> None:
    if token != SENSITIVE_OPS_TOKEN:
        raise HTTPException(status_code=403, detail="second verification failed")


def _init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tenants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                region TEXT NOT NULL,
                plan TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                max_products INTEGER NOT NULL,
                max_users INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tenant_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER NOT NULL,
                code TEXT NOT NULL,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(tenant_id, code),
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tenant_role_permissions (
                role_id INTEGER NOT NULL,
                permission TEXT NOT NULL,
                PRIMARY KEY(role_id, permission),
                FOREIGN KEY (role_id) REFERENCES tenant_roles(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tenant_user_roles (
                tenant_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                role_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY(tenant_id, user_id, role_id),
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                FOREIGN KEY (role_id) REFERENCES tenant_roles(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS merchant_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                merchant_name TEXT NOT NULL,
                contact_name TEXT NOT NULL,
                contact_email TEXT NOT NULL,
                region TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                contract_status TEXT NOT NULL DEFAULT 'unsigned',
                tenant_id INTEGER NULL,
                reviewer TEXT NULL,
                note TEXT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS merchant_qualifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                application_id INTEGER NOT NULL,
                doc_type TEXT NOT NULL,
                doc_url TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (application_id) REFERENCES merchant_applications(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tenant_invitations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER NOT NULL,
                email TEXT NOT NULL,
                role_code TEXT NOT NULL,
                status TEXT NOT NULL,
                token TEXT NOT NULL UNIQUE,
                invited_by TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tenant_members (
                tenant_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                email TEXT NOT NULL,
                display_name TEXT NOT NULL,
                role_code TEXT NOT NULL,
                status TEXT NOT NULL,
                data_scope TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY(tenant_id, user_id),
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tenant_audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                target TEXT NOT NULL,
                actor TEXT NOT NULL,
                metadata TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tenant_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER NOT NULL,
                plan TEXT NOT NULL,
                billing_cycle TEXT NOT NULL,
                status TEXT NOT NULL,
                period_start TEXT NOT NULL,
                period_end TEXT NOT NULL,
                auto_renew INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tenant_bills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER NOT NULL,
                subscription_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL DEFAULT 'CNY',
                status TEXT NOT NULL,
                due_at TEXT NOT NULL,
                paid_at TEXT NULL,
                period_start TEXT NOT NULL,
                period_end TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                FOREIGN KEY (subscription_id) REFERENCES tenant_subscriptions(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tenant_quota_policies (
                tenant_id INTEGER PRIMARY KEY,
                strategy TEXT NOT NULL,
                grace_limit_pct INTEGER NOT NULL DEFAULT 20,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            );
            """
        )
        conn.commit()


def _to_tenant(row: sqlite3.Row) -> TenantOut:
    return TenantOut(**dict(row))


def _get_tenant_or_404(tenant_id: int) -> TenantOut:
    with _conn() as conn:
        row = conn.execute("SELECT * FROM tenants WHERE id = ?", (tenant_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="tenant not found")
    return _to_tenant(row)


def _get_role_or_404(tenant_id: int, role_id: int) -> sqlite3.Row:
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM tenant_roles WHERE tenant_id = ? AND id = ?",
            (tenant_id, role_id),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="role not found")
    return row


def _get_application_or_404(application_id: int) -> sqlite3.Row:
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM merchant_applications WHERE id = ?",
            (application_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="application not found")
    return row


def _ensure_quota_policy(conn: sqlite3.Connection, tenant_id: int) -> sqlite3.Row:
    row = conn.execute(
        "SELECT * FROM tenant_quota_policies WHERE tenant_id = ?",
        (tenant_id,),
    ).fetchone()
    if row:
        return row
    now = _utc_now()
    conn.execute(
        """
        INSERT INTO tenant_quota_policies (tenant_id, strategy, grace_limit_pct, updated_at)
        VALUES (?, 'hard_block', 20, ?)
        """,
        (tenant_id, now),
    )
    return conn.execute(
        "SELECT * FROM tenant_quota_policies WHERE tenant_id = ?",
        (tenant_id,),
    ).fetchone()


def _to_subscription_out(row: sqlite3.Row) -> SubscriptionOut:
    data = dict(row)
    data["auto_renew"] = bool(data["auto_renew"])
    return SubscriptionOut(**data)


def _to_bill_out(row: sqlite3.Row) -> BillOut:
    return BillOut(**dict(row))


def _role_permissions(conn: sqlite3.Connection, role_id: int) -> list[str]:
    rows = conn.execute(
        "SELECT permission FROM tenant_role_permissions WHERE role_id = ? ORDER BY permission ASC",
        (role_id,),
    ).fetchall()
    return [row["permission"] for row in rows]


def _application_qualifications(conn: sqlite3.Connection, application_id: int) -> list[QualificationOut]:
    rows = conn.execute(
        """
        SELECT doc_type, doc_url
        FROM merchant_qualifications
        WHERE application_id = ?
        ORDER BY id ASC
        """,
        (application_id,),
    ).fetchall()
    return [QualificationOut(doc_type=row["doc_type"], doc_url=row["doc_url"]) for row in rows]


def _to_application_out(conn: sqlite3.Connection, row: sqlite3.Row) -> MerchantApplicationOut:
    return MerchantApplicationOut(
        id=int(row["id"]),
        merchant_name=row["merchant_name"],
        contact_name=row["contact_name"],
        contact_email=row["contact_email"],
        region=row["region"],
        status=row["status"],
        contract_status=row["contract_status"],
        tenant_id=row["tenant_id"],
        reviewer=row["reviewer"],
        note=row["note"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        qualifications=_application_qualifications(conn, int(row["id"])),
    )


def _insert_audit_log(
    conn: sqlite3.Connection,
    tenant_id: int,
    action: str,
    target: str,
    actor: str,
    metadata: str = "",
) -> None:
    conn.execute(
        """
        INSERT INTO tenant_audit_logs (tenant_id, action, target, actor, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (tenant_id, action, target, actor, metadata, _utc_now()),
    )
