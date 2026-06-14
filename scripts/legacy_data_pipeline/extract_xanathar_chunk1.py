import re
import json

def parse_subclass(text, name, class_levels):
    # This heuristic extracts features based on common D&D level patterns
    features_by_level = {}
    for level in class_levels:
        # Find feature name and description
        # e.g., "Feature Name\nStarting at 3rd level..."
        # We will split the text by level markers
        marker = f"at {level}th level"
        if level == 3: marker = "at 3rd level"
        if level == 1: marker = "at 1st level"
        if level == 2: marker = "at 2nd level"
        
        matches = re.finditer(r'([A-Z][A-Za-z \']+)\n(?:[A-Z].*?|)(' + marker + r'|At ' + str(level) + r'(?:st|nd|rd|th) level)', text, re.IGNORECASE)
        features_by_level[level] = []
        for match in matches:
            feature_name = match.group(1).strip()
            # Rough extraction of description (until next newline block or level marker)
            start_desc = match.end(1)
            features_by_level[level].append({
                "name": feature_name.replace('\n', ' '),
                "description": "See source text" # We'll refine this
            })
    return {"id": name.lower().replace(" ", "-"), "name": name, "featuresByLevel": features_by_level}

def main():
    with open('xanathars_raw.txt', 'r', encoding='utf-8') as f:
        text = f.read()
        text = text.replace('\ufb01', 'fi').replace('\ufb02', 'fl')

    subclasses = [
        ("Path of the Ancestral Guardian", [3, 6, 10, 14]),
        ("Path of the Storm Herald", [3, 6, 10, 14]),
        ("Path of the Zealot", [3, 6, 10, 14]),
    ]
    
    results = []
    for sc_name, levels in subclasses:
        idx = text.find(sc_name.upper(), 5000)
        if idx == -1: idx = text.find(sc_name, 5000)
        if idx != -1:
            end_idx = text.find("PATH OF", idx + 100)
            if end_idx == -1: end_idx = idx + 4000
            chunk = text[idx:end_idx]
            results.append(parse_subclass(chunk, sc_name, levels))
            
    with open('xanathar_barbarian.json', 'w') as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()
