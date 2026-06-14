import re
import json

with open('artificer_full.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# --- 1. MAGIC ITEM PLANS ---
def parse_plans(level, title):
    start = text.find(title)
    if start == -1: return []
    end = text.find("Magic Item Plans", start + len(title))
    if end == -1: end = text.find("ARTIFICER SPELL LIST", start)
    
    chunk = text[start + len(title):end]
    lines = [l.strip() for l in chunk.split('\n') if l.strip()]
    
    plans = []
    # Lines look like:
    # Magic Item Plan
    # Attunement
    # Alchemy Jug
    # No
    # Bag of Holding
    # No
    
    # Let's skip headers
    skip_headers = ["Magic Item Plan", "Attunement"]
    clean_lines = [l for l in lines if l not in skip_headers and not l.startswith("*") and not l.startswith("†")]
    
    i = 0
    while i < len(clean_lines):
        name = clean_lines[i].replace("†", "").strip()
        i += 1
        if i >= len(clean_lines): break
        attunement = clean_lines[i]
        
        if attunement in ["Yes", "No", "Varies", "No*"]:
            prereq = None
            if attunement == "Yes": prereq = "Requires Attunement"
            elif attunement == "Varies": prereq = "Attunement Varies"
            
            plans.append({
                "id": name.lower().replace(" ", "-").replace(",", "").replace("'", ""),
                "name": name,
                "description": f"Item: {name}",
                "levelRequired": level,
                "prerequisite": prereq
            })
            i += 1
        else:
            # If it's not Yes/No, it might be a multi-line item name?
            # E.g. "Common magic item that isn’t a Potion, a Scroll, or cursed"
            # Actually, "Varies" is the attunement for that one!
            pass
            
    return plans

p2 = parse_plans(2, "Magic Item Plans (Artificer Level 2+)\n")
p6 = parse_plans(6, "Magic Item Plans (Artificer Level 6+)\n")
p10 = parse_plans(10, "Magic Item Plans (Artificer Level 10+)\n")
p14 = parse_plans(14, "Magic Item Plans (Artificer Level 14+)\n")

all_plans = p2 + p6 + p10 + p14

# --- 2. SPELL LIST ---
spell_list = set()
start_spell = text.find("Cantrips (Level 0 Artificer Spells)")
end_spell = text.find("Chapter 2: Character Options")
if start_spell != -1 and end_spell != -1:
    spell_chunk = text[start_spell:end_spell]
    lines = [l.strip() for l in spell_chunk.split('\n') if l.strip()]
    for l in lines:
        if len(l) > 2 and len(l) < 30 and not l.startswith("Level") and not l.startswith("Cantrips"):
            # Clean up the name
            name = l.replace("*", "").strip()
            # Special case for "11/25/25" timestamps
            if "11/25/25" in name or "Eberron:" in name or "https:" in name or "/" in name: continue
            if name.isupper(): continue # Ignore chapter headers if any
            spell_list.add(name.lower())

with open('artificer_final_data.json', 'w', encoding='utf-8') as f:
    json.dump({
        "plans": all_plans,
        "spells": list(spell_list)
    }, f, indent=2)

print(f"Extracted {len(all_plans)} Magic Item Plans.")
print(f"Extracted {len(spell_list)} Spells.")
