import os
import subprocess

diagrams = {
    'diagram_1.mmd': """graph TD
    A([Инициация задачи руководителем подразделения]) --> B{Срочность (SLA < 2ч)?}
    B -- Да --> C[Передача поручения через неформальные каналы (Telegram, телефония)]
    B -- Нет --> D[Регистрация тикета в ITSM-системе (Naumen)]
    C --> E[Реализация задачи исполнителем]
    D --> E
    E --> F[Нарушение регламента обновления статусов в ITSM-системе]
    F --> G[Ручная синхронизация статусов (еженедельная сверка)]
    G --> H([Искажение метрик эффективности и затруднение расчета KPI])
    style A fill:#f9f9f9,stroke:#333,stroke-width:2px
    style B fill:#ffe6e6,stroke:#ff6666,stroke-width:2px
    style H fill:#f9f9f9,stroke:#333,stroke-width:2px
""",
    'diagram_2.mmd': """graph TD
    A([Инициация задачи]) --> B[Создание карточки задачи через интегрированный интерфейс (VK Mini App)]
    B --> C[Транзакция сохранения сущности в реляционной СУБД (PostgreSQL)]
    C --> D[Асинхронная отправка push-уведомления исполнителю через API платформы]
    D --> E[Интерактивное изменение статуса или параметров задачи через интерфейс]
    E --> F[Реализация задачи исполнителем]
    F --> G[Подтверждение завершения жизненного цикла задачи]
    G --> H[Автоматизированный расчет KPI и начисление баллов вовлеченности (модуль геймификации)]
    H --> I([Аналитика показателей отдела в режиме реального времени])
    style A fill:#f9f9f9,stroke:#333,stroke-width:2px
    style I fill:#f9f9f9,stroke:#333,stroke-width:2px
""",
    'diagram_3.mmd': """erDiagram
    USERS {
        int id PK
        bigint vk_id UK
        string full_name
        string role
    }
    TASKS {
        int id PK
        string text
        int author_id FK
        int assignee_id FK
        string deadline
        string priority
        string project
        datetime created_at
        datetime completed_at
    }
    NOTIFICATIONS {
        int id PK
        int user_id FK
        string text
        boolean is_read
        datetime created_at
    }
    USERS ||--o{ TASKS : "создает (author)"
    USERS ||--o{ TASKS : "выполняет (assignee)"
    USERS ||--o{ NOTIFICATIONS : "получает"
""",
    'diagram_4.mmd': """graph LR
    subgraph Клиент
        VK_APP[VK Mini App React + VKUI]
        VK_BOT[Чат с ботом ВКонтакте]
    end
    subgraph Сервер
        NGINX[Cloudflare Tunnel / Nginx Reverse Proxy]
        API[FastAPI Backend Python 3.12]
        BOT_LOGIC[VKbottle Bot Event Handler]
        DB[(PostgreSQL Database)]
    end
    VK_APP <-->|REST API / JSON| NGINX
    VK_BOT <-->|Webhook / Longpoll| NGINX
    NGINX <--> API
    NGINX <--> BOT_LOGIC
    API <-->|SQLAlchemy ORM| DB
    BOT_LOGIC <-->|SQLAlchemy ORM| DB
    style DB fill:#336791,stroke:#fff,color:#fff
    style VK_APP fill:#4a76a8,stroke:#fff,color:#fff
    style VK_BOT fill:#4a76a8,stroke:#fff,color:#fff
"""
}

for filename, content in diagrams.items():
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

    png_filename = filename.replace('.mmd', '.png')
    print(f"Generating {png_filename}...")
    subprocess.run(['npx', '-p', '@mermaid-js/mermaid-cli', 'mmdc', '-i', filename, '-o', png_filename, '-t', 'default', '-b', 'transparent', '-s', '2'])
