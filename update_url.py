import sys

path = '/Users/maria/Desktop/bot/frontend/src/App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

import re
# Replace cloudflare URL with the new pinggy URL
text = re.sub(r'folding-broker-hopefully-replace\.trycloudflare\.com', 'yxzxs-152-53-82-214.run.pinggy-free.link', text)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
