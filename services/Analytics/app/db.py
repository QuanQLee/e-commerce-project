from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os
from dotenv import load_dotenv

# Load environment variables from a .env file if present
load_dotenv()

# Prefer the service-specific variable name used in docs and tests.
DATABASE_URL = os.getenv("DATABASE_URL")

# ãȷȡ
print("DATABASE_URL =", DATABASE_URL)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

Base = declarative_base()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
