import json
import re

with open('artificer_full.txt', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find("Cantrips (Level 0 Artificer Spells)")
end = text.find("Chapter 2: Character Options", start)
chunk = text[start:end]

lines = [l.strip() for l in chunk.split('\n') if l.strip()]

spells = set()
skip = ["Spell", "School", "Special"]

for i, l in enumerate(lines):
    if l in skip or "Artificer Spells" in l or l.startswith("Level"):
        continue
    
    if i + 1 < len(lines):
        next_line = lines[i+1]
        schools = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"]
        if next_line in schools:
            name = l.replace("*", "").strip()
            # some names have weird chars
            name = re.sub(r'[^a-zA-Z\s]', '', name).strip().lower().replace(" ", "-")
            spells.add(name)

print(f"Extracted {len(spells)} spells")

with open('src/data/srd/spells.ts', 'r', encoding='utf-8') as f:
    spells_content = f.read()

json_str = re.search(r'export const spells: SRDSpell\[\] = (\[.*\]);', spells_content, re.DOTALL)
if json_str:
    spells_db = json.loads(json_str.group(1))
    
    for s in spells_db:
        # id formatting
        sid = s["id"].lower()
        if sid in spells:
            if "artificer" not in s["classes"]:
                s["classes"].append("artificer")
        else:
            if "artificer" in s["classes"]:
                s["classes"].remove("artificer")
                
    new_ts = 'import type { SRDSpell } from "./index";\n\nexport const spells: SRDSpell[] = ' + json.dumps(spells_db, indent=2) + ';\n'
    with open('src/data/srd/spells.ts', 'w', encoding='utf-8') as f:
        f.write(new_ts)
    print("Updated spells.ts")
