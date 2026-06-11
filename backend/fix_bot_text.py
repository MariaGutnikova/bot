import sys

path = '/Users/maria/Desktop/bot/backend/app/bot.py'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('keyboard.add(Text("📈 Графики"), color=KeyboardButtonColor.PRIMARY)', 'keyboard.add(Text("📈 Аналитика"), color=KeyboardButtonColor.PRIMARY)')
text = text.replace('elif text in ["📈 графики", "/charts", "графики"]:', 'elif text in ["📈 аналитика", "/charts", "аналитика"]:')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
