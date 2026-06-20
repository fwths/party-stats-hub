import fs from "fs";
import path from "path";
import { createNativePartyMember } from "../lib/native-engine";
import { db } from "../lib/drizzle.server";
import * as schema from "../db/schema";

async function run() {
  console.log("Loading data from sqlite...");
  const forgeData: any = {
    classes: await db.select().from(schema.classes),
    species: await db.select().from(schema.species),
    speciesVariants: await db.select().from(schema.speciesVariants),
    subclasses: await db.select().from(schema.subclasses),
    backgrounds: await db.select().from(schema.backgrounds),
    feats: await db.select().from(schema.feats),
    spells: await db.select().from(schema.spells),
    classSpells: await db.select().from(schema.classSpells),
    classFeatures: await db.select().from(schema.classFeatures),
    languages: await db.select().from(schema.languages),
    activeEffects: await db.select().from(schema.activeEffects),
    featureActiveEffects: await db.select().from(schema.featureActiveEffects),
    itemActiveEffects: await db.select().from(schema.itemActiveEffects),
    spellActiveEffects: await db.select().from(schema.spellActiveEffects),
    magicItems: await db.select().from(schema.magicItems),
    weapons: await db.select().from(schema.weapons),
    armor: await db.select().from(schema.armor),
    skills: await db.select().from(schema.skills),
    senses: await db.select().from(schema.senses),
    conditions: await db.select().from(schema.conditions),
    rulesActions: await db.select().from(schema.rulesActions),
    optionalFeatures: await db.select().from(schema.optionalFeatures),
    charOptions: await db.select().from(schema.charOptions),
    mundaneGear: await db.select().from(schema.mundaneGear),
    weaponMasteries: await db.select().from(schema.weaponMasteries),
    itemProperties: await db.select().from(schema.itemProperties),
    itemTypes: await db.select().from(schema.itemTypes),
    itemTypeAdditionalEntries: await db.select().from(schema.itemTypeAdditionalEntries),
    itemGroups: await db.select().from(schema.itemGroups),
    magicVariants: await db.select().from(schema.magicVariants),
    itemCardReferences: await db.select().from(schema.itemCardReferences),
    challengeRatings: await db.select().from(schema.challengeRatings),
    creatureBuilderEntries: await db.select().from(schema.creatureBuilderEntries),
  };

  const humanRace = forgeData.species.find((s: any) => s.name === "Human");
  const fighterClass = forgeData.classes.find((c: any) => c.name === "Fighter");
  const wizardClass = forgeData.classes.find((c: any) => c.name === "Wizard");
  const acolyteBackground = forgeData.backgrounds.find((b: any) => b.name === "Acolyte");
  const firebolt = forgeData.spells.find((s: any) => s.name === "Fire Bolt");
  const mageArmor = forgeData.spells.find((s: any) => s.name === "Mage Armor");
  const magicMissile = forgeData.spells.find((s: any) => s.name === "Magic Missile");

  if (!humanRace || !fighterClass) throw new Error("Could not find base entities");

  function saveFixture(name: string, state: any, race: any, cls: any, bg: any, spells: any[]) {
    const result = createNativePartyMember(
      state,
      race,
      cls,
      bg,
      undefined, // subclass
      undefined, // originFeat
      spells,
      forgeData.classFeatures,
      forgeData,
    );

    const fixture = { state, expected: result };
    fs.writeFileSync(`src/test/fixtures/${name}.json`, JSON.stringify(fixture, null, 2), "utf-8");
    console.log(`Generated ${name}.json`);
  }

  // Fighter 1
  const fighterState = {
    name: "Fighter One",
    level: 1,
    raceId: humanRace.id,
    classId: fighterClass.id,
    backgroundId: acolyteBackground.id,
    abilities: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 10, CHA: 10 },
    abilityBonuses: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 }, // human
    featureChoices: {},
    classEquipmentOption: "opt1",
    backgroundEquipmentOption: "opt1",
    ruleChoices: {},
  };
  saveFixture("fighter-1", fighterState, humanRace, fighterClass, acolyteBackground, []);

  // Wizard 1
  const wizardState = {
    name: "Wizard One",
    level: 1,
    raceId: humanRace.id,
    classId: wizardClass.id,
    backgroundId: acolyteBackground.id,
    abilities: { STR: 8, DEX: 14, CON: 14, INT: 16, WIS: 12, CHA: 10 },
    abilityBonuses: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 }, // human
    featureChoices: {},
    cantripChoices: [firebolt.id],
    cantripChoicesByClass: { [wizardClass.id]: [firebolt.id] },
    preparedSpellChoices: [mageArmor.id, magicMissile.id],
    preparedSpellChoicesByClass: { [wizardClass.id]: [mageArmor.id, magicMissile.id] },
    classEquipmentOption: "opt1",
    backgroundEquipmentOption: "opt1",
    ruleChoices: {},
  };
  saveFixture("wizard-1", wizardState, humanRace, wizardClass, acolyteBackground, [
    firebolt,
    mageArmor,
    magicMissile,
  ]);
  process.exit(0);
}

run().catch(console.error);
