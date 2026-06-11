from PIL import Image
import os

img_path = '/Users/maria/.gemini/antigravity/brain/1cfe2b36-56c6-411c-9b9a-30ff9c8e24ad/media__1779089995619.jpg'
out_dir = '/Users/maria/Desktop/bot/frontend/public'
os.makedirs(out_dir, exist_ok=True)

img = Image.open(img_path)
w, h = img.size

quad_w = w // 2
quad_h = h // 2

crop_bottom_margin = int(quad_h * 0.18)

tl = img.crop((0, 0, quad_w, quad_h - crop_bottom_margin))
tr = img.crop((quad_w, 0, w, quad_h - crop_bottom_margin))
bl = img.crop((0, quad_h, quad_w, h - crop_bottom_margin))
br = img.crop((quad_w, quad_h, w, h - crop_bottom_margin))

tl.save(os.path.join(out_dir, 'cat_sad.jpg'))
tr.save(os.path.join(out_dir, 'cat_working.jpg'))
bl.save(os.path.join(out_dir, 'cat_happy.jpg'))
br.save(os.path.join(out_dir, 'cat_party.jpg'))
print("Images saved successfully.")
