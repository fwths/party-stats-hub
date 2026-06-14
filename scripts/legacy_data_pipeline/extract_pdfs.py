import fitz
import sys

def extract_pdf_text(pdf_path, output_path):
    print(f"Opening {pdf_path}...")
    doc = fitz.open(pdf_path)
    
    text_content = []
    
    print(f"Extracting {len(doc)} pages...")
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text")
        text_content.append(text)
        
    print(f"Writing to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(text_content))
        
    print("Done!")

if __name__ == "__main__":
    extract_pdf_text("books/Tasha's Cauldron of Everything.pdf", "tashas_raw.txt")
