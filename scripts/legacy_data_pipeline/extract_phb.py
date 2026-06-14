import fitz
import sys

pdf_path = "books/Dungeons and Dragons Player's handbook (2024).pdf"
out_path = "phb_full.txt"

print(f"Extracting text from {pdf_path}...")
try:
    doc = fitz.open(pdf_path)
    with open(out_path, "w", encoding="utf-8") as out:
        for i, page in enumerate(doc):
            if i % 50 == 0:
                print(f"Processing page {i}/{len(doc)}")
            text = page.get_text()
            out.write(text)
            out.write("\n")
    print(f"Finished writing to {out_path}")
except Exception as e:
    print(f"Error: {e}")
