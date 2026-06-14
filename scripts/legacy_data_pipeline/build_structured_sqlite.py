import os
import sqlite3
import re
from pathlib import Path

def build_structured_database():
    db_path = 'src/data/reference/rules.db'
    if os.path.exists(db_path):
        os.remove(db_path)
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create structured table
    cursor.execute('''
        CREATE TABLE rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_title TEXT,
            chapter TEXT,
            section TEXT,
            content TEXT
        )
    ''')
    
    # Create the virtual table for Full Text Search
    cursor.execute('''
        CREATE VIRTUAL TABLE rules_fts USING fts5(
            book_title,
            chapter,
            section,
            content,
            content='rules',
            content_rowid='id'
        )
    ''')
    
    raw_books_dir = Path('raw_books')
    
    for md_file in raw_books_dir.glob('*.md'):
        book_title = md_file.stem.replace('_', ' ').title()
        
        with open(md_file, 'r', encoding='utf-8') as f:
            text = f.read()
            
        current_chapter = "Introduction"
        current_section = "General"
        
        # Split text into paragraphs
        paragraphs = text.split('\n\n')
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
                
            # Check for Markdown headers
            if para.startswith('# '):
                current_chapter = para[2:].strip()
                current_section = "General"
            elif para.startswith('## '):
                current_section = para[3:].strip()
            elif para.startswith('### '):
                # Optionally track sub-sections if needed, but keeping it at section is usually enough
                pass
                
            # Insert into base table
            cursor.execute('''
                INSERT INTO rules (book_title, chapter, section, content)
                VALUES (?, ?, ?, ?)
            ''', (book_title, current_chapter, current_section, para))
            
            # The FTS table can be updated via triggers, or inserted directly here.
            # Using triggers is standard for content='...' FTS tables.
            
    # Set up FTS triggers to auto-update
    cursor.execute('''
        CREATE TRIGGER rules_ai AFTER INSERT ON rules BEGIN
            INSERT INTO rules_fts(rowid, book_title, chapter, section, content)
            VALUES (new.id, new.book_title, new.chapter, new.section, new.content);
        END;
    ''')
    
    cursor.execute('''
        CREATE TRIGGER rules_ad AFTER DELETE ON rules BEGIN
            INSERT INTO rules_fts(rules_fts, rowid, book_title, chapter, section, content)
            VALUES ('delete', old.id, old.book_title, old.chapter, old.section, old.content);
        END;
    ''')
    
    cursor.execute('''
        CREATE TRIGGER rules_au AFTER UPDATE ON rules BEGIN
            INSERT INTO rules_fts(rules_fts, rowid, book_title, chapter, section, content)
            VALUES ('delete', old.id, old.book_title, old.chapter, old.section, old.content);
            INSERT INTO rules_fts(rowid, book_title, chapter, section, content)
            VALUES (new.id, new.book_title, new.chapter, new.section, new.content);
        END;
    ''')
    
    # Since we already inserted data BEFORE creating the trigger, we must populate FTS5 manually
    cursor.execute('''
        INSERT INTO rules_fts(rowid, book_title, chapter, section, content)
        SELECT id, book_title, chapter, section, content FROM rules;
    ''')
    
    conn.commit()
    conn.close()
    print(f"Successfully built structured SQLite FTS5 database at {db_path}!")

if __name__ == "__main__":
    build_structured_database()
