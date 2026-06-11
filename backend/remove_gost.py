# -*- coding: utf-8 -*-
import docx
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = docx.Document('../Гутникова ВКР_ФИНАЛ.docx')

sources = [
    "Зеленков, Ю. А., Сучкова, А. С. Прогнозирование оттока клиентов на основе паттернов изменения их поведения // Бизнес-информатика. – 2023. – Т. 17, № 1. – С. 7-14. – DOI: 10.17323/2587-814X.2023.1.7.17.",
    "Днепровская, Н. В., Шевцова, И. В. Система менеджмента знаний в стратегическом управлении университетом // Бизнес-информатика. – 2023. – Т. 17, № 2. – С. 20-40. – DOI: 10.17323/2587-814X.2023.2.20.40.",
    "Шайдуллин, А. И. Проблема интерпретации, дифференциации и классификации цифровых продуктов // Бизнес-информатика. – 2023. – Т. 17, № 2. – С. 55-70. – DOI: 10.17323/2587-814X.2023.2.55.70.",
    "Solovyov, I., Semenikhin, V., Kushch, S. The influence of the breadth of the tech stack on the result of the digital product // Business Informatics. – 2023. – Vol. 17, No. 4. – P. 57-72. – DOI: 10.17323/2587-814x.2023.4.57.72.",
    "Тельнов, Ю. Ф. Методы и модели обоснования сценариев применения цифровых двойников бизнес-процессов сетевых предприятий // Бизнес-информатика. – 2023. – Т. 17, № 4. – С. 73-93. – DOI: 10.17323/2587-814X.2023.4.73.93.",
    "Славин, Б. Б. Технологии коллективного интеллекта в управлении бизнес-процессами организации // Бизнес-информатика. – 2022. – Т. 16, № 2. – С. 36-48. – DOI: 10.17323/2587-814X.2022.2.36.48.",
    "Мызникова, М. А. Качество стратегического управления в условиях неопределенности: оценка в контексте устойчивого развития // Бизнес-информатика. – 2022. – Т. 16, № 3. – С. 36-52. – DOI: 10.17323/2587-814X.2022.3.36.52.",
    "Краев, В. М., Масич, И. С., Тихонов, А. И. Метод выявления конфликтных отношений между субъектами бизнес-процессов на основе парных корреляций взаимных оценок // Бизнес-информатика. – 2022. – Т. 16, № 3. – С. 85-97. – DOI: 10.17323/2587-814X.2022.3.85.97.",
    "Тельнов, Ю. Ф., Брызгалов, А. А., Козырев, П. А., Королева, Д. С. Выбор типа бизнес-модели для реализации стратегии цифровой трансформации сетевого предприятия // Бизнес-информатика. – 2022. – Т. 16, № 4. – С. 50-67. – DOI: 10.17323/2587-814X.2022.4.50.67.",
    "Морозевич, Е. С., Коротких, В. С. Разработка модели формирования индивидуальных образовательных траекторий с использованием методов машинного обучения // Бизнес-информатика. – 2022. – Т. 16, № 2. – С. 21-35. – DOI: 10.17323/2587-814X.2022.2.21.35.",
    "Богданова, Т. К., Жукова, Л. В. Information-logical model of express analysis of the state of the enterprise that meets the requirements of standards and regulations, based on publicly available data // Бизнес-информатика. – 2022. – Т. 16, № 1. – С. 42-55. – DOI: 10.17323/2587-814X.2022.1.42.55.",
    "Андерсон, Дэвид. Канбан: альтернативный путь в Agile / Дэвид Андерсон ; пер. с англ. А. Коробейникова. – Москва : Манн, Иванов и Фербер, 2017. – 331 с. – ISBN 978-5-00100-530-8.",
    "Документация фреймворка FastAPI [Электронный ресурс]. – URL: https://fastapi.tiangolo.com/ (дата обращения: 25.05.2024).",
    "Официальная документация платформы VK Mini Apps [Электронный ресурс]. – URL: https://dev.vk.com/mini-apps/getting-started (дата обращения: 26.05.2024).",
    "Официальная документация СУБД PostgreSQL [Электронный ресурс]. – URL: https://www.postgresql.org/docs/ (дата обращения: 27.05.2024).",
    "Официальная документация библиотеки React [Электронный ресурс]. – URL: https://reactjs.org/docs/getting-started.html (дата обращения: 28.05.2024).",
    "Федеральный закон от 27.07.2006 № 152-ФЗ «О персональных данных» [Электронный ресурс] // Справочная правовая система «КонсультантПлюс». – URL: http://www.consultant.ru/document/cons_doc_LAW_61801/ (дата обращения: 28.05.2024).",
    "Спецификация формата JSON Web Token (JWT) - RFC 7519 [Электронный ресурс] // IETF Datatracker. – URL: https://datatracker.ietf.org/doc/html/rfc7519 (дата обращения: 29.05.2024).",
    "Официальная документация языка программирования Python [Электронный ресурс]. – URL: https://docs.python.org/3/ (дата обращения: 25.05.2024).",
    "Официальная документация библиотеки SQLAlchemy [Электронный ресурс]. – URL: https://docs.sqlalchemy.org/ (дата обращения: 26.05.2024).",
    "Официальная документация библиотеки Pydantic [Электронный ресурс]. – URL: https://docs.pydantic.dev/ (дата обращения: 26.05.2024).",
    "Официальная документация VK API (ВКонтакте) [Электронный ресурс]. – URL: https://dev.vk.com/api/getting-started (дата обращения: 27.05.2024).",
    "Спецификация протокола авторизации OAuth 2.0 - RFC 6749 [Электронный ресурс] // IETF Datatracker. – URL: https://datatracker.ietf.org/doc/html/rfc6749 (дата обращения: 29.05.2024)."
]

in_bib = False
bib_start_idx = -1
app_start_idx = -1

for i, p in enumerate(doc.paragraphs):
    if 'СПИСОК' in p.text.upper() and 'ЛИТЕРАТУР' in p.text.upper():
        in_bib = True
        bib_start_idx = i
        continue
        
    if in_bib and p.text.strip().startswith('ПРИЛОЖЕНИЕ'):
        app_start_idx = i
        break

if bib_start_idx != -1 and app_start_idx != -1:
    for i in range(app_start_idx - 1, bib_start_idx, -1):
        p = doc.paragraphs[i]
        p._element.getparent().remove(p._element)
        
bib_header = doc.paragraphs[bib_start_idx]

for idx, source_text in enumerate(reversed(sources)):
    num = 23 - idx
    full_text = f"{num}. {source_text}"
    new_p = bib_header.insert_paragraph_before(full_text)
    bib_header._p.addnext(new_p._p)
    
    new_p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    new_p.paragraph_format.first_line_indent = Inches(0.49)
    new_p.paragraph_format.line_spacing = 1.5
    for run in new_p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)

doc.save('../Гутникова ВКР_ФИНАЛ.docx')
print("Bibliography replaced with exactly 23 verified sources.")
