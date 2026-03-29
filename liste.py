import os
import json
from PIL import Image
import pytesseract

# Klasördeki resimleri tara
image_folder = './plastik_cakmaklar' # Resimlerin olduğu klasör
output_json = 'plastik_urunler.json'

products = []

for filename in os.listdir(image_folder):
    if filename.endswith(".png") or filename.endswith(".jpg"):
        img_path = os.path.join(image_folder, filename)
        
        try:
            # Resmi aç ve markanın yazdığı alt kısmı kırp
            img = Image.open(img_path)
            width, height = img.size
            crop_area = (0, height * 0.8, width, height) # Alt %20'lik alan
            brand_img = img.crop(crop_area)
            
            # Yazıyı oku (OCR)
            brand_name = pytesseract.image_to_string(brand_img).strip().split('\n')[0]
            if not brand_name: brand_name = "Bilinmeyen"
            
            # JSON objesini oluştur
            products.append({
                "p_name": f"{brand_name} Plastik Model",
                "p_desc": f"Kaliteli {brand_name} marka plastik çakmak.",
                "p_cat": "Plastik Çakmak",
                "p_brand": brand_name,
                "p_img": f"img/plastik/{filename}",
                "p_pop": False
            })
            print(f"İşlendi: {filename} -> {brand_name}")
        except Exception as e:
            print(f"Hata {filename}: {e}")

# Dosyaya kaydet
with open(output_json, 'w', encoding='utf-8') as f:
    json.dump({"products": products}, f, ensure_ascii=False, indent=2)