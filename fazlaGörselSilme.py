import os

folder_path = 'img/' # Görsellerin olduğu klasör

def clean_old_images(directory):
    extensions = (".png", ".jpg", ".jpeg")
    count = 0
    for filename in os.listdir(directory):
        if filename.lower().endswith(extensions):
            os.remove(os.path.join(directory, filename))
            print(f"Silindi: {filename}")
            count += 1
    print(f"\nTemizlik tamam! Toplam {count} eski dosya silindi.")

clean_old_images(folder_path)