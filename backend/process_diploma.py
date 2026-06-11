import docx
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
import urllib.request
import base64
import zlib
import ssl
import re

def get_kroki_url(diagram_type, text):
    compressed = zlib.compress(text.encode('utf-8'))
    b64 = base64.urlsafe_b64encode(compressed).decode('utf-8')
    return f"https://kroki.io/{diagram_type}/png/{b64}"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

diagrams = {
    "as_is.png": """graph TD
    A((Начало)) --> B[Руководитель ставит задачу в десктопной версии Naumen]
    B --> C[Генерация email-уведомления на корпоративную почту]
    C --> D[Сотрудник в полевых условиях получает письмо]
    D --> E[Попытка подключения к корпоративной сети через VPN-туннель]
    E --> F{Подключение успешно?}
    F -- Нет --> G[Ожидание стабильной сети и повторная попытка]
    G --> E
    F -- Да --> H[Длительная загрузка интерфейса Naumen со смартфона]
    H --> I[Сотрудник просматривает задачу и меняет статус на 'В работе']
    I --> J[Ручной мониторинг изменения статуса руководителем]
    J --> K((Конец))
    
    classDef event fill:#fff,stroke:#333,stroke-width:2px,shape:circle;
    classDef gateway fill:#fff,stroke:#333,stroke-width:2px,shape:diamond;
    class A,K event;
    class F gateway;
""",
    "to_be.png": """graph TD
    A((Начало)) --> B[Руководитель создает задачу в интерфейсе VK Mini App]
    B --> C[Backend сохраняет данные и триггерит рассылку]
    C --> D[VK Бот моментально присылает Push-уведомление исполнителю]
    D --> E[Сотрудник кликает на Push и без VPN открывает приложение]
    E --> F[Мгновенная загрузка SPA-интерфейса Канбан-доски]
    F --> G[Сотрудник перетаскивает задачу в статус 'В работе']
    G --> H[Система фиксирует изменения и обновляет дашборд]
    H --> I[Системный колокольчик уведомляет руководителя о взятии задачи]
    I --> J((Конец))

    classDef event fill:#fff,stroke:#333,stroke-width:2px,shape:circle;
    class A,J event;
""",
    "sequence.png": """sequenceDiagram
    autonumber
    actor User as Пользователь
    participant VK as Web Interface
    participant API as FastAPI Backend
    participant DB as PostgreSQL
    participant Bot as VK Bot

    User->>VK: Сохранить задачу
    VK->>API: POST /api/tasks
    Note over API: Pydantic-валидация
    API->>DB: INSERT INTO tasks
    DB-->>API: Task ID
    API->>DB: INSERT INTO events
    DB-->>API: 200 OK
    API->>Bot: EventBus Trigger
    Bot->>User: Push-уведомление
    API-->>VK: 201 Created
"""
}

# Download images
for name, code in diagrams.items():
    print(f"Downloading {name}...")
    url = get_kroki_url('mermaid', code)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx) as response, open(name, 'wb') as out_file:
        out_file.write(response.read())

doc = docx.Document('../Гутникова ВКР.docx')

# 1. Update text references (shift numbers by +1)
def shift_numbers(text):
    for i in range(11, 4, -1):  # 11 down to 5
        text = re.sub(rf'(рисунк[еу]) {i}', rf'\g<1> {i+1}', text, flags=re.IGNORECASE)
    return text

for p in doc.paragraphs:
    if 'рисунк' in p.text.lower():
        new_text = shift_numbers(p.text)
        if new_text != p.text:
            # Reconstruct the paragraph runs to preserve formatting as much as possible,
            # or just simple replace if it's plain text.
            # For simplicity, we can do a naive replace of the text inside the runs.
            for run in p.runs:
                run.text = shift_numbers(run.text)

# Find images
image_paras = []
for i, p in enumerate(doc.paragraphs):
    has_img = False
    for run in p.runs:
        if 'graphic' in run._element.xml:
            has_img = True
    if has_img:
        image_paras.append((i, p))

print(f"Found {len(image_paras)} images.")

# Replace AS-IS image (first image)
p_asis = image_paras[0][1]
p_asis.clear()
run = p_asis.add_run()
run.add_picture('as_is.png', width=Inches(6))
p_asis.alignment = WD_ALIGN_PARAGRAPH.CENTER

# Replace TO-BE image (second image)
p_tobe = image_paras[1][1]
p_tobe.clear()
run = p_tobe.add_run()
run.add_picture('to_be.png', width=Inches(6))
p_tobe.alignment = WD_ALIGN_PARAGRAPH.CENTER

# Add Sequence Diagram after paragraph 112
# Paragraph 112 ends with "...отправляет таргетированное сообщение исполнителю." (wait, no, line 112 in original was something else)
# We need to find the exact paragraph.
seq_p = None
for p in doc.paragraphs:
    if 'Сердцем проактивного информирования стал интеллектуальный чат-бот' in p.text:
        seq_p = p
        break

if seq_p:
    # Insert new paragraph before the next one
    new_p_text = seq_p.insert_paragraph_before('Логика серверной обработки детально отражена на диаграмме последовательности. При сохранении задачи клиентское приложение формирует POST-запрос к API. Далее FastAPI-сервис выполняет строгую Pydantic-валидацию параметров и открывает транзакцию к PostgreSQL. После успешного сохранения микросервис генерирует событие обновления для системы уведомлений. Встроенный модуль бота перехватывает это событие и через VK API отправляет таргетированное сообщение исполнителю.')
    new_p_text.paragraph_format.first_line_indent = Inches(0.49) # ~1.25 cm
    
    new_img_p = seq_p.insert_paragraph_before()
    new_img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    new_img_p.add_run().add_picture('sequence.png', width=Inches(6))
    
    new_cap_p = seq_p.insert_paragraph_before('Рисунок 5 — Диаграмма последовательности создания задачи')
    new_cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in new_cap_p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)

# Caption Screenshots
# Screenshots are images 5 to 11
captions = [
    'Рисунок 6 — Приветственное меню чат-бота ВКонтакте',
    'Рисунок 7 — Аналитические графики операционной эффективности',
    'Рисунок 8 — Главный экран VK Mini App (Вертикальная Kanban-доска)',
    'Рисунок 9 — Модальное окно создания и редактирования задачи',
    'Рисунок 10 — Центр агрегации уведомлений',
    'Рисунок 11 — Модуль геймификации (Маскот и полоса опыта)',
    'Рисунок 12 — Широкоформатный дашборд в десктопной версии'
]

for i in range(4, 11): # image_paras index 4 is the 5th image
    if i < len(image_paras):
        img_p = image_paras[i][1]
        cap_p = img_p.insert_paragraph_before(captions[i-4])
        cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in cap_p.runs:
            run.font.name = 'Times New Roman'
            run.font.size = Pt(14)
        # Move caption after image
        p_element = img_p._p
        cap_element = cap_p._p
        p_element.addnext(cap_element)

doc.save('../Гутникова ВКР_Итог.docx')
print("Successfully generated Гутникова ВКР_Итог.docx")
