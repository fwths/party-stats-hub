const fs = require("fs");

const raw = JSON.parse(fs.readFileSync("src/pipeline/raw_barbarian.json", "utf8"));

const descriptions = {
  feature_barbarian_unarmored_defense:
    "While you aren't wearing any armor, your base Armor Class equals 10 plus your Dexterity and Constitution modifiers. You can use a Shield and still gain this benefit.",
  feature_barbarian_weapon_mastery:
    "Your training with weapons allows you to use the mastery properties of two kinds of Simple or Martial Melee weapons of your choice, such as Greataxes and Handaxes. Whenever you finish a Long Rest, you can practice weapon drills and change one of those weapon choices. When you reach certain Barbarian levels, you gain the ability to use the mastery properties of more kinds of weapons, as shown in the Weapon Mastery column of the Barbarian Features table.",
  feature_barbarian_danger_sense:
    "You gain an uncanny sense of when things aren't as they should be, giving you an edge when you dodge perils. You have Advantage on Dexterity saving throws unless you have the Incapacitated condition.",
  feature_barbarian_reckless_attack:
    "You can throw aside all concern for defense to attack with increased ferocity. When you make your first attack roll on your turn, you can decide to attack recklessly. Doing so gives you Advantage on attack rolls using Strength until the start of your next turn, but attack rolls against you have Advantage during that time.",
  feature_barbarian_subclass:
    "You gain a Barbarian subclass of your choice. The Path of the Berserker, Path of the Wild Heart, Path of the World Tree, and Path of the Zealot subclasses are detailed after this class's description. A subclass is a specialization that grants you features at certain Barbarian levels. For the rest of your career, you gain each of your subclass's features that are of your Barbarian level or lower.",
  feature_barbarian_primal_knowledge:
    "You gain proficiency in another skill of your choice from the skill list available to Barbarians at level 1. In addition, while your Rage is active, you can channel primal power when you attempt certain tasks; whenever you make an ability check using one of the following skills, you can make it as a Strength check even if it normally uses a different ability: Acrobatics, Intimidation, Perception, Stealth, or Survival. When you use this ability, your Strength represents primal power coursing through you, honing your agility, bearing, and senses.",
  feature_barbarian_asi_4:
    "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify. You gain this feature again at Barbarian levels 8, 12, and 16.",
  feature_barbarian_extra_attack:
    "You can attack twice instead of once whenever you take the Attack action on your turn.",
  feature_barbarian_fast_movement:
    "Your speed increases by 10 feet while you aren't wearing Heavy armor.",
  feature_barbarian_subclass_6: "You gain a feature from your Barbarian subclass.",
  feature_barbarian_feral_instinct:
    "Your instincts are so honed that you have Advantage on Initiative rolls.",
  feature_barbarian_instinctive_pounce:
    "As part of the Bonus Action you take to enter your Rage, you can move up to half your Speed.",
  feature_barbarian_asi_8:
    "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify. You gain this feature again at Barbarian levels 8, 12, and 16.",
  feature_barbarian_brutal_strike:
    "If you use Reckless Attack, you can forgo any Advantage on one Strength-based attack roll of your choice on your turn. The chosen attack roll mustn't have Disadvantage. If the chosen attack roll hits, the target takes an extra 1d10 damage of the same type dealt by the weapon or Unarmed Strike, and you can cause one Brutal Strike effect of your choice. You have the following effect options.\nForceful Blow. The target is pushed 15 feet straight away from you. You can then move up to half your Speed straight toward the target without provoking Opportunity Attacks.\nHamstring Blow. The target's Speed is reduced by 15 feet until the start of your next turn. A target can be affected by only one Hamstring Blow at a time- the most recent one.",
  feature_barbarian_subclass_10: "You gain a feature from your Barbarian subclass.",
  feature_barbarian_relentless_rage:
    "Your Rage can keep you fighting despite grievous wounds. If you drop to 0 Hit Points while your Rage is active and don't die outright, you can make a DC 10 Constitution saving throw. If you succeed, your Hit Points instead change to a number equal to twice your Barbarian level. Each time you use this feature after the first, the DC increases by 5. When you finish a Short or Long Rest, the DC resets to 10.",
  feature_barbarian_asi_12:
    "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify. You gain this feature again at Barbarian levels 8, 12, and 16.",
  feature_barbarian_improved_brutal_strike:
    "You have honed new ways to attack furiously. The following effects are now among your Brutal Strike options.\nStaggering Blow. The target has Disadvantage on the next saving throw it makes, and it can't make Opportunity Attacks until the start of your next turn.\nSundering Blow. Before the start of your next turn, the next attack roll made by another creature against the target gains a +5 bonus to the roll. An attack roll can gain only one Sundering Blow bonus.",
  feature_barbarian_subclass_14: "You gain a feature from your Barbarian subclass.",
  feature_barbarian_persistent_rage:
    "When you roll Initiative, you can regain all expended uses of Rage. After you regain uses of Rage in this way, you can't do so again until you finish a Long Rest.\nIn addition, your Rage is so fierce that it now lasts for 10 minutes without you needing to do anything to extend it from round to round. Your Rage ends early if you have the Unconscious condition (not just the Incapacitated condition) or don Heavy armor.",
  feature_barbarian_asi_16:
    "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify. You gain this feature again at Barbarian levels 8, 12, and 16.",
  feature_barbarian_improved_brutal_strike_17:
    "The extra damage of your Brutal Strike increases to 2d10. In addition, you can use two different Brutal Strike effects whenever you use your Brutal Strike feature.",
  feature_barbarian_indomitable_might:
    "If your total for a Strength check or Strength saving throw is less than your Strength score, you can use that score in place of the total.",
  feature_barbarian_epic_boon:
    "You gain an Epic Boon feat (see chapter 5) or another feat of your choice for which you qualify. Boon of Irresistible Offense is recommended.",
  feature_barbarian_primal_champion:
    "You embody primal power. Your Strength and Constitution scores increase by 4, to a maximum of 25.",
};

for (const level in raw.featuresByLevel) {
  for (const feature of raw.featuresByLevel[level]) {
    if (descriptions[feature.id]) {
      feature.description = descriptions[feature.id];
    }
  }
}

fs.writeFileSync("src/pipeline/barbarian_final.json", JSON.stringify(raw, null, 2));
console.log("Done.");
