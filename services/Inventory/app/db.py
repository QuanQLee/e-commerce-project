from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

POSTGRES_DSN = os.getenv("POSTGRES_DSN")
if POSTGRES_DSN and POSTGRES_DSN.startswith("postgres://"):
    # Ensure SQLAlchemy uses the correct PostgreSQL driver
    POSTGRES_DSN = POSTGRES_DSN.replace("postgres://", "postgresql+psycopg2://", 1)
engine = create_engine(POSTGRES_DSN or "sqlite:///inventory.db", future=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

def init_db():
    Base.metadata.create_all(bind=engine)
