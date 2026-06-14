import fitz
from pathlib import Path
import os

books_dir = Path("books")
output_dir = Path("raw_books")
output_dir.mkdir(exist_ok=True)

def sort_dnd_blocks(blocks, page_width):
    # Sort blocks by column (Left vs Right) to prevent horizontal sentence mixing
    def sort_key(b):
        if b[6] != 0: # Not text
            return (999, 0, 0)
            
        x0, y0, x1, y1 = b[:4]
        center_x = (x0 + x1) / 2
        width = x1 - x0
        
        # If the block spans more than 60% of the page width, it's a full-width block (like a table)
        col = 0 if center_x < page_width / 2 else 1
        if width > page_width * 0.6:
            col = 0 
            
        # Round Y to nearest 10 pixels to group horizontal text slightly
        rounded_y = round(y0 / 10) * 10
        return (col, rounded_y, x0)
        
    # Filter only text blocks
    text_blocks = [b for b in blocks if b[6] == 0]
    text_blocks.sort(key=sort_key)
    return text_blocks

for pdf_file in books_dir.glob("*.pdf"):
    print(f"Extracting {pdf_file.name} using block-sorting engine...")
    try:
        doc = fitz.open(pdf_file)
        markdown_lines = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            blocks = page.get_text("blocks")
            sorted_blocks = sort_dnd_blocks(blocks, page.rect.width)
            
            markdown_lines.append(f"\n\n## --- PAGE {page_num + 1} ---\n\n")
            
            for b in sorted_blocks:
                # b[4] is the text content
                text = b[4].replace('\n', ' ').strip()
                if text:
                    markdown_lines.append(text + "\n\n")
                    
        output_file = output_dir / f"{pdf_file.stem}.md"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.writelines(markdown_lines)
            
        print(f"Successfully extracted {pdf_file.name} to {output_file}!")
    except Exception as e:
        print(f"Failed to extract {pdf_file.name}: {e}")
