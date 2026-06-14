import json
import re
import os

def clean_txt(t):
    t = t.replace('“', '"').replace('”', '"').replace('’', "'").replace('‘', "'")
    t = t.replace('–', '-')
    t = re.sub(r'\s+', ' ', t)
    return t.strip()

def map_feat_name_to_id(name):
    name = name.split('(see')[0].split('(')[0].strip().lower()
    return name.replace(' ', '-').replace("'", '')

def clean_equipment_item(item):
    item = item.replace('(same as above)', '').strip()
    item = item.replace('Callig- rapher\'s Sl pplies', 'Calligrapher\'s Supplies')
    item = item.replace('Calligrapher\'s Sup-', 'Calligrapher\'s Supplies')
    item = item.replace('Calligrapher\'s Supplies plies', 'Calligrapher\'s Supplies')
    item = item.replace('Rob .', 'Robe')
    item = item.replace('Rob.', 'Robe')
    item = item.strip('; ')
    return item

def parse_phb_backgrounds():
    with open('raw_books/Dungeons and Dragons Player\'s handbook (2024).md', encoding='utf-8') as f:
        content = f.read()
    
    start = content.find('## --- PAGE 178 ---')
    end = content.find('## --- PAGE 187 ---')
    section = content[start:end]
    
    pages = section.split('## --- PAGE ')
    
    bg_list = [
        'Acolyte', 'Artisan', 'Charlatan', 'Criminal', 'Entertainer', 'Farmer', 'Guard', 'Guide', 
        'Hermit', 'Merchant', 'Noble', 'Sage', 'Sailor', 'Scribe', 'Soldier', 'Wayfarer'
    ]
    
    parsed_bgs = []
    
    page_index = 0
    for page_text in pages:
        if not page_text.strip():
            continue
        lines = page_text.split('\n')
        page_num_match = re.match(r'^(\d+)', lines[0])
        if not page_num_match:
            continue
        page_num = int(page_num_match.group(1))
        
        # We only care about pages 179 to 186
        if page_num < 179 or page_num > 186:
            continue
            
        bg1_name = bg_list[2 * page_index]
        bg2_name = bg_list[2 * page_index + 1]
        
        flat = re.sub(r'\s+', ' ', page_text)
        # Clean some junk
        flat = flat.replace('C!1oose', 'Choose')
        flat = flat.replace('Choose A or 8:', 'Choose A or B:')
        flat = flat.replace('or {B)', 'or (B)')
        flat = flat.replace('or (C) 50 GP', 'or (B) 50 GP')
        flat = flat.replace('or (8) 50 GP', 'or (B) 50 GP')
        flat = flat.replace('or (8) SO GP', 'or (B) 50 GP')
        flat = flat.replace('or (B) SO GP', 'or (B) 50 GP')
        flat = flat.replace('or (B) SOGP', 'or (B) 50 GP')
        flat = flat.replace('Calligrapher\'s Sup- I I· f\' plies', 'Calligrapher\'s Supplies')
        flat = flat.replace('Calligrapher\'s Sup- I  I·  f\' plies', 'Calligrapher\'s Supplies')
        flat = flat.replace('Calligrapher\'s Sup- plies', 'Calligrapher\'s Supplies')
        
        abilities = re.findall(r'Ability Scores:\s*(.*?)\s*(?:Feat:|Skill Proficiencies:|Tool Proficiency:|Equipment:)', flat)
        feats = re.findall(r'Feat:\s*(.*?)\s*(?:Ability Scores:|Skill Proficiencies:|Tool Proficiency:|Equipment:)', flat)
        skills = re.findall(r'Skill Proficiencies:\s*(.*?)\s*(?:Ability Scores:|Feat:|Tool Proficiency:|Equipment:)', flat)
        tools = re.findall(r'Tool Proficiency:\s*(.*?)\s*(?:Ability Scores:|Feat:|Skill Proficiencies:|Equipment:)', flat)
        equipment = re.findall(r'Equipment:\s*Choose A or [B8C]:\s*(.*?)\s*(?:or \(B\)\s*50\s*GP|or \(B\)\s*SO\s*GP|or \(B\)\s*SOGP|or \(C\)\s*50\s*GP|$)', flat)
        
        # Descriptions: find paragraph text that are descriptions
        cleaned_paragraphs = []
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue
            if line.startswith('CHAPTER') or line.startswith('##') or line.isdigit():
                continue
            if 'CHAPTER 4' in line or 'CHARACTER ORIGINS' in line:
                continue
            if any(k in line for k in ['Ability Scores:', 'Feat:', 'Skill Proficiencies:', 'Tool Proficiency:', 'Equipment:']):
                continue
            if len(line) < 30 and not line.endswith('.'):
                continue
            cleaned_paragraphs.append(line)
            
        desc_paragraphs = []
        for p in cleaned_paragraphs:
            if len(p) > 100 and (p.startswith('You ') or p.startswith('Once ') or p.startswith('Your ') or p.startswith('Battle ') or p.startswith('Fate ')):
                desc_paragraphs.append(p)
        
        if len(desc_paragraphs) < 2:
            desc_paragraphs = cleaned_paragraphs[-2:]
            
        bg1_desc = desc_paragraphs[0] if len(desc_paragraphs) > 0 else ""
        bg2_desc = desc_paragraphs[1] if len(desc_paragraphs) > 1 else ""
        
        # Parse ability scores
        abilities1 = [x.strip() for x in abilities[0].split(',')] if len(abilities) > 0 else []
        abilities2 = [x.strip() for x in abilities[1].split(',')] if len(abilities) > 1 else []
        
        # Parse skills
        skills1 = [x.strip() for x in skills[0].split(' and ')] if len(skills) > 0 else []
        skills2 = [x.strip() for x in skills[1].split(' and ')] if len(skills) > 1 else []
        
        # Parse tools
        tools1 = [tools[0].split('(see')[0].strip()] if len(tools) > 0 else []
        tools2 = [tools[1].split('(see')[0].strip()] if len(tools) > 1 else []
        
        # Parse starting equipment
        equip1 = [clean_equipment_item(x) for x in equipment[0].replace('(A)', '').split(',')] if len(equipment) > 0 else []
        equip2 = [clean_equipment_item(x) for x in equipment[1].replace('(A)', '').split(',')] if len(equipment) > 1 else []
        
        # Map stats for Bg 1
        bg1 = {
            'id': bg1_name.lower(),
            'name': bg1_name,
            'description': clean_txt(bg1_desc),
            'abilityScoreIncreases': {
                'choose': 3,
                'options': abilities1,
                'amount': 1
            },
            'skillProficiencies': skills1,
            'toolProficiencies': tools1,
            'startingEquipment': equip1,
            'originFeatId': map_feat_name_to_id(feats[0]) if len(feats) > 0 else "",
            'source': "Player's Handbook (2024)",
            'page': page_num - 1
        }
        
        # Map stats for Bg 2
        bg2 = {
            'id': bg2_name.lower(),
            'name': bg2_name,
            'description': clean_txt(bg2_desc),
            'abilityScoreIncreases': {
                'choose': 3,
                'options': abilities2,
                'amount': 1
            },
            'skillProficiencies': skills2,
            'toolProficiencies': tools2,
            'startingEquipment': equip2,
            'originFeatId': map_feat_name_to_id(feats[1]) if len(feats) > 1 else "",
            'source': "Player's Handbook (2024)",
            'page': page_num - 1
        }
        
        # Specific fixes
        if bg1['name'] == 'Entertainer':
            bg1['skillProficiencies'] = ['Acrobatics', 'Performance']
        if bg2['name'] == 'Soldier':
            bg2['toolProficiencies'] = ["Gaming Set"]
        if bg2['name'] == 'Artisan':
            bg2['toolProficiencies'] = ["Artisan's Tools"]
        if bg1['name'] == 'Guard':
            bg1['toolProficiencies'] = ["Gaming Set"]
        if bg1['name'] == 'Noble':
            bg1['toolProficiencies'] = ["Gaming Set"]
            
        parsed_bgs.append(bg1)
        parsed_bgs.append(bg2)
        
        page_index += 1
        
    return parsed_bgs

def parse_artificer_backgrounds():
    with open('raw_books/Forge of the Artificer.md', encoding='utf-8') as f:
        content = f.read()
        
    bg_names = [
        'Aberrant Heir', 'Archaeologist', 'House Agent', 'House Cannith Heir', 'House Deneith Heir',
        'House Ghallanda Heir', 'House Jorasco Heir', 'House Kundarak Heir', 'House Lyrandar Heir',
        'House Medani Heir', 'House Orien Heir', 'House Phiarlan Heir', 'House Sivis Heir',
        'House Tharashk Heir', 'House Thuranni Heir', 'House Vadalis Heir', 'Inquisitive'
    ]
    
    parsed_bgs = []
    
    for name in bg_names:
        idx = content.find(name + '\n\nAbility Scores:')
        if idx == -1:
            pattern = re.compile(rf'{re.escape(name)}[\s\S]*?Ability Scores:', re.I)
            m = pattern.search(content)
            if m:
                idx = m.start()
            else:
                print(f"Warning: Could not find section for Artificer background: {name}")
                continue
                
        next_idx = len(content)
        for other_name in bg_names:
            if other_name == name:
                continue
            oidx = content.find(other_name + '\n\nAbility Scores:', idx + 10)
            if oidx == -1:
                pattern = re.compile(rf'{re.escape(other_name)}[\s\S]*?Ability Scores:', re.I)
                om = pattern.search(content, idx + 10)
                if om:
                    oidx = om.start()
            if oidx != -1 and oidx < next_idx:
                next_idx = oidx
                
        block = content[idx:next_idx]
        
        page_search = content[:idx]
        page_matches = list(re.finditer(r'## --- PAGE (\d+) ---', page_search))
        page_num = int(page_matches[-1].group(1)) if page_matches else 34
        
        block_lines = block.split('\n')
        cleaned_lines = []
        for line in block_lines:
            line = line.strip()
            if not line:
                continue
            if 'https://www.dndbeyond.com' in line or 'ARTIST:' in line or '## --- PAGE' in line:
                continue
            if 'Eberron: Forge of the Artificer' in line or '↑ BACKGROUNDS' in line:
                continue
            cleaned_lines.append(line)
            
        clean_block_text = '\n'.join(cleaned_lines)
        
        abilities_match = re.search(r'Ability Scores:\s*(.*)', clean_block_text)
        feat_match = re.search(r'Feat:\s*(.*)', clean_block_text)
        skills_match = re.search(r'Skill Proficiencies:\s*(.*)', clean_block_text)
        tools_match = re.search(r'Tool Proficiency:\s*(.*)', clean_block_text)
        equipment_match = re.search(r'Equipment:\s*Choose A or B:\s*(.*?)(?:or \(B\)\s*50\s*GP|\n\n|$)', clean_block_text, re.S)
        
        desc = ""
        equip_idx = clean_block_text.find('Equipment:')
        if equip_idx != -1:
            post_equip = clean_block_text[equip_idx:]
            post_lines = post_equip.split('\n')[2:] 
            desc_lines = []
            for dl in post_lines:
                dl = dl.strip()
                if not dl:
                    continue
                if any(x in dl for x in ['Ability Scores:', 'Feat:', 'Skill Proficiencies:', 'Tool Proficiency:', 'Equipment:']):
                    break
                desc_lines.append(dl)
            desc = ' '.join(desc_lines)
            
        abilities = [x.strip() for x in abilities_match.group(1).split(',')] if abilities_match else []
        feat_val = feat_match.group(1).strip() if feat_match else ""
        skills = [x.strip() for x in skills_match.group(1).split(' and ')] if skills_match else []
        tools = [tools_match.group(1).split('(see')[0].strip().replace('’', "'")] if tools_match else []
        
        for i in range(len(tools)):
            if "Artisan's Tools" in tools[i]:
                tools[i] = "Artisan's Tools"
            elif "Gaming Set" in tools[i] and "Thieves" not in tools[i] and "Navigator" not in tools[i]:
                tools[i] = "Gaming Set"
            elif "Musical Instrument" in tools[i] and "Navigator" not in tools[i]:
                tools[i] = "Musical Instrument"
                
        equip_val = equipment_match.group(1).strip() if equipment_match else ""
        equip_val = equip_val.replace('(A)', '').strip()
        equipment_list = [clean_equipment_item(x) for x in equip_val.split(',')] if equip_val else []
        
        bg = {
            'id': name.lower().replace(' ', '-').replace("’", ""),
            'name': name,
            'description': clean_txt(desc),
            'abilityScoreIncreases': {
                'choose': 3,
                'options': abilities,
                'amount': 1
            },
            'skillProficiencies': skills,
            'toolProficiencies': tools,
            'startingEquipment': equipment_list,
            'originFeatId': map_feat_name_to_id(feat_val),
            'source': "Eberron: Forge of the Artificer",
            'page': page_num
        }
        parsed_bgs.append(bg)
        
    return parsed_bgs

def clean_weapon_text(text):
    text = re.sub(r'\s+', ' ', text)
    text = text.replace('Simple Ranged Weapons', '').replace('Martial Melee Weapons', '').replace('Martial Ranged Weapons', '')
    text = re.sub(r'\s+\d+$', '', text) 
    
    text = text.replace('1 d8', '1d8').replace('1 d6', '1d6')
    text = text.replace('1 dl O', '1d10').replace('1 dl0', '1d10').replace('l dlO', '1d10').replace('l dl0', '1d10')
    text = text.replace('l d12', '1d12').replace('l Piercing', '1 Piercing')
    text = text.replace('Arrow}', 'Arrow)').replace('{Range', '(Range')
    
    text = text.replace('Range 20/60}', 'Range 20/60)').replace('Range 30/120}', 'Range 30/120)')
    text = text.replace('Range 80/320; Bolt}', 'Range 80/320; Bolt)')
    text = text.replace('Range 30/120; Bullet}', 'Range 30/120; Bullet)')
    text = text.replace('Range 20/60}', 'Range 20/60)')
    
    text = text.replace('216.', '2 lb.').replace('316.', '3 lb.').replace('616.', '6 lb.').replace('2 16.', '2 lb.').replace('S lb.', '5 lb.')
    text = text.replace('S GP', '5 GP').replace('SGP', '5 GP').replace('SO GP', '50 GP').replace('SOGP', '50 GP')
    text = text.replace('l GP', '1 GP').replace('2GP', '2 GP').replace('2SP', '2 SP')
    
    text = re.sub(r'\b[l1]\s*d\s*([0-9a-zA-Z]+)\b', lambda m: '1d' + m.group(1).replace('lO', '10').replace('lo', '10').replace('l2', '12').replace('l', '1').replace('O', '10'), text)
    text = re.sub(r'\bl\s+(Piercing|Bludgeoning|Slashing)\b', r'1 \1', text)
    
    if "Heavy Crossbow" in text:
        text = "Heavy Crossbow 1d10 Piercing Ammunition (Range 100/400; Bolt), Heavy, Loading, Two-Handed Push 18 lb. 50 GP"
        
    return text.strip()

def parse_weapons():
    with open('raw_books/Dungeons and Dragons Player\'s handbook (2024).md', encoding='utf-8') as f:
        content = f.read()
        
    idx = content.find('## --- PAGE 216 ---')
    idx_end = content.find('## --- PAGE 217 ---')
    page_text = content[idx:idx_end]
    
    text_flat = re.sub(r'\s+', ' ', page_text)
    
    ordered_weapons = [
        'Club', 'Dagger', 'Greatclub', 'Handaxe', 'Javelin', 'Light Hammer', 'Mace', 'Quarterstaff', 'Sickle', 'Spear',
        'Dart', 'Light Crossbow', 'Shortbow', 'Sling',
        'Battleaxe', 'Flail', 'Glaive', 'Greataxe', 'Greatsword', 'Halberd', 'Lance', 'Longsword', 'Maul', 'Morningstar', 'Pike', 'Rapier', 'Scimitar', 'Shortsword', 'Trident', 'Warhammer', 'War Pick', 'Whip',
        'Blowgun', 'Hand Crossbow', 'Heavy Crossbow', 'Longbow', 'Musket', 'Pistol'
    ]
    
    positions = []
    curr = 0
    for name in ordered_weapons:
        pos = text_flat.find(name, curr)
        if pos == -1:
            if name == 'Shortsword':
                pos = text_flat.find('Short sword', curr)
            elif name == 'Heavy Crossbow':
                pos = text_flat.find('Heavy Crossbow', curr)
        if pos != -1:
            positions.append((name, pos))
            curr = pos + len(name)
        else:
            print(f"Warning: Weapon {name} not found in text.")
            
    weapons = []
    
    simple_melee = ["Club", "Dagger", "Greatclub", "Handaxe", "Javelin", "Light Hammer", "Mace", "Quarterstaff", "Sickle", "Spear"]
    simple_ranged = ["Dart", "Light Crossbow", "Shortbow", "Sling"]
    martial_melee = ["Battleaxe", "Flail", "Glaive", "Greataxe", "Greatsword", "Halberd", "Lance", "Longsword", "Maul", "Morningstar", "Pike", "Rapier", "Scimitar", "Shortsword", "Trident", "Warhammer", "War Pick", "Whip"]
    martial_ranged = ["Blowgun", "Hand Crossbow", "Heavy Crossbow", "Longbow", "Musket", "Pistol"]
    
    def get_cat_type(name):
        if name in simple_melee: return "Simple", "Melee"
        if name in simple_ranged: return "Simple", "Ranged"
        if name in martial_melee: return "Martial", "Melee"
        if name in martial_ranged: return "Martial", "Ranged"
        return "", ""

    for i in range(len(positions)):
        n, p = positions[i]
        next_p = positions[i+1][1] if i + 1 < len(positions) else len(text_flat)
        raw_segment = text_flat[p:next_p].strip()
        segment = clean_weapon_text(raw_segment)
        
        cat, wtype = get_cat_type(n)
        
        rem = segment[len(n):].strip()
        
        dmg_match = re.match(r'^(\d+d\d+|\b1\b)\s+(Bludgeoning|Piercing|Slashing)', rem, re.I)
        if not dmg_match:
            print(f"Warning: Could not parse damage for {n} from segment: {segment}")
            continue
            
        dmg_dice = dmg_match.group(1).lower()
        dmg_type = dmg_match.group(2).capitalize()
        
        rem = rem[dmg_match.end():].strip()
        
        mastery_match = re.search(r'\b(Cleave|Graze|Nick|Push|Sap|Slow|Topple|Vex)\b', rem, re.I)
        if not mastery_match:
            mastery = None
            properties_str = rem
            rem_post = ""
        else:
            mastery = mastery_match.group(1).capitalize()
            properties_str = rem[:mastery_match.start()].strip()
            rem_post = rem[mastery_match.end():].strip()
            
        weight = 0
        weight_match = re.search(r'(\d+(?:\/\d+)?)\s*lb\.', rem_post)
        if weight_match:
            w_str = weight_match.group(1)
            if '/' in w_str:
                num, denom = w_str.split('/')
                weight = float(num) / float(denom)
            else:
                weight = float(w_str)
        else:
            if n != "Sling":
                print(f"Warning: Could not parse weight for {n} from: {rem_post}")
                
        cost_gp = 0
        cost_match = re.search(r'(\d+)\s*(GP|SP|CP)', rem_post, re.I)
        if cost_match:
            c_val = float(cost_match.group(1))
            c_unit = cost_match.group(2).upper()
            if c_unit == 'GP':
                cost_gp = c_val
            elif c_unit == 'SP':
                cost_gp = c_val / 10.0
            elif c_unit == 'CP':
                cost_gp = c_val / 100.0
        else:
            print(f"Warning: Could not parse cost for {n} from: {rem_post}")
            
        properties = []
        versatile_dice = None
        range_normal = None
        range_long = None
        
        properties_str = properties_str.strip(', ')
        
        versatile_match = re.search(r'Versatile\s*\((.*?)\)', properties_str, re.I)
        if versatile_match:
            versatile_dice = versatile_match.group(1).replace(' ', '').lower()
            properties.append("Versatile")
            
        range_match = re.search(r'Range\s+(\d+)\/(\d+)', properties_str, re.I)
        if range_match:
            range_normal = int(range_match.group(1))
            range_long = int(range_match.group(2))
            
        for prop in ["Finesse", "Light", "Thrown", "Heavy", "Reach", "Two-Handed", "Ammunition", "Loading"]:
            if prop in properties_str:
                properties.append(prop)
                
        w = {
            'id': n.lower().replace(' ', '-'),
            'name': n,
            'category': cat,
            'type': wtype,
            'costGp': cost_gp,
            'damageDice': dmg_dice,
            'damageType': dmg_type,
            'versatileDice': versatile_dice,
            'rangeNormal': range_normal,
            'rangeLong': range_long,
            'mastery': mastery,
            'propertiesJson': json.dumps(properties),
            'weight': weight
        }
        weapons.append(w)
        
    return weapons

def parse_armor():
    armor_data = [
        {
            'id': 'padded-armor', 'name': 'Padded Armor', 'category': 'Light', 'costGp': 5,
            'acBase': 11, 'acModifier': 'Dexterity', 'acMaxModifier': None,
            'strengthRequirement': None, 'stealthDisadvantage': True, 'weight': 8
        },
        {
            'id': 'leather-armor', 'name': 'Leather Armor', 'category': 'Light', 'costGp': 10,
            'acBase': 11, 'acModifier': 'Dexterity', 'acMaxModifier': None,
            'strengthRequirement': None, 'stealthDisadvantage': False, 'weight': 10
        },
        {
            'id': 'studded-leather-armor', 'name': 'Studded Leather Armor', 'category': 'Light', 'costGp': 45,
            'acBase': 12, 'acModifier': 'Dexterity', 'acMaxModifier': None,
            'strengthRequirement': None, 'stealthDisadvantage': False, 'weight': 13
        },
        {
            'id': 'hide-armor', 'name': 'Hide Armor', 'category': 'Medium', 'costGp': 10,
            'acBase': 12, 'acModifier': 'Dexterity', 'acMaxModifier': 2,
            'strengthRequirement': None, 'stealthDisadvantage': False, 'weight': 12
        },
        {
            'id': 'chain-shirt', 'name': 'Chain Shirt', 'category': 'Medium', 'costGp': 50,
            'acBase': 13, 'acModifier': 'Dexterity', 'acMaxModifier': 2,
            'strengthRequirement': None, 'stealthDisadvantage': False, 'weight': 20
        },
        {
            'id': 'scale-mail', 'name': 'Scale Mail', 'category': 'Medium', 'costGp': 50,
            'acBase': 14, 'acModifier': 'Dexterity', 'acMaxModifier': 2,
            'strengthRequirement': None, 'stealthDisadvantage': True, 'weight': 45
        },
        {
            'id': 'breastplate', 'name': 'Breastplate', 'category': 'Medium', 'costGp': 400,
            'acBase': 14, 'acModifier': 'Dexterity', 'acMaxModifier': 2,
            'strengthRequirement': None, 'stealthDisadvantage': False, 'weight': 20
        },
        {
            'id': 'half-plate-armor', 'name': 'Half Plate Armor', 'category': 'Medium', 'costGp': 750,
            'acBase': 15, 'acModifier': 'Dexterity', 'acMaxModifier': 2,
            'strengthRequirement': None, 'stealthDisadvantage': True, 'weight': 40
        },
        {
            'id': 'ring-mail', 'name': 'Ring Mail', 'category': 'Heavy', 'costGp': 30,
            'acBase': 14, 'acModifier': None, 'acMaxModifier': None,
            'strengthRequirement': None, 'stealthDisadvantage': True, 'weight': 40
        },
        {
            'id': 'chain-mail', 'name': 'Chain Mail', 'category': 'Heavy', 'costGp': 75,
            'acBase': 16, 'acModifier': None, 'acMaxModifier': None,
            'strengthRequirement': 13, 'stealthDisadvantage': True, 'weight': 55
        },
        {
            'id': 'splint-armor', 'name': 'Splint Armor', 'category': 'Heavy', 'costGp': 200,
            'acBase': 17, 'acModifier': None, 'acMaxModifier': None,
            'strengthRequirement': 15, 'stealthDisadvantage': True, 'weight': 60
        },
        {
            'id': 'plate-armor', 'name': 'Plate Armor', 'category': 'Heavy', 'costGp': 1500,
            'acBase': 18, 'acModifier': None, 'acMaxModifier': None,
            'strengthRequirement': 15, 'stealthDisadvantage': True, 'weight': 65
        },
        {
            'id': 'shield', 'name': 'Shield', 'category': 'Shield', 'costGp': 10,
            'acBase': 2, 'acModifier': None, 'acMaxModifier': None,
            'strengthRequirement': None, 'stealthDisadvantage': False, 'weight': 6
        }
    ]
    return armor_data

def main():
    print("Parsing PHB backgrounds...")
    phb_bgs = parse_phb_backgrounds()
    print(f"Parsed {len(phb_bgs)} PHB backgrounds.")
    
    print("Parsing Artificer backgrounds...")
    art_bgs = parse_artificer_backgrounds()
    print(f"Parsed {len(art_bgs)} Artificer backgrounds.")
    
    all_bgs = phb_bgs + art_bgs
    print(f"Total backgrounds: {len(all_bgs)}")
    
    # Save backgrounds
    os.makedirs('.agents/worker_m2_bg_equipment', exist_ok=True)
    with open('.agents/worker_m2_bg_equipment/backgrounds.json', 'w', encoding='utf-8') as f:
        json.dump(all_bgs, f, indent=2)
        
    print("Parsing Weapons...")
    weapons = parse_weapons()
    print(f"Parsed {len(weapons)} weapons.")
    with open('.agents/worker_m2_bg_equipment/weapons.json', 'w', encoding='utf-8') as f:
        json.dump(weapons, f, indent=2)
        
    print("Parsing Armor...")
    armor = parse_armor()
    print(f"Parsed {len(armor)} armor.")
    with open('.agents/worker_m2_bg_equipment/armor.json', 'w', encoding='utf-8') as f:
        json.dump(armor, f, indent=2)
        
    print("Parsing complete! Saved data to JSON.")

if __name__ == '__main__':
    main()
