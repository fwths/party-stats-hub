import os
import json
import google.generativeai as genai

# Setup Gemini API key
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("No API key found in GEMINI_API_KEY")
    exit(1)
genai.configure(api_key=api_key)

with open('xanathars_raw.txt', 'r', encoding='utf-8') as f:
    raw_text = f.read()

# We can limit the prompt size by finding the Cleric, Druid, and Fighter sections
cleric_idx = raw_text.find("Forge Domain")
druid_idx = raw_text.find("Circle of Dreams")
fighter_idx = raw_text.find("Arcane Archer")
monk_idx = raw_text.find("Way of the Drunken Master")

chunk_text = raw_text[max(0, cleric_idx-1000):monk_idx+1000]

schema = """
You must return a JSON array of objects representing SRDSubclass.
The SRDSubclass has the following structure:
interface SRDSubclass {
    id: string; // hyphenated lowercase
    name: string; // The full name, e.g. "Forge Domain"
    description: string; // Description of the subclass
    levelChosen: number; // For Cleric: 3, Druid: 3, Fighter: 3
    featuresByLevel: Record<number, SRDClassFeature[]>; // The keys are level numbers, e.g. "3", "6", "10", "14", etc. depending on when the class gets features.
}
interface SRDClassFeature {
    id: string; // hyphenated lowercase
    name: string;
    description: string;
    actionType?: "Action" | "Bonus Action" | "Reaction" | "Passive";
}

Rules:
1. ONLY return the JSON array, no markdown formatting.
2. Cleric Domains in Xanathar's: Forge Domain, Grave Domain
3. Druid Circles in Xanathar's: Circle of Dreams, Circle of the Shepherd
4. Fighter Archetypes in Xanathar's: Arcane Archer, Cavalier, Samurai
5. Ensure description text doesn't contain malformed characters or extra line breaks. Use basic markdown.
6. Make sure to assign standard Action, Bonus Action, Reaction, or Passive for actionType.
"""

prompt = f"""
Parse the following text from Xanathar's Guide to Everything to extract the Cleric, Druid, and Fighter subclasses.
Text:
{chunk_text}

{schema}
"""

try:
    model = genai.GenerativeModel('gemini-2.5-pro')
    response = model.generate_content(prompt)
    output = response.text
    if output.startswith("```json"):
        output = output[7:-3]
    elif output.startswith("```"):
        output = output[3:-3]
        
    with open('xanathar_chunk2.json', 'w', encoding='utf-8') as f:
        f.write(output.strip())
        
    print("Successfully wrote xanathar_chunk2.json")
except Exception as e:
    print(f"Error: {e}")
