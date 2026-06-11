from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

# Инициализация асинхронного движка PostgreSQL
engine = create_async_engine(settings.database_url, echo=False)

# Фабрика сессий
async_session = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

# Зависимость для получения сессии БД в FastAPI
async def get_db():
    async with async_session() as session:
        yield session
