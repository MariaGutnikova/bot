import asyncio
from vkbottle.bot import Bot, Message
from vkbottle import Keyboard, KeyboardButtonColor, Text, OpenLink
from vkbottle.dispatch.rules.base import CommandRule
from sqlalchemy import select, update
from app.config import settings
from app.database import async_session
from app.models import User, Task
from app.services import generate_excel_report, generate_status_chart

bot = Bot(token=settings.vk_token)

# Современные клавиатуры
def get_main_keyboard():
    keyboard = Keyboard(one_time=False, inline=False)
    keyboard.add(Text("📋 Мои задачи"), color=KeyboardButtonColor.PRIMARY)
    keyboard.add(Text("📊 Дашборд"), color=KeyboardButtonColor.SECONDARY)
    keyboard.row()
    keyboard.add(Text("➕ Создать"), color=KeyboardButtonColor.POSITIVE)
    keyboard.add(Text("📈 Аналитика"), color=KeyboardButtonColor.PRIMARY)
    keyboard.row()
    keyboard.add(Text("📎 Excel"), color=KeyboardButtonColor.SECONDARY)
    return keyboard.get_json()

async def start_handler(message: Message):
    async with async_session() as session:
        # Регистрация пользователя
        result = await session.execute(select(User).where(User.vk_id == message.from_id))
        user = result.scalar_one_or_none()
        
        if not user:
            # Узнаем имя пользователя через API ВК
            user_info = await bot.api.users.get(user_ids=[message.from_id])
            full_name = f"{user_info[0].first_name} {user_info[0].last_name}"
            
            # Проверяем, первый ли это пользователь (админ)
            count_result = await session.execute(select(User))
            users_count = len(count_result.scalars().all())
            role = "admin" if users_count == 0 else "user"
            
            user = User(vk_id=message.from_id, full_name=full_name, role=role)
            session.add(user)
            await session.commit()
            
        await message.answer(
            f"👋 Добро пожаловать, корпоративный портал активирован!\n\n"
            f"Ваша роль: {'Администратор 👑' if user.role == 'admin' else 'Сотрудник 👔'}\n"
            f"Для работы используйте кнопки меню ниже 👇",
            keyboard=get_main_keyboard()
        )

async def tasks_handler(message: Message):
    async with async_session() as session:
        user_res = await session.execute(select(User).where(User.vk_id == message.from_id))
        user = user_res.scalar_one_or_none()
        if not user:
            return await message.answer("Сначала напишите /start или привет")
            
        # Загружаем задачи пользователя
        stmt = select(Task).where(
            (Task.author_id == user.id) | (Task.assignee_id == user.id)
        ).order_by(Task.created_at.desc()).limit(10)
        
        tasks_res = await session.execute(stmt)
        tasks = tasks_res.scalars().all()
        
        if not tasks:
            return await message.answer("У вас нет активных задач! 🎉", keyboard=get_main_keyboard())
            
        text = "📋 Ваши последние задачи:\n\n"
        for t in tasks:
            status = "🟢 Выполнено" if t.status == "done" else "🟠 В работе"
            text += f"🔹 Задача #{t.id} [{status}]\n📝 {t.text}\n⏳ Дедлайн: {t.deadline or 'Нет'}\n\n"
            
        text += "Для выполнения задачи введите: /done [номер]"
        await message.answer(text, keyboard=get_main_keyboard())

async def done_handler(message: Message, task_id: int):
    async with async_session() as session:
        from datetime import datetime
        stmt = update(Task).where(Task.id == task_id).values(status="done", completed_at=datetime.utcnow())
        await session.execute(stmt)
        await session.commit()
        await message.answer(f"✅ Задача #{task_id} успешно переведена в статус 'Выполнено'!")

async def excel_handler(message: Message):
    await message.answer("⏳ Формирую красивый Excel-отчёт...")
    async with async_session() as session:
        tasks_res = await session.execute(select(Task).order_by(Task.created_at.desc()))
        tasks = tasks_res.scalars().all()
        
        excel_bytes = await generate_excel_report(tasks)
        
        # Загрузка документа в ВК
        from vkbottle import DocMessagesUploader
        uploader = DocMessagesUploader(bot.api)
        doc = await uploader.upload("report.xlsx", excel_bytes, peer_id=message.peer_id)
        
        await message.answer("📊 Ваш корпоративный отчёт готов!", attachment=doc)

async def charts_handler(message: Message):
    await message.answer("🎨 Формирую график аналитики...")
    async with async_session() as session:
        # Считаем статусы
        new_tasks = await session.execute(select(Task).where(Task.status == 'new'))
        done_tasks = await session.execute(select(Task).where(Task.status == 'done'))
        
        data = {
            'new': len(new_tasks.scalars().all()),
            'done': len(done_tasks.scalars().all())
        }
        
        chart_bytes = await generate_status_chart(data)
        if not chart_bytes:
            return await message.answer("📭 Недостаточно данных для графика.")
            
        # Загрузка фото в ВК
        from vkbottle import PhotoMessageUploader
        uploader = PhotoMessageUploader(bot.api)
        photo = await uploader.upload(chart_bytes)
        
        await message.answer("📊 Распределение задач:", attachment=photo)
        
async def create_handler(message: Message):
    keyboard = Keyboard(inline=True)
    keyboard.add(OpenLink("https://vk.com/app54617502", "🚀 Открыть Трекер МСБ"))
    await message.answer("📱 Для управления задачами и создания новых перейдите в наше мини-приложение:", keyboard=keyboard.get_json())

async def stats_handler(message: Message):
    async with async_session() as session:
        all_tasks = await session.execute(select(Task))
        tasks = all_tasks.scalars().all()
        done = len([t for t in tasks if t.status == 'done'])
        total = len(tasks)
        percent = int((done / total * 100)) if total > 0 else 0
        
        bar_length = 15
        filled = int(bar_length * percent / 100)
        bar = "🟩" * filled + "⬜️" * (bar_length - filled)
        
        text = (
            f"📊 **ДАШБОРД ОТДЕЛА**\n\n"
            f"Всего задач: {total}\n"
            f"Выполнено: {done} ({percent}%)\n\n"
            f"Прогресс: \n[{bar}]"
        )
        await message.answer(text)

@bot.on.message()
async def unified_router(message):
    import logging
    logging.info(f"🔮 UNIFIED ROUTER TRIGGERED FOR TEXT: '{message.text}' from_id: {message.from_id}")
    
    # Автоматически регистрируем пользователя, если его нет в базе
    async with async_session() as session:
        result = await session.execute(select(User).where(User.vk_id == message.from_id))
        user = result.scalar_one_or_none()
        if not user:
            try:
                user_info = await bot.api.users.get(user_ids=[message.from_id])
                full_name = f"{user_info[0].first_name} {user_info[0].last_name}"
            except Exception as e:
                logging.error(f"Error fetching VK user info: {e}")
                full_name = f"VK User {message.from_id}"
                
            count_result = await session.execute(select(User))
            users_count = len(count_result.scalars().all())
            role = "admin" if users_count == 0 else "user"
            
            user = User(vk_id=message.from_id, full_name=full_name, role=role)
            session.add(user)
            await session.commit()
            logging.info(f"👤 Auto-registered new user: {full_name} ({role})")

    text = (message.text or "").strip().lower()
    
    # 1. Приветствие / Старт
    if text in ["/start", "начать", "привет"]:
        await start_handler(message)
    # 2. Мои задачи
    elif text in ["📋 мои задачи", "/tasks", "мои задачи"]:
        await tasks_handler(message)
    # 3. Выполнение задачи
    elif text.startswith("/done"):
        try:
            parts = text.split()
            if len(parts) > 1:
                task_id = int(parts[1])
                await done_handler(message, task_id)
            else:
                await message.answer("Пожалуйста, укажите ID задачи. Пример: /done 5")
        except ValueError:
            await message.answer("Неверный ID задачи. Пример: /done 5")
    # 4. Excel
    elif text in ["📎 excel", "/excel", "excel"]:
        await excel_handler(message)
    # 5. Графики
    elif text in ["📈 аналитика", "/charts", "аналитика"]:
        await charts_handler(message)
    # 6. Создать
    elif text in ["➕ создать", "/create", "создать"]:
        await create_handler(message)
    # 7. Дашборд
    elif text in ["📊 дашборд", "/dashboard", "дашборд"]:
        await stats_handler(message)
    # Fallback
    else:
        await message.answer(
            "Извините, я не понял эту команду. Воспользуйтесь кнопками меню или напишите 'привет'!",
            keyboard=get_main_keyboard()
        )
