import asyncio
import os
import tempfile
from importlib import reload

import app.main as tenant_main


def _new_module():
    tmp = tempfile.NamedTemporaryFile(delete=False)
    tmp.close()
    os.environ["TENANT_DB_PATH"] = tmp.name
    return reload(tenant_main)


def test_tenant_crud_and_state_updates():
    m = _new_module()
    asyncio.run(m.startup())

    tenant = asyncio.run(
        m.create_tenant(
            m.TenantCreate(
                code="shop-a",
                name="Shop A",
                region="ap-east",
                plan="pro",
                max_products=2000,
                max_users=20,
            )
        )
    )
    assert tenant.status == "active"
    tenant_id = tenant.id

    updated_status = asyncio.run(
        m.update_tenant_status(tenant_id, m.TenantStatusUpdate(status="suspended"))
    )
    assert updated_status.status == "suspended"

    reactivated = asyncio.run(
        m.update_tenant_status(tenant_id, m.TenantStatusUpdate(status="active"))
    )
    assert reactivated.status == "active"

    updated_quota = asyncio.run(
        m.update_tenant_quota(tenant_id, m.TenantQuotaUpdate(max_products=5000, max_users=50))
    )
    assert updated_quota.max_products == 5000
    assert updated_quota.max_users == 50

    updated_plan = asyncio.run(
        m.update_tenant_plan(tenant_id, m.TenantPlanUpdate(plan="enterprise"))
    )
    assert updated_plan.plan == "enterprise"
    assert updated_plan.max_products == 100000
    assert updated_plan.max_users == 1000

    usage_ok = asyncio.run(
        m.validate_usage(tenant_id, m.TenantUsageCheck(product_count=200, user_count=20))
    )
    assert usage_ok.allowed is True

    usage_fail = asyncio.run(
        m.validate_usage(tenant_id, m.TenantUsageCheck(product_count=200000, user_count=20))
    )
    assert usage_fail.allowed is False
    assert "product quota exceeded" in usage_fail.reasons

    tenants = asyncio.run(m.list_tenants(status="active"))
    assert len(tenants) == 1

    application = asyncio.run(
        m.create_onboarding_application(
            m.MerchantApplicationCreate(
                merchant_name="Shop A Ltd",
                contact_name="Alice",
                contact_email="alice@example.com",
                region="ap-east",
                qualifications=[
                    m.QualificationInput(doc_type="business_license", doc_url="https://docs.example/license-a.pdf")
                ],
            )
        )
    )
    assert application.status == "pending"
    assert len(application.qualifications) == 1

    reviewed = asyncio.run(
        m.review_onboarding_application(
            application.id,
            m.MerchantApplicationReview(reviewer="ops-admin", status="approved", note="qualified"),
        )
    )
    assert reviewed.status == "approved"

    signed = asyncio.run(m.sign_onboarding_contract(application.id, "legal-admin"))
    assert signed.contract_status == "signed"

    opened_tenant = asyncio.run(
        m.open_store(
            application.id,
            m.OpenStoreRequest(tenant_code="shop-a-store", tenant_name="Shop A Store", plan="pro"),
        )
    )
    assert opened_tenant.code == "shop-a-store"

    role = asyncio.run(
        m.create_role(
            tenant_id,
            m.RoleCreate(code="catalog_admin", name="Catalog Admin"),
        )
    )
    assert role.code == "catalog_admin"

    perms = asyncio.run(
        m.set_role_permissions(
            tenant_id,
            role.id,
            m.RolePermissionsUpdate(
                permissions=["catalog.products.read", "catalog.products.write"]
            ),
        )
    )
    assert "catalog.products.write" in perms.permissions
    fetched_role_permissions = asyncio.run(m.get_role_permissions(tenant_id, role.id))
    assert fetched_role_permissions.role_id == role.id
    assert "catalog.products.read" in fetched_role_permissions.permissions

    cloned_role = asyncio.run(
        m.clone_role(
            tenant_id,
            role.id,
            m.RoleCloneCreate(code="catalog_admin_copy", name="Catalog Admin Copy"),
        )
    )
    cloned_permissions = asyncio.run(m.get_role_permissions(tenant_id, cloned_role.id))
    assert cloned_permissions.permissions == fetched_role_permissions.permissions

    delete_result = asyncio.run(m.delete_role(tenant_id, cloned_role.id))
    assert delete_result["status"] == "deleted"
    current_roles = asyncio.run(m.list_roles(tenant_id))
    assert all(item.id != cloned_role.id for item in current_roles)

    assign = asyncio.run(
        m.assign_role_to_user(
            tenant_id,
            role.id,
            m.UserRoleAssign(user_id="user-1001"),
        )
    )
    assert assign["status"] == "assigned"

    user_permissions = asyncio.run(m.get_user_permissions(tenant_id, "user-1001"))
    assert "catalog_admin" in user_permissions.roles
    assert "catalog.products.read" in user_permissions.permissions

    granted = asyncio.run(
        m.authorize(
            tenant_id,
            m.AuthorizationCheck(user_id="user-1001", permission="catalog.products.write"),
        )
    )
    denied = asyncio.run(
        m.authorize(
            tenant_id,
            m.AuthorizationCheck(user_id="user-1001", permission="orders.write"),
        )
    )
    assert granted.allowed is True
    assert denied.allowed is False

    invitation = asyncio.run(
        m.invite_member(
            tenant_id,
            m.InviteMemberRequest(
                email="member1@example.com",
                role_code="catalog_admin",
                invited_by="ops-admin",
                expires_in_hours=24,
            ),
        )
    )
    assert invitation.status == "pending"

    accepted = asyncio.run(
        m.accept_invitation(
            tenant_id,
            invitation.id,
            m.InvitationAcceptRequest(
                token=invitation.token,
                user_id="user-2002",
                display_name="Member One",
            ),
        )
    )
    assert accepted.user_id == "user-2002"
    assert accepted.data_scope == "self"

    scoped = asyncio.run(
        m.update_member_scope(
            tenant_id,
            "user-2002",
            m.MemberScopeUpdate(data_scope="tenant", actor="ops-admin"),
        )
    )
    assert scoped.data_scope == "tenant"

    logs = asyncio.run(m.list_audit_logs(tenant_id, limit=10))
    assert len(logs) >= 2


def test_subscription_billing_and_quota_strategy():
    m = _new_module()
    asyncio.run(m.startup())

    tenant = asyncio.run(
        m.create_tenant(
            m.TenantCreate(
                code="shop-b",
                name="Shop B",
                region="ap-south",
                plan="basic",
                max_products=1000,
                max_users=10,
            )
        )
    )
    tenant_id = tenant.id

    subscription = asyncio.run(
        m.create_subscription(
            tenant_id,
            m.SubscriptionCreate(plan="pro", billing_cycle="monthly", auto_renew=True),
        )
    )
    assert subscription.plan == "pro"
    assert subscription.status == "active"

    bills = asyncio.run(m.list_bills(tenant_id))
    assert len(bills) == 1
    assert bills[0].status == "pending"

    paid = asyncio.run(
        m.pay_bill(
            tenant_id,
            bills[0].id,
            m.BillPayRequest(actor="finance-bot"),
            second_verify_token="tenant-2fa-token",
        )
    )
    assert paid.status == "paid"
    assert paid.paid_at is not None

    renewed_bill = asyncio.run(m.renew_subscription(tenant_id, subscription.id))
    assert renewed_bill.status == "pending"

    policy = asyncio.run(
        m.update_quota_policy(
            tenant_id,
            m.QuotaPolicyUpdate(strategy="grace", grace_limit_pct=20),
            second_verify_token="tenant-2fa-token",
        )
    )
    assert policy["strategy"] == "grace"

    enforce_allow = asyncio.run(
        m.enforce_usage(
            tenant_id,
            m.UsageEnforceRequest(product_count=11000, user_count=110),
        )
    )
    assert enforce_allow["allowed"] is True
    assert enforce_allow["action"] == "allow_in_grace"

    enforce_block = asyncio.run(
        m.enforce_usage(
            tenant_id,
            m.UsageEnforceRequest(product_count=13000, user_count=130),
        )
    )
    assert enforce_block["allowed"] is False
