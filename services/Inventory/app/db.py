from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
import os

POSTGRES_DSN = os.getenv("POSTGRES_DSN")
if POSTGRES_DSN and POSTGRES_DSN.startswith("postgres://"):
    # Ensure SQLAlchemy uses the correct PostgreSQL driver
    POSTGRES_DSN = POSTGRES_DSN.replace("postgres://", "postgresql+psycopg2://", 1)
engine = create_engine(
    POSTGRES_DSN or "sqlite:///inventory.db",
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def _rebuild_sqlite_inventory_table(conn):
    conn.execute(
        text(
            """
            CREATE TABLE inventory_new (
                tenant_id VARCHAR NOT NULL DEFAULT 'public',
                warehouse_id VARCHAR NOT NULL,
                product_id VARCHAR NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                reserved INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (tenant_id, warehouse_id, product_id)
            )
            """
        )
    )
    conn.execute(
        text(
            """
            INSERT INTO inventory_new (tenant_id, warehouse_id, product_id, quantity, reserved)
            SELECT 'public', warehouse_id, product_id, quantity, reserved
            FROM inventory
            """
        )
    )
    conn.execute(text("DROP TABLE inventory"))
    conn.execute(text("ALTER TABLE inventory_new RENAME TO inventory"))


def _rebuild_sqlite_reservations_table(conn):
    conn.execute(
        text(
            """
            CREATE TABLE inventory_reservations_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id VARCHAR NOT NULL DEFAULT 'public',
                order_id VARCHAR NOT NULL,
                warehouse_id VARCHAR NOT NULL,
                product_id VARCHAR NOT NULL,
                quantity INTEGER NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'PREALLOCATED',
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                CONSTRAINT uq_inventory_reservation_line UNIQUE (tenant_id, order_id, warehouse_id, product_id)
            )
            """
        )
    )
    conn.execute(
        text(
            """
            INSERT INTO inventory_reservations_new
                (id, tenant_id, order_id, warehouse_id, product_id, quantity, status, created_at, updated_at)
            SELECT id, 'public', order_id, warehouse_id, product_id, quantity, status, created_at, updated_at
            FROM inventory_reservations
            """
        )
    )
    conn.execute(text("DROP TABLE inventory_reservations"))
    conn.execute(text("ALTER TABLE inventory_reservations_new RENAME TO inventory_reservations"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_reservations_tenant_id ON inventory_reservations (tenant_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_reservations_order_id ON inventory_reservations (order_id)"))


def _migrate_legacy_inventory_schema():
    inspector = inspect(engine)
    dialect = engine.dialect.name
    if "inventory" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("inventory")}
    with engine.begin() as conn:
        if dialect == "sqlite" and "tenant_id" not in columns:
            _rebuild_sqlite_inventory_table(conn)
        else:
            if "tenant_id" not in columns:
                conn.execute(
                    text("ALTER TABLE inventory ADD COLUMN tenant_id VARCHAR NOT NULL DEFAULT 'public'")
                )
            if "warehouse_id" not in columns:
                conn.execute(
                    text("ALTER TABLE inventory ADD COLUMN warehouse_id VARCHAR NOT NULL DEFAULT 'default'")
                )
            if "reserved" not in columns:
                conn.execute(
                    text("ALTER TABLE inventory ADD COLUMN reserved INTEGER NOT NULL DEFAULT 0")
                )

            if dialect == "postgresql":
                pk = inspector.get_pk_constraint("inventory").get("name")
                if pk and pk != "inventory_multi_tenant_pkey":
                    conn.execute(text(f'ALTER TABLE inventory DROP CONSTRAINT IF EXISTS "{pk}"'))
                    conn.execute(
                        text(
                            "ALTER TABLE inventory ADD CONSTRAINT inventory_multi_tenant_pkey "
                            "PRIMARY KEY (tenant_id, warehouse_id, product_id)"
                        )
                    )

            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_tenant_warehouse_product "
                    "ON inventory (tenant_id, warehouse_id, product_id)"
                )
            )

    if "inventory_reservations" not in inspector.get_table_names():
        return

    reservation_columns = {
        column["name"] for column in inspector.get_columns("inventory_reservations")
    }
    with engine.begin() as conn:
        if dialect == "sqlite" and "tenant_id" not in reservation_columns:
            _rebuild_sqlite_reservations_table(conn)
        else:
            if "tenant_id" not in reservation_columns:
                conn.execute(
                    text(
                        "ALTER TABLE inventory_reservations ADD COLUMN tenant_id VARCHAR NOT NULL DEFAULT 'public'"
                    )
                )

            if dialect == "postgresql":
                for constraint in inspector.get_unique_constraints("inventory_reservations"):
                    if constraint.get("name") == "uq_inventory_reservation_line":
                        conn.execute(
                            text(
                                'ALTER TABLE inventory_reservations DROP CONSTRAINT IF EXISTS "uq_inventory_reservation_line"'
                            )
                        )

            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_reservation_line_v2 "
                    "ON inventory_reservations (tenant_id, order_id, warehouse_id, product_id)"
                )
            )


def init_db():
    _migrate_legacy_inventory_schema()
    Base.metadata.create_all(bind=engine)
