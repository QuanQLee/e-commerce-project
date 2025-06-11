from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os
from dotenv import load_dotenv

# 加载.env里的变量
load_dotenv()

# 读取数据库连接串（一定要和.env里的变量名一致！）
DATABASE_URL = os.getenv("DATABASE_URL")

# 调试用，确保读取到了
print("DATABASE_URL =", DATABASE_URL)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

Base = declarative_base()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
