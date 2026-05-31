from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from dotenv import load_dotenv

# Load environment variables from a .env file if present
load_dotenv()

def _database_url() -> str:
    configured = os.getenv("DATABASE_URL") or os.getenv("ConnectionStrings__AnalyticsDb")
    if not configured:
        # Keep local tests self-contained when no external database is configured.
        return "sqlite+aiosqlite:///:memory:"

    if configured.startswith("postgresql://"):
        configured = configured.replace("postgresql://", "postgresql+asyncpg://", 1)
    if configured.startswith("postgres://"):
        configured = configured.replace("postgres://", "postgresql+asyncpg://", 1)

    if configured.startswith("postgresql+asyncpg://"):
        parts = urlsplit(configured)
        query = [
            (key, value)
            for key, value in parse_qsl(parts.query, keep_blank_values=True)
            if key.lower() != "sslmode"
        ]
        return urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query and urlencode(query), parts.fragment))

    return configured


DATABASE_URL = _database_url()

engine_kwargs = {"echo": False}
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    engine_kwargs.update(
        {
            "pool_size": int(os.getenv("ANALYTICS_DB_POOL_SIZE", "10")),
            "max_overflow": int(os.getenv("ANALYTICS_DB_MAX_OVERFLOW", "20")),
            "pool_pre_ping": True,
        }
    )

engine = create_async_engine(DATABASE_URL, **engine_kwargs)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

Base = declarative_base()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
