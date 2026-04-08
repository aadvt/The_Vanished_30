from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from config import settings
from storage.models import Base
from utils.logger import log

# Handle both postgresql:// and postgresql+asyncpg:// but force the driver
# Also strip query parameters like sslmode which asyncpg handles differently
base_url = settings.DATABASE_URL.split("?")[0]
database_url = base_url.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(
    database_url, 
    echo=False,
    connect_args={"ssl": True}
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    try:
        log.info("creating tables")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        log.info("tables created successfully")
    except Exception as e:
        log.error("failed to initialize database", error=str(e))
        raise
