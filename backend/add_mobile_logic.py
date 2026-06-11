import docx
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = docx.Document('../Гутникова ВКР_ФИНАЛ.docx')

# Update the economics text
for p in doc.paragraphs:
    if 'устраняя потерю 45 минут рабочего времени' in p.text:
        new_text = "Кроме того, устраняется критическая проблема жесткой привязки к рабочему месту: ранее выездные сотрудники физически не могли оперативно вносить или обновлять задачи без наличия корпоративного ноутбука и стационарного офисного интернета. Теперь, благодаря адаптивному интерфейсу VK Mini App, управление задачами осуществляется прямо со смартфона «на ходу» (on-the-go), что радикально повышает мобильность и гибкость бизнес-процессов отдела."
        
        # Add a new paragraph with this text right after the current one
        new_p = p.insert_paragraph_before(new_text)
        new_p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        new_p.paragraph_format.first_line_indent = Inches(0.49)
        new_p.paragraph_format.line_spacing = 1.5
        for run in new_p.runs:
            run.font.name = 'Times New Roman'
            run.font.size = Pt(14)
            
        p._p.addnext(new_p._p)
        break

doc.save('../Гутникова ВКР_ФИНАЛ.docx')
print("Updated successfully.")
