from pydantic import BaseModel, ConfigDict, Field


class TenantCreate(BaseModel):
    code: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=128)
    region: str = Field(min_length=2, max_length=32)
    plan: str = Field(default="basic", min_length=2, max_length=32)
    max_products: int = Field(default=1000, ge=1, le=1_000_000)
    max_users: int = Field(default=10, ge=1, le=100_000)


class TenantStatusUpdate(BaseModel):
    status: str = Field(pattern="^(active|suspended)$")


class TenantQuotaUpdate(BaseModel):
    max_products: int = Field(ge=1, le=1_000_000)
    max_users: int = Field(ge=1, le=100_000)


class TenantPlanUpdate(BaseModel):
    plan: str = Field(min_length=2, max_length=32)


class TenantUsageCheck(BaseModel):
    product_count: int = Field(default=0, ge=0)
    user_count: int = Field(default=0, ge=0)


class RoleCreate(BaseModel):
    code: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=128)


class RoleOut(BaseModel):
    id: int
    tenant_id: int
    code: str
    name: str
    created_at: str
    updated_at: str


class RolePermissionsUpdate(BaseModel):
    permissions: list[str] = Field(default_factory=list)


class RolePermissionsOut(BaseModel):
    role_id: int
    permissions: list[str]


class RoleCloneCreate(BaseModel):
    code: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=128)


class QualificationInput(BaseModel):
    doc_type: str = Field(min_length=2, max_length=64)
    doc_url: str = Field(min_length=6, max_length=500)


class MerchantApplicationCreate(BaseModel):
    merchant_name: str = Field(min_length=2, max_length=128)
    contact_name: str = Field(min_length=2, max_length=128)
    contact_email: str = Field(min_length=5, max_length=256)
    region: str = Field(min_length=2, max_length=32)
    qualifications: list[QualificationInput] = Field(default_factory=list)


class MerchantApplicationReview(BaseModel):
    reviewer: str = Field(min_length=1, max_length=128)
    status: str = Field(pattern="^(approved|rejected)$")
    note: str | None = Field(default=None, max_length=500)


class OpenStoreRequest(BaseModel):
    tenant_code: str = Field(min_length=2, max_length=64)
    tenant_name: str = Field(min_length=2, max_length=128)
    plan: str = Field(default="basic", min_length=2, max_length=32)


class QualificationOut(BaseModel):
    doc_type: str
    doc_url: str


class MerchantApplicationOut(BaseModel):
    id: int
    merchant_name: str
    contact_name: str
    contact_email: str
    region: str
    status: str
    contract_status: str
    tenant_id: int | None
    reviewer: str | None
    note: str | None
    created_at: str
    updated_at: str
    qualifications: list[QualificationOut]


class InviteMemberRequest(BaseModel):
    email: str = Field(min_length=5, max_length=256)
    role_code: str = Field(min_length=2, max_length=64)
    invited_by: str = Field(min_length=1, max_length=128)
    expires_in_hours: int = Field(default=72, ge=1, le=720)


class InvitationAcceptRequest(BaseModel):
    token: str = Field(min_length=8, max_length=128)
    user_id: str = Field(min_length=1, max_length=128)
    display_name: str = Field(min_length=1, max_length=128)


class InvitationOut(BaseModel):
    id: int
    tenant_id: int
    email: str
    role_code: str
    status: str
    token: str
    invited_by: str
    expires_at: str
    created_at: str
    updated_at: str


class MemberOut(BaseModel):
    tenant_id: int
    user_id: str
    email: str
    display_name: str
    role_code: str
    status: str
    data_scope: str
    created_at: str
    updated_at: str


class MemberScopeUpdate(BaseModel):
    data_scope: str = Field(pattern="^(tenant|category|self)$")
    actor: str = Field(min_length=1, max_length=128)


class AuditLogOut(BaseModel):
    id: int
    tenant_id: int
    action: str
    target: str
    actor: str
    metadata: str
    created_at: str


class UserRoleAssign(BaseModel):
    user_id: str = Field(min_length=1, max_length=128)


class UserPermissionsOut(BaseModel):
    user_id: str
    tenant_id: int
    roles: list[str]
    permissions: list[str]


class AuthorizationCheck(BaseModel):
    user_id: str = Field(min_length=1, max_length=128)
    permission: str = Field(min_length=1, max_length=128)


class AuthorizationResult(BaseModel):
    allowed: bool
    reason: str


class TenantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    region: str
    plan: str
    status: str
    max_products: int
    max_users: int
    created_at: str
    updated_at: str


class UsageValidationResult(BaseModel):
    allowed: bool
    reasons: list[str]
    limits: dict[str, int]


class SubscriptionCreate(BaseModel):
    plan: str = Field(min_length=2, max_length=32)
    billing_cycle: str = Field(pattern="^(monthly|annual)$")
    auto_renew: bool = True


class SubscriptionOut(BaseModel):
    id: int
    tenant_id: int
    plan: str
    billing_cycle: str
    status: str
    period_start: str
    period_end: str
    auto_renew: bool
    created_at: str
    updated_at: str


class BillOut(BaseModel):
    id: int
    tenant_id: int
    subscription_id: int
    amount: float
    currency: str
    status: str
    due_at: str
    paid_at: str | None
    period_start: str
    period_end: str
    created_at: str
    updated_at: str


class BillPayRequest(BaseModel):
    actor: str = Field(min_length=1, max_length=128)


class QuotaPolicyUpdate(BaseModel):
    strategy: str = Field(pattern="^(hard_block|soft_block|grace)$")
    grace_limit_pct: int = Field(default=20, ge=0, le=500)


class UsageEnforceRequest(BaseModel):
    product_count: int = Field(default=0, ge=0)
    user_count: int = Field(default=0, ge=0)
