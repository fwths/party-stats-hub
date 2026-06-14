import re
import json

with open('artificer_full.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Base class features
base_idx1 = text.find('Level 1: Spellcasting')
base_idx2 = text.find('Alchemist\n')
base_text = text[base_idx1:base_idx2]

features = {str(i): [] for i in range(1, 21)}

matches = list(re.finditer(r'Level (\d+): ([^\n]+)', base_text))
for i, m in enumerate(matches):
    level = m.group(1)
    name = m.group(2).strip()
    
    start_desc = m.end()
    end_desc = matches[i+1].start() if i + 1 < len(matches) else len(base_text)
    
    desc = base_text[start_desc:end_desc].strip()
    
    # clean
    desc = re.sub(r'\d{1,2}/\d{1,2}/\d{2}, \d{1,2}:\d{2} [AP]M.*?https://www.dndbeyond.com/sources/dnd/efota.*?\d{1,3}/162', '', desc, flags=re.DOTALL)
    desc = re.sub(r'Eberron: Forge of the Artificer', '', desc)
    desc = re.sub(r'11/25/25, 7:57 PM', '', desc)
    desc = re.sub(r'https://www.dndbeyond.com[^\s]+', '', desc)
    desc = re.sub(r'\d{1,3}/162', '', desc)
    desc = re.sub(r'\s+', ' ', desc).strip()
    
    if len(desc) > 300:
        desc = desc[:300] + '...'
        
    features[level].append({"name": name, "description": desc})

subclass_names = ["Alchemist", "Armorer", "Artillerist", "Battle Smith", "Cartographer", "Spellwright"]
subclasses = []

for name in subclass_names:
    subclasses.append({
        "id": name.lower().replace(' ', '-'),
        "name": name,
        "description": f"An Artificer specialized as a {name}."
    })

output = {
    "featuresByLevel": features,
    "subclasses": subclasses
}

with open('artificer_data.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2)
