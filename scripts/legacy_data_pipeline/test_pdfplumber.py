import pdfplumber
from pathlib import Path

pdf_path = Path("books/Dungeons and Dragons Player's handbook (2024).pdf")

print("Opening PDF with pdfplumber...")
with pdfplumber.open(pdf_path) as pdf:
    # Barbarian is usually around page 46-55 in PHB
    # Let's just extract pages 45 to 55 to be sure we hit Unarmored Defense.
    text = ""
    for i in range(45, 55):
        try:
            page = pdf.pages[i]
            # Extract text preserving layout
            text += f"\n--- PAGE {i} ---\n"
            text += page.extract_text(layout=True) + "\n"
        except Exception as e:
            print(f"Failed on page {i}: {e}")

output_path = Path("raw_books/pdfplumber_test.md")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Saved to pdfplumber_test.md")
