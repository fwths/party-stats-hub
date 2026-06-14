import urllib.request
import json
import re

print("Fetching spells from dnd5eapi.co...")
url = "https://www.dnd5eapi.co/api/spells"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
except Exception as e:
    print("Failed to fetch spells list:", e)
    data = {"results": []}

spells = []

# To save time, let's only fetch a subset or fetch all if it's quick. 
# There are 319 SRD spells. Fetching all might take 30 seconds.
print(f"Found {len(data['results'])} spells. We will fetch them in parallel if possible, or just sequentially.")

# For now, let's just create a basic spells list with their names and minimal info from the main endpoint if we can't fetch all.
# Actually, the user asked for Everything, let's fetch them all using asyncio or ThreadPoolExecutor
import concurrent.futures

def fetch_spell(spell_info):
    spell_url = "https://www.dnd5eapi.co" + spell_info['url']
    req = urllib.request.Request(spell_url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            s = json.loads(response.read().decode())
            return {
                "id": s["index"],
                "name": s["name"],
                "level": s["level"],
                "school": s["school"]["name"],
                "castingTime": s.get("casting_time", ""),
                "range": s.get("range", ""),
                "components": ", ".join(s.get("components", [])),
                "duration": s.get("duration", ""),
                "description": "\n".join(s.get("desc", [])),
                "classes": [c["index"] for c in s.get("classes", [])]
            }
    except Exception as e:
        print("Failed", spell_info['index'])
        return None

with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(fetch_spell, data['results']))

spells = [s for s in results if s is not None]

# Add Homunculus Servant manually
homunculus = {
    "id": "homunculus-servant",
    "name": "Homunculus Servant",
    "level": 2,
    "school": "Conjuration",
    "castingTime": "1 hour or Ritual",
    "range": "10 feet",
    "components": "V, S, M",
    "duration": "Instantaneous",
    "description": "You summon a special homunculus in an unoccupied space within range. This creature uses the Homunculus Servant stat block.",
    "classes": ["artificer"]
}
spells.append(homunculus)

# Write to spells.ts
ts_content = 'import type { SRDSpell } from "./index";\n\nexport const spells: SRDSpell[] = ' + json.dumps(spells, indent=2) + ';\n'

with open('src/data/srd/spells.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Successfully wrote {len(spells)} spells to spells.ts")
