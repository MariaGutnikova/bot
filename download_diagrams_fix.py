import urllib.request
import base64
import zlib
import ssl

def get_kroki_url(diagram_type, text):
    compressed = zlib.compress(text.encode('utf-8'))
    b64 = base64.urlsafe_b64encode(compressed).decode('utf-8')
    return f"https://kroki.io/{diagram_type}/png/{b64}"

diagrams = {
    "1_AS_IS_process.png": """graph TD
    A(["Инициация задачи руководителем подразделения"]) --> B{"Срочность (SLA < 2ч)?"}
    B -- Да --> C["Передача поручения через неформальные каналы (Telegram, телефония)"]
    B -- Нет --> D["Регистрация тикета в ITSM-системе (Naumen)"]
    C --> E["Реализация задачи исполнителем"]
    D --> E
    E --> F["Нарушение регламента обновления статусов в ITSM-системе"]
    F --> G["Ручная синхронизация статусов (еженедельная сверка)"]
    G --> H(["Искажение метрик эффективности и затруднение расчета KPI"])""",
    
    "2_TO_BE_process.png": """graph TD
    A(["Инициация задачи"]) --> B["Создание карточки задачи через интегрированный интерфейс (VK Mini App)"]
    B --> C["Транзакция сохранения сущности в реляционной СУБД (PostgreSQL)"]
    C --> D["Асинхронная отправка push-уведомления исполнителю через API платформы"]
    D --> E["Интерактивное изменение статуса или параметров задачи через интерфейс"]
    E --> F["Реализация задачи исполнителем"]
    F --> G["Подтверждение завершения жизненного цикла задачи"]
    G --> H["Автоматизированный расчет KPI и начисление баллов вовлеченности (модуль геймификации)"]
    H --> I(["Аналитика показателей отдела в режиме реального времени"])"""
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

for filename, code in diagrams.items():
    url = get_kroki_url('mermaid', code)
    print(f"Downloading {filename}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as response, open(f"/Users/maria/Desktop/{filename}", 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        print(f"Successfully saved {filename}")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")
