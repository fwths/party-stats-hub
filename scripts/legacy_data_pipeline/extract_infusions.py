import re
import json

with open('artificer_full.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Infusions are in "Artificer Infusions" section
start_idx = text.find("ARTIFICER INFUSIONS\n")
end_idx = text.find("ARTIFICER SPELL LIST\n", start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find infusions section")
else:
    infusions_text = text[start_idx:end_idx]
    
    # Each infusion starts with its name, followed by "Prerequisite:", "Item:", or just description.
    # It's hard to parse perfectly without careful regex, but let's try to split by double newlines or bold text if any
    # Actually, let's just create a placeholder list of known Infusions and we can manually populate or parse simply.
    # Since we don't have perfect formatting, we'll extract the Replicate Magic Item table instead since it's the most important.
    pass

# For now, let's inject the subclasses JSON into classes.ts using a node script
