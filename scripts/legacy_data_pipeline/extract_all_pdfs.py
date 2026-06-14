import os
import fitz

def extract_pdf_to_txt(pdf_path, txt_path):
    if not os.path.exists(pdf_path):
        print(f"Skipping {pdf_path}: File not found")
        return
    if os.path.exists(txt_path):
        print(f"Skipping {pdf_path}: Output {txt_path} already exists")
        return

    print(f"Extracting {pdf_path} to {txt_path}...")
    try:
        doc = fitz.open(pdf_path)
        text_content = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text_content.append(page.get_text("text"))
        
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write("\n".join(text_content))
        print(f"Successfully created {txt_path}")
    except Exception as e:
        print(f"Failed to extract {pdf_path}: {e}")

if __name__ == "__main__":
    os.makedirs("raw_books", exist_ok=True)
    
    tasks = [
        ("books/Monster Manual 5e 2024.pdf", "raw_books/monster_manual.txt"),
        ("books/Dungeons and Dragons Player's handbook (2024).pdf", "raw_books/phb_2024.txt"),
        ("books/Tasha's Cauldron of Everything.pdf", "raw_books/tashas.txt"),
        ("books/Xanathar’s Guide to Everything.pdf", "raw_books/xanathars.txt"),
        ("books/Forge of the Artificer.pdf", "raw_books/artificer.txt"),
        ("books/Explorers Guide to Wildemount.pdf", "raw_books/wildemount.txt")
    ]
    
    for pdf, txt in tasks:
        extract_pdf_to_txt(pdf, txt)
        
    print("All extractions finished!")
