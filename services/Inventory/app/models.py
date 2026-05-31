from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from .db import Base


class Inventory(Base):
    __tablename__ = "inventory"

    tenant_id = Column(String, primary_key=True, nullable=False, default="public")
    warehouse_id = Column(String, primary_key=True)
    product_id = Column(String, primary_key=True)
    quantity = Column(Integer, nullable=False, default=0)
    reserved = Column(Integer, nullable=False, default=0)


class InventoryReservation(Base):
    __tablename__ = "inventory_reservations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(String, nullable=False, default="public", index=True)
    order_id = Column(String, nullable=False, index=True)
    warehouse_id = Column(String, nullable=False)
    product_id = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="PREALLOCATED")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "order_id",
            "warehouse_id",
            "product_id",
            name="uq_inventory_reservation_line",
        ),
    )
