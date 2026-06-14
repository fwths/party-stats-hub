import re
import json

with open('artificer_full.txt', 'r', encoding='utf-8') as f:
    text = f.read()

subclasses = ["Alchemist", "Armorer", "Artillerist", "Battle Smith", "Cartographer"]
subclass_data = {}

for sub in subclasses:
    # Find where the subclass section starts
    start_str = f"{sub.upper()} SUBCLASS"
    start_idx = text.find(start_str)
    
    if start_idx == -1:
        # Maybe it's not all caps or it doesn't have " SUBCLASS"
        start_idx = text.find(f"Level 3: {sub} Spells")
        if start_idx == -1:
            print(f"Could not find start for {sub}")
            continue

    # Find the next subclass section to bound the search
    end_idx = len(text)
    for next_sub in subclasses:
        if next_sub == sub: continue
        next_idx = text.find(f"{next_sub.upper()} SUBCLASS", start_idx + 100)
        if next_idx != -1 and next_idx < end_idx:
            end_idx = next_idx

    sub_text = text[start_idx:end_idx]

    # Find level features
    matches = list(re.finditer(r'Level (\d+): ([^\n]+)', sub_text))
    features = {str(i): [] for i in range(1, 21)}

    for i, m in enumerate(matches):
        level = m.group(1)
        name = m.group(2).strip()
        
        start_desc = m.end()
        end_desc = matches[i+1].start() if i + 1 < len(matches) else len(sub_text)
        
        desc = sub_text[start_desc:end_desc].strip()
        desc = re.sub(r'\d{1,2}/\d{1,2}/\d{2}, \d{1,2}:\d{2} [AP]M.*?https://www.dndbeyond.com/sources/dnd/efota.*?\d{1,3}/162', '', desc, flags=re.DOTALL)
        desc = re.sub(r'Eberron: Forge of the Artificer', '', desc)
        desc = re.sub(r'\s+', ' ', desc).strip()
        
        if len(desc) > 500:
            desc = desc[:500] + '...'

        features[level].append({"name": name, "description": desc})

    subclass_data[sub.lower().replace(' ', '-')] = features

with open('artificer_subclasses.json', 'w', encoding='utf-8') as f:
    json.dump(subclass_data, f, indent=2)

print("Extracted subclass features!")
