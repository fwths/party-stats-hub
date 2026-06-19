export const RAGE_DICTIONARY: Record<string, string> = {
  Active:
    "Enter a standard Rage. You have Resistance to Bludgeoning, Piercing, and Slashing damage, Advantage on Strength checks and saving throws, and deal extra Rage damage on Strength-based attacks.",
  Bear: "While raging, you have Resistance to every damage type except Force, Necrotic, Psychic, and Radiant.",
  Eagle:
    "When you activate your Rage, you can take the Disengage and Dash actions as part of that Bonus Action. While active, you can take a Bonus Action to take both of those actions.",
  Wolf: "While raging, your allies have Advantage on melee attack rolls against any enemy of yours within 5 feet of you.",
  Elk: "While raging, your walking speed increases by 15 feet.",
  Tiger:
    "While raging, you can add 10 feet to your long jump distance and 3 feet to your high jump distance.",
};

export const TOTEM_ASPECT_DICTIONARY: Record<string, string> = {
  Bear: "You gain proficiency in Athletics or Survival (or expertise). Your carrying capacity is doubled, and you have advantage on Strength checks to push, pull, lift, or break things.",
  Eagle:
    "You gain proficiency in Perception or Survival (or expertise). You can see up to 1 mile away without difficulty, and dim light doesn't impose disadvantage on Wisdom (Perception) checks.",
  Elk: "Whether mounted or on foot, your travel pace is doubled, as is the travel pace of up to ten companions while they're within 60 feet of you.",
  Tiger: "You gain proficiency in Athletics, Acrobatics, Stealth, or Survival (or expertise).",
  Wolf: "You gain proficiency in Insight or Survival (or expertise). You can track other creatures while traveling at a fast pace, and move stealthily while traveling at normal pace.",
  Owl: "You gain proficiency in Investigation or Perception (or expertise). You gain Darkvision with a range of 60 feet (or +60 feet if you already have it).",
  Panther:
    "You gain a climbing speed equal to your walking speed. You also gain proficiency in Acrobatics or Stealth (or expertise).",
  Salmon:
    "You gain a swimming speed equal to your walking speed and can breathe underwater. You also gain proficiency in Athletics or Survival (or expertise).",
};

export const WEAPON_MASTERY_DICTIONARY: Record<string, string> = {
  "Battleaxe (Topple)":
    "If you hit a creature with this weapon, you can force it to make a Constitution saving throw (DC 8 + PB + ability modifier) or be knocked prone.",
  "Greataxe (Cleave)":
    "If you hit a creature with a melee attack, you can make a second attack against a different creature within 5 feet of the first target and in your reach. The second attack deals the weapon's base damage.",
  "Greatsword (Graze)":
    "If you miss a creature with an attack roll with this weapon, the target takes damage equal to the ability modifier you used for the attack roll.",
  "Halberd (Cleave)":
    "If you hit a creature with a melee attack, you can make a second attack against a different creature within 5 feet of the first target and in your reach. The second attack deals the weapon's base damage.",
  "Longsword (Sap)":
    "If you hit a creature with this weapon, the target has disadvantage on its next attack roll before the start of your next turn.",
  "Maul (Topple)":
    "If you hit a creature with this weapon, you can force it to make a Constitution saving throw (DC 8 + PB + ability modifier) or be knocked prone.",
  "Warhammer (Push)":
    "If you hit a creature with this weapon, you can push it up to 10 feet away from you.",
  "Shortsword (Vex)":
    "If you hit a creature with this weapon, you have advantage on your next attack roll against that creature before the end of your next turn.",
  "Rapier (Vex)":
    "If you hit a creature with this weapon, you have advantage on your next attack roll against that creature before the end of your next turn.",
  "Dagger (Nick)":
    "You can make the additional attack of Light weapon property as part of the Attack action instead of a Bonus Action.",
  "Scimitar (Nick)":
    "You can make the additional attack of Light weapon property as part of the Attack action instead of a Bonus Action.",
  "Longbow (Slow)":
    "If you hit a creature with this weapon, you can reduce its speed by 10 feet until the start of your next turn.",
  "Shortbow (Slow)":
    "If you hit a creature with this weapon, you can reduce its speed by 10 feet until the start of your next turn.",
  "Pistol (Vex)":
    "If you hit a creature with this weapon, you have advantage on your next attack roll against that creature before the end of your next turn.",
  "Musket (Slow)":
    "If you hit a creature with this weapon, you can reduce its speed by 10 feet until the start of your next turn.",
};

export const METAMAGIC_DICTIONARY: Record<string, string> = {
  "Careful Spell":
    "When you cast a spell that forces other creatures to make a saving throw, you can protect some of those creatures from the spell's full effects. Spend 1 Sorcery Point and choose a number of those creatures up to your Charisma modifier (minimum of one). A chosen creature automatically succeeds on its saving throw.",
  "Distant Spell":
    "When you cast a spell that has a range of 5 feet or greater, you can protect/double the range of the spell. When you cast a spell that has a range of touch, you can spend 1 Sorcery Point to make the range of the spell 30 feet.",
  "Empowered Spell":
    "When you roll damage for a spell, you can spend 1 Sorcery Point to reroll a number of the damage dice up to your Charisma modifier (minimum of one). You must use the new rolls.",
  "Extended Spell":
    "When you cast a spell that has a duration of 1 minute or longer, you can spend 1 Sorcery Point to double its duration, to a maximum duration of 24 hours.",
  "Heightened Spell":
    "When you cast a spell that forces a creature to make a saving throw to resist its effects, you can spend 3 Sorcery Points to give one target of the spell disadvantage on its first saving throw made against the spell.",
  "Quickened Spell":
    "When you cast a spell that has a casting time of 1 action, you can spend 2 Sorcery Points to change the casting time to 1 bonus action for this casting.",
  "Seeking Spell":
    "If you make an attack roll for a spell and miss, you can spend 2 Sorcery Points to reroll the d20, and you must use the new roll.",
  "Subtle Spell":
    "When you cast a spell, you can spend 1 Sorcery Point to cast it without any somatic or verbal components.",
  "Transmuted Spell":
    "When you cast a spell that deals a type of damage from the following list, you can spend 1 Sorcery Point to change that damage type to another one from the list: Acid, Cold, Fire, Lightning, Poison, Thunder.",
  "Twinned Spell":
    "When you cast a spell that targets only one creature and doesn't have a range of self, you can spend a number of Sorcery Points equal to the spell's level to target a second creature in range with the same spell (1 Sorcery Point if the spell is a cantrip).",
};
