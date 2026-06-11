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
    "as_is.png": """@startuml
skinparam handwritten false
skinparam swimlaneBorderThickness 1

|Руководитель|
start
:Постановка задачи в
десктопной версии Naumen;
|Система Naumen|
:Генерация email-уведомления;
|Выездной сотрудник|
:Получение email на смартфоне;
    :Попытка подключения к
    корпоративной сети через VPN;
    if (Подключение успешно?) then (Да)
      :Длительная загрузка
      тяжелого интерфейса;
      :Просмотр задачи;
      :Смена статуса на "В работе";
    else (Нет)
      :Ожидание стабильной сети;
      :Повторная попытка;
      stop
    endif
|Руководитель|
:Ручной мониторинг
статуса задачи;
stop
@enduml""",
    
    "to_be.png": """@startuml
skinparam handwritten false
skinparam swimlaneBorderThickness 1

|Руководитель|
start
:Создание задачи через
интерфейс VK Mini App;
|Backend (FastAPI)|
:Сохранение в PostgreSQL;
:Отправка Push-уведомления
через VK API;
|Выездной сотрудник|
:Клик по Push-уведомлению;
:Мгновенная загрузка SPA
(Канбан-доски) без VPN;
:Смена статуса в 1 клик;
|Backend (FastAPI)|
:Фиксация изменений
и обновление дашборда;
:Системный колокольчик
руководителю;
stop
@enduml""",

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
    # As_is and to_be are plantuml, sequence is mermaid
    dtype = 'plantuml' if 'startuml' in code else 'mermaid'
    url = get_kroki_url(dtype, code)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx) as response, open(name, 'wb') as out_file:
        out_file.write(response.read())

doc = docx.Document('../Гутникова ВКР.docx')

# GOST Formatting and Shift text refs
def shift_numbers(text):
    for i in range(11, 4, -1):
        text = re.sub(rf'(рисунк[еу]) {i}', rf'\g<1> {i+1}', text, flags=re.IGNORECASE)
    return text

for p in doc.paragraphs:
    # Formatting
    style_name = p.style.name.lower() if p.style else ''
    text = p.text.strip()
    
    # Process text shifting
    if 'рисунк' in text.lower():
        for run in p.runs:
            run.text = shift_numbers(run.text)

    # Apply GOST to normal text
    if 'гост' in style_name or 'normal' in style_name or 'обычный' in style_name:
        if not text.startswith('Рисунок') and not text.startswith('Таблица') and not 'http' in text:
            # Check if it's code in Appendices (roughly)
            if ' = ' not in text and 'plt.' not in text and '{' not in text:
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                p.paragraph_format.line_spacing = 1.5
                p.paragraph_format.first_line_indent = Inches(0.49)
                for run in p.runs:
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(14)
    
    # Handle "Приложение" 
    if text.startswith('Приложение'):
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.first_line_indent = 0
        for run in p.runs:
            run.bold = True

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

# Replace AS-IS image
p_asis = image_paras[0][1]
p_asis.clear()
p_asis.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_asis.add_run().add_picture('as_is.png', width=Inches(5)) # Slightly smaller for swimlanes to fit vertically

# Replace TO-BE image
p_tobe = image_paras[1][1]
p_tobe.clear()
p_tobe.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_tobe.add_run().add_picture('to_be.png', width=Inches(5))

# Add Optimization Text after TO-BE
# Find the caption "Рисунок 2 — Схема процесса TO-BE (Как стало)"
tobe_caption_idx = -1
for i, p in enumerate(doc.paragraphs):
    if 'Схема процесса TO-BE' in p.text:
        tobe_caption_idx = i
        break

if tobe_caption_idx != -1:
    p_caption = doc.paragraphs[tobe_caption_idx]
    
    opt_text1 = "Как видно из представленных моделей BPMN (Рисунок 1 и Рисунок 2), оптимизация бизнес-процесса достигается за счет нескольких ключевых архитектурных и управленческих факторов. Во-первых, полностью устраняется критическое узкое место (bottleneck) в виде необходимости подключения мобильных сотрудников к корпоративному VPN-туннелю. В целевой модели (TO-BE) доступ к системе осуществляется напрямую через защищенное API платформы ВКонтакте. Это решение является жизненно важным в условиях нестабильного мобильного интернета в полевых условиях, где классические VPN-протоколы (IPSec/OpenVPN) часто обрывают соединение."
    opt_text2 = "Во-вторых, осуществляется концептуальный переход от пассивной pull-модели информирования (когда сотрудник вынужден периодически запускать почтовый клиент для проверки новых уведомлений) к реактивной push-модели. Встроенный чат-бот мгновенно доставляет таргетированное уведомление прямо на экран блокировки смартфона. По клику на пуш открывается легковесное SPA-приложение (Single Page Application). Это радикально снижает когнитивную нагрузку на пользователя и сокращает количество требуемых действий до одного тапа."
    opt_text3 = "В-третьих, отказ от перегруженного десктопного интерфейса ITSM-системы Naumen в пользу адаптивной мобильной Kanban-доски, спроектированной в парадигме Mobile-First, позволяет изменять параметры и статус задачи буквально на ходу. Совокупность данных технических и эргономических улучшений обеспечивает феноменальное сокращение временного лага (задержки) от момента постановки задачи до ее взятия в работу — с 45 минут до 1-2 секунд. Это исключает влияние человеческого фактора (невнимательность, пропуск писем) и полностью устраняет риски срыва жестких сроков SLA (Service Level Agreement)."
    
    for t in [opt_text3, opt_text2, opt_text1]:
        new_p = p_caption.insert_paragraph_before(t)
        new_p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        new_p.paragraph_format.line_spacing = 1.5
        new_p.paragraph_format.first_line_indent = Inches(0.49)
        for run in new_p.runs:
            run.font.name = 'Times New Roman'
            run.font.size = Pt(14)
        # Move them after the caption
        p_caption._p.addnext(new_p._p)

# Sequence Diagram in chapter 2.3
seq_p = None
for p in doc.paragraphs:
    if 'Сердцем проактивного информирования стал интеллектуальный чат-бот' in p.text:
        seq_p = p
        break

if seq_p:
    new_p_text = seq_p.insert_paragraph_before('Логика серверной обработки детально отражена на диаграмме последовательности. При сохранении задачи клиентское приложение формирует POST-запрос к API. Далее FastAPI-сервис выполняет строгую Pydantic-валидацию параметров и открывает транзакцию к PostgreSQL. После успешного сохранения микросервис генерирует событие обновления для системы уведомлений. Встроенный модуль бота перехватывает это событие и через VK API отправляет таргетированное сообщение исполнителю.')
    new_p_text.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    new_p_text.paragraph_format.first_line_indent = Inches(0.49)
    new_p_text.paragraph_format.line_spacing = 1.5
    for run in new_p_text.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)
    
    new_img_p = seq_p.insert_paragraph_before()
    new_img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    new_img_p.add_run().add_picture('sequence.png', width=Inches(6))
    
    new_cap_p = seq_p.insert_paragraph_before('Рисунок 5 — Диаграмма последовательности создания задачи')
    new_cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in new_cap_p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)

# Caption Screenshots
captions = [
    'Рисунок 6 — Приветственное меню чат-бота ВКонтакте',
    'Рисунок 7 — Аналитические графики операционной эффективности',
    'Рисунок 8 — Главный экран VK Mini App (Вертикальная Kanban-доска)',
    'Рисунок 9 — Модальное окно создания и редактирования задачи',
    'Рисунок 10 — Центр агрегации уведомлений',
    'Рисунок 11 — Модуль геймификации (Маскот и полоса опыта)',
    'Рисунок 12 — Широкоформатный дашборд в десктопной версии'
]

for i in range(4, 11): 
    if i < len(image_paras):
        img_p = image_paras[i][1]
        cap_p = img_p.insert_paragraph_before(captions[i-4])
        cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in cap_p.runs:
            run.font.name = 'Times New Roman'
            run.font.size = Pt(14)
        p_element = img_p._p
        cap_element = cap_p._p
        p_element.addnext(cap_element)

doc.save('../Гутникова ВКР_Итог.docx')
print("Successfully generated Гутникова ВКР_Итог.docx with GOST and optimizations.")
