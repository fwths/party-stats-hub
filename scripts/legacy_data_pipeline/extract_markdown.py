import os
import pymupdf4llm
from pathlib import Path

books_dir = Path("books")
output_dir = Path("raw_books")
output_dir.mkdir(exist_ok=True)

# Keep track of extraction status
for pdf_file in books_dir.glob("*.pdf"):
    try:
        md_text = pymupdf4llm.to_markdown(str(pdf_file))
        
        # Output file path
        output_file = output_dir / f"{pdf_file.stem}.md"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(md_text)
            
        print(f"Successfully extracted {pdf_file.name} to Markdown!")
    except Exception as e:
        print(f"Error extracting {pdf_file.name}: {e}")
