import os
import sqlite3

def build_database():
    db_path = 'src/data/reference/rules.db'
    if os.path.exists(db_path):
        os.remove(db_path)
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create the virtual table for Full Text Search
    cursor.execute('''
        CREATE VIRTUAL TABLE rules_fts USING fts5(
            book_title,
            chunk_index UNINDEXED,
            content
        )
    ''')
    
    raw_books_dir = 'raw_books'
    
    for filename in os.listdir(raw_books_dir):
        if not (filename.endswith('.txt') or filename.endswith('.md')):
            continue
            
        filepath = os.path.join(raw_books_dir, filename)
        book_title = filename.replace('.txt', '').replace('.md', '').replace('_', ' ').title()
        
        with open(filepath, 'r', encoding='utf-8') as f:
            text = f.read()
            
        # Split text into manageable paragraphs/chunks for highly specific FTS hits
        chunks = text.split('\n\n')
        
        for i, chunk in enumerate(chunks):
            chunk = chunk.strip()
            if not chunk:
                continue
            
            cursor.execute('''
                INSERT INTO rules_fts (book_title, chunk_index, content)
                VALUES (?, ?, ?)
            ''', (book_title, i, chunk))
            
    conn.commit()
    conn.close()
    print(f"Successfully built SQLite FTS5 database at {db_path}!")

if __name__ == "__main__":
    build_database()
