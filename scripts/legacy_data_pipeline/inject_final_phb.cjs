const missingFinalSpells = [
  {
    id: "conjure-barrage",
    name: "Conjure Barrage",
    level: 3,
    school: "Conjuration",
    castingTime: "1 action",
    range: "Self (60-foot cone)",
    components: "V, S, M",
    duration: "Instantaneous",
    description:
      "You throw a nonmagical weapon or fire a piece of nonmagical ammunition into the air to create a cone of identical weapons that shoot forward and then disappear. Each creature in a 60-foot cone must succeed on a Dexterity saving throw. A creature takes 3d8 damage on a failed save, or half as much damage on a successful one. The damage type is the same as that of the weapon or ammunition used as a component.",
    classes: ["ranger"],
    source: "Player's Handbook",
  },
  {
    id: "conjure-volley",
    name: "Conjure Volley",
    level: 5,
    school: "Conjuration",
    castingTime: "1 action",
    range: "150 feet",
    components: "V, S, M",
    duration: "Instantaneous",
    description:
      "You fire a piece of nonmagical ammunition from a ranged weapon or throw a nonmagical weapon into the air and choose a point within range. Hundreds of duplicates of the ammunition or weapon fall in a volley from above and then disappear. Each creature in a 40-foot-radius, 20-foot-high cylinder centered on that point must make a Dexterity saving throw. A creature takes 8d8 damage on a failed save, or half as much damage on a successful one. The damage type is the same as that of the ammunition or weapon used as a component.",
    classes: ["ranger"],
    source: "Player's Handbook",
  },
  {
    id: "phantasmal-force",
    name: "Phantasmal Force",
    level: 2,
    school: "Illusion",
    castingTime: "1 action",
    range: "60 feet",
    components: "V, S, M",
    duration: "Concentration, up to 1 minute",
    description:
      "You craft an illusion that takes root in the mind of a creature that you can see within range. The target must make an Intelligence saving throw. On a failed save, you create a phantasmal object, creature, or other visible phenomenon of your choice that is no larger than a 10-foot cube and that is perceivable only to the target for the duration. This spell has no effect on undead or constructs. The phantasm includes sound, temperature, and other stimuli, also evident only to the creature. The target can use its action to examine the phantasm with an Intelligence (Investigation) check against your spell save DC. If the check succeeds, the target realizes that the phantasm is an illusion, and the spell ends. While a target is affected by the spell, the target treats the phantasm as if it were real. The target rationalizes any illogical outcomes from interacting with the phantasm. An affected target can even take damage from the illusion if it represents a creature or hazard. A phantasm created to appear as a creature can attack the target. The target takes 1d6 psychic damage if it is in the phantasm's area or within 5 feet of the phantasm on the target's turn, provided that the illusion is of a creature or hazard that could logically deal damage. The target perceives the damage as a type appropriate to the illusion.",
    classes: ["bard", "sorcerer", "wizard"],
    source: "Player's Handbook",
  },
];

const fs = require("fs");
const spellsFile = "src/data/srd/spells.ts";
let spellsStr = fs.readFileSync(spellsFile, "utf8");

const startIndex = spellsStr.indexOf("[");
const endIndex = spellsStr.lastIndexOf("]");

if (startIndex !== -1 && endIndex !== -1) {
  const arrayStr = spellsStr.substring(startIndex, endIndex + 1);
  let parsedSpells = eval("(" + arrayStr + ")");

  if (parsedSpells) {
    let added = 0;
    for (let spell of missingFinalSpells) {
      if (!parsedSpells.find((s) => s.id === spell.id)) {
        parsedSpells.push(spell);
        added++;
      }
    }
    const newContent = `import { SRDSpell } from './index';\n\nexport const spells: SRDSpell[] = ${JSON.stringify(parsedSpells, null, 2)};\n`;
    fs.writeFileSync(spellsFile, newContent);
    console.log("Added " + added + " final PHB spells.");
  }
}
