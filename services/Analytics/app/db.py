from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os
from dotenv import load_dotenv

# Load environment variables from a .env file if present
load_dotenv()

# Use an in-memory SQLite database by default so tests can run without
# external configuration. This value can still be overridden via the
# ``DATABASE_URL`` environment variable or a ``.env`` file.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

Base = declarative_base()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
