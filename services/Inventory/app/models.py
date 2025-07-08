from sqlalchemy import Column, Integer, String
from .db import Base

class Inventory(Base):
    __tablename__ = "inventory"
    product_id = Column(String, primary_key=True)
    quantity = Column(Integer, nullable=False)
