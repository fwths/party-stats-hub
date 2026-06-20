import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { createNativePartyMember } from "../native-engine";
import { db } from "../drizzle.server";
import * as schema from "../../db/schema";

describe("Forge Regression Tests", () => {
  let forgeData: any;

  beforeAll(async () => {
    forgeData = {
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
  });

  const fixturesDir = path.join(process.cwd(), "src", "test", "fixtures");

  function runFixture(filename: string) {
    it(`should preserve output for ${filename}`, () => {
      const p = path.join(fixturesDir, filename);
      if (!fs.existsSync(p)) {
        console.warn(`Fixture ${filename} not found, skipping`);
        return;
      }
      const data = JSON.parse(fs.readFileSync(p, "utf-8"));

      const { state, expected } = data;
      const race = forgeData.species.find((r: any) => r.id === state.raceId);
      const cls = forgeData.classes.find((c: any) => c.id === state.classId);
      const bg = forgeData.backgrounds.find((b: any) => b.id === state.backgroundId);

      const allSpellIds = new Set([
        ...(state.cantripChoices || []),
        ...(state.preparedSpellChoices || []),
        ...Object.values(state.cantripChoicesByClass || {}).flat(),
        ...Object.values(state.preparedSpellChoicesByClass || {}).flat(),
      ]);
      const spells = forgeData.spells.filter((s: any) => allSpellIds.has(s.id));

      const actual = createNativePartyMember(
        state,
        race,
        cls,
        bg,
        undefined,
        undefined,
        spells,
        forgeData.classFeatures,
        forgeData,
      );

      // Compare non-volatile fields (e.g. ignore lastUpdated if any)
      expect(actual.hpMax).toEqual(expected.hpMax);
      expect(actual.abilities).toEqual(expected.abilities);
      expect(actual.skills).toEqual(expected.skills);
      expect(actual.languages).toEqual(expected.languages);
      expect(actual.spells).toEqual(expected.spells);
      expect(actual.proficiencies).toEqual(expected.proficiencies);
    });
  }

  runFixture("fighter-1.json");
  runFixture("wizard-1.json");
});
