from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from typing import List
from app.database import get_db
from app.models import Task, User, Notification
from app.schemas import TaskResponse, TaskCreate, TaskUpdate, UserResponse, NotificationResponse
import logging

router = APIRouter(prefix="/api", tags=["API"])

@router.get("/users", response_model=List[UserResponse])
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return result.scalars().all()

@router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Task)
        .options(joinedload(Task.assignee), joinedload(Task.author))
        .order_by(Task.created_at.desc())
    )
    return result.scalars().all()

@router.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, author_id: int = 1, db: AsyncSession = Depends(get_db)):
    user_result = await db.execute(select(User).where(User.id == author_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Author not found")
        
    new_task = Task(
        text=task.text,
        author_id=author_id,
        assignee_id=task.assignee_id,
        deadline=task.deadline,
        priority=task.priority,
        project=task.project,
        status=task.status or 'pending'
    )
    db.add(new_task)
    await db.commit()
    
    # Отправка уведомления
    if new_task.assignee_id:
        # In-app notification
        notification = Notification(
            user_id=new_task.assignee_id,
            text=f"Вам назначена новая задача: {new_task.text}"
        )
        db.add(notification)
        await db.commit()

        assignee = await db.get(User, new_task.assignee_id)
        if assignee and assignee.vk_id:
            try:
                from app.bot import bot
                await bot.api.messages.send(
                    user_id=assignee.vk_id,
                    random_id=0,
                    message=f"🔔 Вам назначена новая задача!\n\n📝 {new_task.text}\n⏳ Дедлайн: {new_task.deadline or 'Нет'}\n❗️ Приоритет: {new_task.priority}"
                )
            except Exception as e:
                logging.warning(f"Could not send VK notification: {e}")

    result = await db.execute(
        select(Task)
        .where(Task.id == new_task.id)
        .options(joinedload(Task.assignee), joinedload(Task.author))
    )
    return result.scalar_one()

@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, task_data: TaskUpdate, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    old_assignee_id = task.assignee_id
    
    if task_data.text is not None:
        task.text = task_data.text
    if task_data.deadline is not None:
        task.deadline = task_data.deadline
    if task_data.assignee_id is not None:
        task.assignee_id = task_data.assignee_id
    if task_data.priority is not None:
        task.priority = task_data.priority
    if task_data.project is not None:
        task.project = task_data.project
    if task_data.status is not None:
        task.status = task_data.status
        
    await db.commit()
    
    # Отправляем уведомление, если поменялся исполнитель
    if task.assignee_id and task.assignee_id != old_assignee_id:
        # In-app notification
        notification = Notification(
            user_id=task.assignee_id,
            text=f"На вас переведена задача: {task.text}"
        )
        db.add(notification)
        await db.commit()

        assignee = await db.get(User, task.assignee_id)
        if assignee and assignee.vk_id:
            try:
                from app.bot import bot
                await bot.api.messages.send(
                    user_id=assignee.vk_id,
                    random_id=0,
                    message=f"🔔 На вас переведена задача!\n\n📝 {task.text}\n⏳ Дедлайн: {task.deadline or 'Нет'}\n❗️ Приоритет: {task.priority}"
                )
            except Exception as e:
                logging.warning(f"Could not send VK notification: {e}")

    result = await db.execute(
        select(Task)
        .where(Task.id == task_id)
        .options(joinedload(Task.assignee), joinedload(Task.author))
    )
    return result.scalar_one()

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
    return {"message": "Task deleted"}

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
    )
    return result.scalars().all()

@router.put("/notifications/read")
async def mark_notifications_read(user_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import update
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id)
        .where(Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "Notifications marked as read"}
