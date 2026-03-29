import os
from PIL import Image

# Görsellerin olduğu klasör yolu (Örn: 'img/' veya 'brands/')
folder_path = 'img/' 

def convert_to_webp(directory):
    count = 0
    for filename in os.listdir(directory):
        if filename.lower().endswith((".png", ".jpg", ".jpeg")):
            # Dosya adını ve uzantısını ayır
            name, ext = os.path.splitext(filename)
            
            # Görseli aç
            img_path = os.path.join(directory, filename)
            img = Image.open(img_path)
            
            # WebP olarak kaydet (quality 80-90 idealdir)
            # method 6 en yavaş ama en iyi sıkıştırmayı yapar
            new_filename = name + ".webp"
            img.save(os.path.join(directory, new_filename), "WEBP", quality=85, method=6)
            
            print(f"Dönüştürüldü: {filename} -> {new_filename}")
            count += 1
            
            # İsteğe bağlı: Eski dosyayı silmek istersen alttaki satırı aktif et:
            os.remove(img_path)

    print(f"\nİşlem tamam! Toplam {count} görsel dönüştürüldü.")

# Fonksiyonu çalıştır
convert_to_webp(folder_path)