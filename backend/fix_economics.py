# -*- coding: utf-8 -*-
import docx
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
import re

doc = docx.Document('../Гутникова ВКР_ФИНАЛ.docx')

# 1. Update intro paragraph for 2.6.1
for p in doc.paragraphs:
    if 'Капитальные затраты складываются из фонда оплаты труда' in p.text:
        p.text = "Разработка приложения осуществлялась силами студента в рамках подготовки ВКР, что позволило свести реальные капитальные затраты компании к минимуму (фактически — только оплата облачных мощностей). Однако для корректной оценки коммерческой ценности проекта и расчета рентабельности инвестиций (ROI) необходимо учитывать альтернативную рыночную стоимость (Opportunity Cost) подобной разработки силами in-house специалистов. Расчёт представлен в таблице 2."
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.first_line_indent = Inches(0.49)
        p.paragraph_format.line_spacing = 1.5
        for run in p.runs:
            run.font.name = 'Times New Roman'
            run.font.size = Pt(14)
        break

# 2. Update Table 2 (Index 3)
table2 = doc.tables[3]

# In python-docx, adding a row to the middle of a table is tricky. 
# We can just overwrite the cells if we add a row at the end, then copy data down.
# Let's add a row at the end.
new_row = table2.add_row()
new_row2 = table2.add_row() # We need to shift everything down by 1.

# Current table rows:
# 0: Header
# 1: Разработка
# 2: Аренда
# 3: Итого

# Move "Итого" to row 4
table2.rows[4].cells[0].text = 'Итого инвестиции (I)'
table2.rows[4].cells[1].text = '1 141 600'
table2.rows[4].cells[2].text = '—'

# Move "Аренда" to row 3
table2.rows[3].cells[0].text = 'Аренда облачных мощностей (бэкенд + PostgreSQL) в год'
table2.rows[3].cells[1].text = '100 000'
table2.rows[3].cells[2].text = 'Ежегодно'

# Insert "Налоги" in row 2
table2.rows[2].cells[0].text = 'Обязательные страховые взносы во внебюджетные фонды с ФОТ (30,2%)'
table2.rows[2].cells[1].text = '241 600'
table2.rows[2].cells[2].text = 'Единоразово'

# Format the entire table 2
for row in table2.rows:
    for cell in row.cells:
        for p in cell.paragraphs:
            for run in p.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(14)

# 3. Update ROI and Payback formulas in text
for p in doc.paragraphs:
    if 'ROI составляет' in p.text or 'срок окупаемости' in p.text.lower():
        # This is the conclusion paragraph
        if 'Вывод по главе 2' in p.text:
            p.text = "Вывод по главе 2. В ходе практической реализации был разработан программный комплекс, объединяющий: реляционную базу данных PostgreSQL; высокопроизводительный бэкенд на FastAPI; чат-бота для оперативных уведомлений; мини-приложение на React + VKUI с нативным интерфейсом. Проведённое экономическое обоснование подтвердило коммерческую ценность разработки: альтернативный ROI составляет 36,6 %, срок окупаемости — менее 9 месяцев. Система полностью готова к промышленной эксплуатации в отделе МСБ."
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.first_line_indent = Inches(0.49)
            p.paragraph_format.line_spacing = 1.5
            for run in p.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(14)
            continue
            
# We also need to find the specific formula paragraphs if they exist, but she mentioned images for formulas in previous chats.
# If formulas are text:
for p in doc.paragraphs:
    if '73,3' in p.text:
        p.text = p.text.replace('73,3', '36,6')
    if 'менее 7 месяцев' in p.text:
        p.text = p.text.replace('менее 7 месяцев', 'около 9 месяцев')

doc.save('../Гутникова ВКР_ФИНАЛ.docx')
print("Economics math fixed: Added taxes and recalculated ROI.")
