# -*- coding: utf-8 -*-
import docx
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = docx.Document('../Гутникова ВКР_ФИНАЛ.docx')

# 1. Update Chapter 2.5 to 2.6 and rewrite economics
# We will find the heading and the paragraphs that belong to economics to replace the text
economics_heading = None
for i, p in enumerate(doc.paragraphs):
    if i < 100: continue
    if p.text.startswith('2.5 Оценка экономической'):
        p.text = p.text.replace('2.5', '2.6')
        economics_heading = p
        break

if economics_heading:
    # Find the paragraphs between economics heading and "2.6.1" (formerly 2.5.1) or the table
    # Actually, let's just insert the new logic right after the heading and delete the old introductory paragraphs
    paragraphs_to_delete = []
    current_p = economics_heading._p.getnext()
    while current_p is not None:
        if current_p.tag.endswith('p'):
            p = docx.text.paragraph.Paragraph(current_p, doc._body)
            if p.text and (p.text.startswith('2.5.1') or p.text.startswith('2.6.1') or 'Таблица 2' in p.text):
                if p.text.startswith('2.5.1'):
                    p.text = p.text.replace('2.5.1', '2.6.1')
                break
            paragraphs_to_delete.append(p)
        current_p = current_p.getnext()
        
    for p in paragraphs_to_delete:
        p_element = p._p
        p_element.getparent().remove(p_element)
        
    new_text = "Важно отметить, что предложенное In-House решение не ставит целью полную замену корпоративной ITSM-системы Naumen, в которой работают тысячи сотрудников компании. Бот выступает в качестве легковесного «мобильного фасада» (посредника) для конкретного отдела МСБ, чьи сотрудники часто работают «в полях». Главный экономический эффект формируется за счет двух факторов. Во-первых, устраняются логистические простои выездных сотрудников, которые ранее не могли оперативно вносить задачи без стационарного ноутбука. Теперь они мгновенно фиксируют поручения в Kanban-доске VK прямо со смартфона, а офисные координаторы при необходимости планово синхронизируют эти агрегированные данные с Naumen. Во-вторых, радикально снижается нагрузка на первую линию технической поддержки (HelpDesk), куда ранее ежедневно поступали массовые обращения от полевых сотрудников из-за обрывов соединения с корпоративным VPN вне зоны стабильного Wi-Fi. Таким образом, разработка решения силами студента на бесплатных Open-Source технологиях (FastAPI, React) позволила создать эффективный буфер без капитальных затрат на закупку дополнительных серверных лицензий."
    
    new_p = economics_heading.insert_paragraph_before(new_text)
    economics_heading._p.addnext(new_p._p)
    new_p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    new_p.paragraph_format.first_line_indent = Inches(0.49)
    new_p.paragraph_format.line_spacing = 1.5
    for run in new_p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)

    # Let's also update subheadings 2.5.2 and 2.5.3 if they exist
    for p in doc.paragraphs:
        if p.text.startswith('2.5.2'):
            p.text = p.text.replace('2.5.2', '2.6.2')
        if p.text.startswith('2.5.3'):
            p.text = p.text.replace('2.5.3', '2.6.3')

# 2. Insert Chapter 2.5 Load Testing BEFORE Chapter 2.6
if economics_heading:
    ch25_head = economics_heading.insert_paragraph_before('2.5 Нагрузочное тестирование серверной части')
    ch25_head.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    ch25_head.paragraph_format.first_line_indent = Inches(0.49)
    for run in ch25_head.runs:
        run.bold = True
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)
        
    text1 = "Для проверки надежности разработанной архитектуры было проведено реальное локальное нагрузочное тестирование (Stress-test) серверной части. Тестирование выполнялось с помощью асинхронной библиотеки httpx, которая эмулировала пакетную отправку 1700 одновременных запросов к API. Результаты подтвердили сверхвысокую отказоустойчивость асинхронной архитектуры фреймворка FastAPI при работе через ASGI-сервер:"
    p1 = economics_heading.insert_paragraph_before(text1)
    p1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p1.paragraph_format.first_line_indent = Inches(0.49)
    p1.paragraph_format.line_spacing = 1.5
    for run in p1.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)
        
    b1 = economics_heading.insert_paragraph_before("• Среднее время ответа (Average Response Time): 318.51 мс")
    b2 = economics_heading.insert_paragraph_before("• Пропускная способность (RPS): 560.56 запросов/сек")
    b3 = economics_heading.insert_paragraph_before("• Количество ошибок (Error Rate): 0.00%")
    
    for b in [b1, b2, b3]:
        b.paragraph_format.first_line_indent = Inches(0.49)
        b.paragraph_format.line_spacing = 1.5
        for run in b.runs:
            run.font.name = 'Times New Roman'
            run.font.size = Pt(14)
            
    img_p = economics_heading.insert_paragraph_before()
    img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img_p.add_run().add_picture('real_locust_report.png', width=Inches(6))
    
    cap_p = economics_heading.insert_paragraph_before("Рисунок 13 — Результаты нагрузочного тестирования API")
    cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in cap_p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)

# 3. Delete Appendix 3
app3_heading = None
for p in doc.paragraphs:
    if 'Приложение 3. Результаты нагрузочного' in p.text:
        app3_heading = p
        break

if app3_heading:
    # Delete everything from App3 to the end of the document
    paragraphs_to_delete = []
    current_p = app3_heading._p
    while current_p is not None:
        p = docx.text.paragraph.Paragraph(current_p, doc._body)
        paragraphs_to_delete.append(p)
        current_p = current_p.getnext()
        
    for p in paragraphs_to_delete:
        p_element = p._p
        p_element.getparent().remove(p_element)

doc.save('../Гутникова ВКР_ФИНАЛ.docx')
print("Successfully restructured diploma.")
