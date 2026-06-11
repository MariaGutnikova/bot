import asyncio
from app.database import async_session
from app.models import Task
from sqlalchemy import delete

async def delete_tasks():
    async with async_session() as session:
        await session.execute(delete(Task).where(Task.text == "ля"))
        await session.commit()
        print("Deleted tasks")

asyncio.run(delete_tasks())
