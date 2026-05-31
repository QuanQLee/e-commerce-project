import os
import pathlib
import sys

TEST_DB = os.path.join(os.path.dirname(__file__), "test.db")
if os.path.exists(TEST_DB):
    os.remove(TEST_DB)

os.environ.setdefault("POSTGRES_DSN", f"sqlite:///{TEST_DB}")

# Ensure this service's app package is first on sys.path to avoid conflicts.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from app.main import app, init_db

client = TestClient(app)
init_db()


def test_reserve_and_release():
    headers = {"X-Tenant-Id": "tenant-a"}
    r = client.get("/inventory/product1", headers=headers)
    assert r.status_code == 200
    assert r.json()["quantity"] == 0

    r = client.post(
        "/inventory/release", json={"product_id": "product1", "quantity": 10}, headers=headers
    )
    assert r.status_code == 200

    r = client.get("/inventory/product1", headers=headers)
    assert r.json()["quantity"] == 10

    r = client.post(
        "/inventory/reserve", json={"product_id": "product1", "quantity": 4}, headers=headers
    )
    assert r.status_code == 200

    r = client.get("/inventory/product1", headers=headers)
    assert r.json()["quantity"] == 6

    other_tenant = client.get("/inventory/product1", headers={"X-Tenant-Id": "tenant-b"})
    assert other_tenant.status_code == 200
    assert other_tenant.json()["quantity"] == 0


def test_preallocate_deduct_consistency_with_multi_warehouse():
    headers = {"X-Tenant-Id": "tenant-a"}
    client.post(
        "/inventory/stock/set",
        json={"warehouse_id": "cn-east", "product_id": "sku-1", "quantity": 20},
        headers=headers,
    )
    client.post(
        "/inventory/stock/set",
        json={"warehouse_id": "cn-east", "product_id": "sku-2", "quantity": 10},
        headers=headers,
    )

    pre = client.post(
        "/inventory/preallocate",
        json={
            "order_id": "ORD-1001",
            "shipping_region": "CN",
            "items": [
                {"product_id": "sku-1", "quantity": 3},
                {"product_id": "sku-2", "quantity": 2},
            ],
        },
        headers=headers,
    )
    assert pre.status_code == 200
    assert pre.json()["warehouse_id"] == "cn-east"

    before_deduct = client.get("/inventory/sku-1", params={"warehouse_id": "cn-east"}, headers=headers).json()
    assert before_deduct["quantity"] == 20
    assert before_deduct["reserved"] == 3

    deduct = client.post("/inventory/deduct", json={"order_id": "ORD-1001"}, headers=headers)
    assert deduct.status_code == 200

    after_deduct = client.get("/inventory/sku-1", params={"warehouse_id": "cn-east"}, headers=headers).json()
    assert after_deduct["quantity"] == 17
    assert after_deduct["reserved"] == 0


def test_release_preallocation():
    headers = {"X-Tenant-Id": "tenant-a"}
    client.post(
        "/inventory/stock/set",
        json={"warehouse_id": "us-west", "product_id": "sku-3", "quantity": 8},
        headers=headers,
    )

    pre = client.post(
        "/inventory/preallocate",
        json={
            "order_id": "ORD-2002",
            "shipping_region": "US",
            "items": [{"product_id": "sku-3", "quantity": 4}],
        },
        headers=headers,
    )
    assert pre.status_code == 200

    rel = client.post("/inventory/release-preallocation", json={"order_id": "ORD-2002"}, headers=headers)
    assert rel.status_code == 200

    inv = client.get("/inventory/sku-3", params={"warehouse_id": "us-west"}, headers=headers).json()
    assert inv["quantity"] == 8
    assert inv["reserved"] == 0


def test_insufficient_counter():
    r = client.post(
        "/inventory/reserve",
        json={"product_id": "product1", "quantity": 100},
        headers={"X-Tenant-Id": "tenant-a"},
    )
    assert r.status_code == 400
    metrics = client.get("/metrics").text
    assert "inventory_insufficient_total" in metrics


def test_negative_quantity():
    r = client.post(
        "/inventory/release",
        json={"product_id": "p", "quantity": 0},
        headers={"X-Tenant-Id": "tenant-a"},
    )
    assert r.status_code == 400


def test_same_product_is_isolated_between_tenants():
    tenant_a = {"X-Tenant-Id": "tenant-a"}
    tenant_b = {"X-Tenant-Id": "tenant-b"}

    client.post(
        "/inventory/stock/set",
        json={"warehouse_id": "default", "product_id": "shared-sku", "quantity": 12},
        headers=tenant_a,
    )
    client.post(
        "/inventory/stock/set",
        json={"warehouse_id": "default", "product_id": "shared-sku", "quantity": 4},
        headers=tenant_b,
    )

    a_stock = client.get("/inventory/shared-sku", headers=tenant_a).json()
    b_stock = client.get("/inventory/shared-sku", headers=tenant_b).json()

    assert a_stock["quantity"] == 12
    assert b_stock["quantity"] == 4
