import json
import re

with open('artificer_full.txt', 'r', encoding='utf-8') as f:
    text = f.read()

plans = []
def parse_table(title, level):
    start = text.find(title)
    if start == -1: return
    # Find next title or "ARTIFICER SPELL LIST"
    next_titles = ["Magic Item Plans (Artificer Level 6+)", "Magic Item Plans (Artificer Level 10+)", "Magic Item Plans (Artificer Level 14+)", "ARTIFICER SPELL LIST"]
    end = len(text)
    for nt in next_titles:
        if nt == title: continue
        ni = text.find(nt, start + len(title))
        if ni != -1 and ni < end:
            end = ni
            
    chunk = text[start + len(title):end]
    lines = [l.strip() for l in chunk.split('\n') if l.strip()]
    
    current = None
    for line in lines:
        if line.startswith("Item:") or line.startswith("Prerequisite:"):
            if current:
                if line.startswith("Prerequisite:"):
                    current["prerequisite"] = line.replace("Prerequisite:", "").strip()
                else:
                    current["description"] = line
        else:
            if current and not "description" in current and not "prerequisite" in current:
                # previous line wasn't a name, probably a description continuing
                pass
            else:
                if current:
                    plans.append(current)
                # It's a new name if it's short and capitalized
                if len(line) < 40 and not line.startswith("If you"):
                    current = {
                        "id": line.lower().replace(' ', '-').replace("'", "").replace(",", ""),
                        "name": line,
                        "description": "",
                        "levelRequired": level
                    }
    if current:
        plans.append(current)

parse_table("Magic Item Plans (Artificer Level 2+)\n", 2)
parse_table("Magic Item Plans (Artificer Level 6+)\n", 6)
parse_table("Magic Item Plans (Artificer Level 10+)\n", 10)
parse_table("Magic Item Plans (Artificer Level 14+)\n", 14)

valid_plans = []
for p in plans:
    if p["name"] and len(p["name"]) > 3 and "Table" not in p["name"] and "Attunement" not in p["name"]:
        valid_plans.append(p)

with open('artificer_plans.json', 'w', encoding='utf-8') as f:
    json.dump(valid_plans, f, indent=2)

print(f"Extracted {len(valid_plans)} plans")
