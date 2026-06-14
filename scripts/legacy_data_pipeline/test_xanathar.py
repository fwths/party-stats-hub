import re

def extract():
    with open('xanathars_raw.txt', 'r', encoding='utf-8') as f:
        text = f.read()

    # Skip TOC
    idx = text.find('PATH OF THE ANCESTRAL GUARDIAN', 5000)
    end_idx = text.find('PATH OF THE STORM HERALD', idx)
    
    print(text[idx:end_idx][:1000])

if __name__ == "__main__":
    extract()
