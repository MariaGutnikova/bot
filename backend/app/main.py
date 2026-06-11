import asyncio
import logging
from fastapi import FastAPI
from app.api import router
from app.bot import bot
from app.database import engine, Base

# Настройка логирования
logging.basicConfig(level=logging.INFO)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Corporate Bot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

from app.database import engine, Base, async_session
from sqlalchemy import select
from app.models import User

async def start_bot_polling():
    logging.info("🚀 Starting custom resilient bot polling loop...")
    while True:
        try:
            async for event in bot.polling.listen():
                for update in event.get("updates", []):
                    try:
                        await bot.router.route(update, bot.api)
                    except Exception as e:
                        logging.error(f"❌ Error routing update: {e}")
        except Exception as e:
            logging.error(f"❌ Error in custom polling loop: {e}")
            await asyncio.sleep(5)

@app.on_event("startup")
async def on_startup():
    # Создание таблиц в PostgreSQL при старте
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Запуск бота в фоне, чтобы он не блокировал FastAPI
    logging.info(f"📊 DEBUG: REGISTERED BOT HANDLERS: {len(bot.labeler.message_view.handlers)}")
    asyncio.create_task(start_bot_polling())
    logging.info("🚀 Бот ВКонтакте и FastAPI успешно запущены!")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Corporate Backend is running"}
