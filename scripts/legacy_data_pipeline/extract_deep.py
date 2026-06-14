import re
import json

with open('artificer_full.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Parse Magic Item Plans
plans = []

def parse_plans_table(title, level_req):
    idx = text.find(title)
    if idx == -1: return
    
    end_idx = text.find('Magic Item Plans', idx + len(title))
    if end_idx == -1:
        end_idx = text.find('ARTIFICER SPELL LIST', idx)
    
    chunk = text[idx:end_idx]
    
    # Plans look like:
    # Bag of Holding
    # Item: A bag
    # Cap of Water Breathing
    # Item: A cap
    
    # We can split by newlines, if a line has "Item:" or "Prerequisite:", the previous line was the name.
    lines = [l.strip() for l in chunk.split('\n') if l.strip()]
    
    current_plan = None
    
    for i, line in enumerate(lines):
        if line == title: continue
        if line.startswith("Item:") or line.startswith("Prerequisite:"):
            if current_plan:
                if line.startswith("Prerequisite:"):
                    current_plan["prerequisite"] = line.replace("Prerequisite:", "").strip()
                else:
                    current_plan["description"] = line
        else:
            # It's a new plan name if it doesn't look like part of a description
            if current_plan and "description" not in current_plan:
                # previous line wasn't a name, append
                pass
            else:
                if current_plan:
                    plans.append(current_plan)
                
                # Check if it's a valid plan name (short, capitalized)
                if len(line) < 50 and not line.startswith("If you"):
                    current_plan = {
                        "id": line.lower().replace(' ', '-').replace("'", ""),
                        "name": line,
                        "description": "",
                        "levelRequired": level_req
                    }
    
    if current_plan:
        plans.append(current_plan)

parse_plans_table("Magic Item Plans (Artificer Level 2+)", 2)
parse_plans_table("Magic Item Plans (Artificer Level 6+)", 6)
parse_plans_table("Magic Item Plans (Artificer Level 10+)", 10)
parse_plans_table("Magic Item Plans (Artificer Level 14+)", 14)

# Filter out garbage plans
valid_plans = []
for p in plans:
    if p["name"] and len(p["name"]) > 3 and not "Table" in p["name"]:
        valid_plans.append(p)

# We will just write these to a file
with open('artificer_plans.json', 'w', encoding='utf-8') as f:
    json.dump(valid_plans, f, indent=2)

print("Parsed", len(valid_plans), "Magic Item Plans")

# 2. Extract inner tables for subclasses
# (Example: Experimental Elixir table)
tables = {}

elixir_idx = text.find("Experimental Elixir")
if elixir_idx != -1:
    tables["alchemist"] = {
        "3": {
            "Experimental Elixir": {
                "headers": ["d6", "Effect"],
                "rows": [
                    ["1", "Healing. The drinker regains a number of Hit Points equal to 2d4 plus your Intelligence modifier."],
                    ["2", "Swiftness. The drinker's Speed increases by 10 feet for 1 hour."],
                    ["3", "Resilience. The drinker gains a +1 bonus to AC for 10 minutes."],
                    ["4", "Boldness. The drinker can roll a d4 and add the number rolled to every attack roll and saving throw they make for the next minute."],
                    ["5", "Flight. The drinker gains a Fly Speed of 10 feet for 10 minutes."],
                    ["6", "Transformation. The drinker's body is transformed as if by the Alter Self spell. The drinker determines the transformation caused by the spell, the effects of which last for 10 minutes."]
                ]
            }
        }
    }

with open('artificer_tables.json', 'w', encoding='utf-8') as f:
    json.dump(tables, f, indent=2)

print("Parsed tables")
