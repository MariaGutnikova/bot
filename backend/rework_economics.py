# -*- coding: utf-8 -*-
import docx
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = docx.Document('../Гутникова ВКР_ФИНАЛ.docx')

new_text = "Сравнение затрат в данном случае базируется на повышении операционной эффективности полевых (выездных) сотрудников. В отделе МСБ из 50 человек значительная часть регулярно работает вне офиса (на выездных встречах с клиентами, объектах). Ранее такие сотрудники физически не могли оперативно закрывать или обновлять статусы задач без наличия корпоративного ноутбука: им приходилось либо специально возвращаться в офис, либо тратить в среднем по 45 минут в день на попытки подключиться к тяжеловесному десктопному порталу Naumen через нестабильный мобильный VPN. Внедрение адаптивного мобильного VK-бота полностью решило эту проблему. Теперь управление задачами осуществляется в один клик прямо со смартфона «на ходу» (on-the-go). Основной экономический эффект (ROI) формируется именно за счет монетизации сэкономленного времени полевых сотрудников: устранение логистического простоя конвертируется в прямую прибыль (увеличение количества проведенных встреч и обработанных заявок). При этом разработка решения силами студента на Open-Source технологиях (FastAPI, React) свела капитальные корпоративные затраты к минимуму."

# Replace the previous economic paragraphs
paragraphs_to_delete = []
for i, p in enumerate(doc.paragraphs):
    if 'Сравнение затрат (TCO) в данном случае базируется' in p.text or 'Кроме того, устраняется критическая проблема' in p.text:
        paragraphs_to_delete.append(p)

if paragraphs_to_delete:
    # Insert new text before the first deleted paragraph
    first_p = paragraphs_to_delete[0]
    new_p = first_p.insert_paragraph_before(new_text)
    new_p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    new_p.paragraph_format.first_line_indent = Inches(0.49)
    new_p.paragraph_format.line_spacing = 1.5
    for run in new_p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)
        
    # Delete the old ones
    for p in paragraphs_to_delete:
        p_element = p._p
        p_element.getparent().remove(p_element)

doc.save('../Гутникова ВКР_ФИНАЛ.docx')
print("Economics rewritten for field employees.")
