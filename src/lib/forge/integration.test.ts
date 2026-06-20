import { describe, it, expect, beforeAll } from "vitest";
import { createNativePartyMember } from "../native-engine";
import { BuilderState } from "../../components/builder/BuilderUtils";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../db/schema";
import { eq } from "drizzle-orm";
import * as path from "path";

describe("Forge Integration Matrix", () => {
  let db: any;

  beforeAll(() => {
    const dbPath = path.resolve(process.cwd(), "sqlite.db");
    const sqlite = new Database(dbPath);
    db = drizzle(sqlite, { schema });
  });

  it("Fighter 1: Baseline martial test", async () => {
    const character: BuilderState = {
      name: "Fighter 1",
      level: 1,
      raceId: "human",
      classId: "fighter",
      abilities: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 10, CHA: 10 },
      customEquipment: [
        { name: "Chain Mail", quantity: 1, type: "Heavy Armor", equipped: true, attuned: false },
        { name: "Longsword", quantity: 1, type: "Martial Weapon", equipped: true, attuned: false },
      ],
      ruleChoices: {
        "fighter-fighting-style": ["defense"],
      },
    };
    const raceData = await db.query.species.findFirst({ where: eq(schema.species.id, "human") });
    const classData = await db.query.classes.findFirst({ where: eq(schema.classes.id, "fighter") });
    const classFeatures = await db.query.classFeatures.findMany({
      where: eq(schema.classFeatures.classId, "fighter"),
    });

    const result = createNativePartyMember(
      character,
      raceData,
      classData,
      null,
      null,
      null,
      [],
      classFeatures,
      {
        activeEffects: [],
        featureActiveEffects: [],
        itemActiveEffects: [],
        spellActiveEffects: [],
        magicItems: [],
        feats: [],
      },
    );
    expect(result.name).toBe("Fighter 1");
    expect(result.hpMax).toBe(12);
    expect(result.speed).toBe(30);
  });

  it("Wizard 1: Spellbook and cantrip validation", async () => {
    const character = {
      name: "Wizard 1",
      level: 1,
      raceId: "high-elf",
      classId: "wizard",
      abilities: { STR: 8, DEX: 14, CON: 14, INT: 16, WIS: 12, CHA: 10 },
    } as any;
    const raceData = await db.query.species.findFirst({ where: eq(schema.species.id, "high-elf") });
    const classData = await db.query.classes.findFirst({ where: eq(schema.classes.id, "wizard") });

    const result = createNativePartyMember(
      character,
      raceData,
      classData,
      null,
      null,
      null,
      [],
      [],
      {
        activeEffects: [],
        featureActiveEffects: [],
        itemActiveEffects: [],
        spellActiveEffects: [],
        magicItems: [],
        feats: [],
      },
    );
    expect(result.name).toBe("Wizard 1");
    expect(result.hpMax).toBe(8); // 6 base + 2 con
  });

  it("Rogue with Expertise", async () => {
    const character = {
      name: "Rogue 1",
      level: 1,
      raceId: "human",
      classId: "rogue",
      abilities: { STR: 10, DEX: 16, CON: 14, INT: 12, WIS: 10, CHA: 12 },
      ruleChoices: { "rogue-expertise": ["stealth", "sleight-of-hand"] },
    } as any;
    const classData = await db.query.classes.findFirst({ where: eq(schema.classes.id, "rogue") });

    const result = createNativePartyMember(
      character,
      null as any,
      classData,
      null,
      null,
      null,
      [],
      [],
      {
        activeEffects: [],
        featureActiveEffects: [],
        itemActiveEffects: [],
        spellActiveEffects: [],
        magicItems: [],
        feats: [],
      },
    );
    expect(result.name).toBe("Rogue 1");
  });

  it("Cleric with prepared spells", async () => {
    const character = {
      name: "Cleric 1",
      level: 1,
      classId: "cleric",
      abilities: { STR: 14, DEX: 10, CON: 14, INT: 10, WIS: 16, CHA: 10 },
    } as any;
    const classData = await db.query.classes.findFirst({ where: eq(schema.classes.id, "cleric") });

    const result = createNativePartyMember(
      character,
      null as any,
      classData,
      null,
      null,
      null,
      [],
      [],
      {
        activeEffects: [],
        featureActiveEffects: [],
        itemActiveEffects: [],
        spellActiveEffects: [],
        magicItems: [],
        feats: [],
      },
    );
    expect(result.name).toBe("Cleric 1");
  });

  it("Multiclass Caster", async () => {
    const character = {
      name: "WizCleric",
      level: 5,
      classId: "wizard",
      abilities: { STR: 8, DEX: 12, CON: 14, INT: 16, WIS: 14, CHA: 10 },
      multiClasses: [{ classId: "cleric", level: 2 }],
    } as any;
    const classData = await db.query.classes.findFirst({ where: eq(schema.classes.id, "wizard") });
    const classData2 = await db.query.classes.findFirst({ where: eq(schema.classes.id, "cleric") });

    const result = createNativePartyMember(
      character,
      null as any,
      classData,
      null,
      null,
      null,
      [],
      [],
      {
        classes: [classData2],
        activeEffects: [],
        featureActiveEffects: [],
        itemActiveEffects: [],
        spellActiveEffects: [],
        magicItems: [],
        feats: [],
      },
    );
    expect(result.name).toBe("WizCleric");
    expect(result.level).toBe(7); // 5 + 2
  });

  it("Species Innate Spellcasting", async () => {
    const character = {
      name: "Tiefling",
      level: 1,
      raceId: "tiefling",
      classId: "fighter",
      abilities: { STR: 16, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 14 },
    } as any;
    const raceData = await db.query.species.findFirst({ where: eq(schema.species.id, "tiefling") });
    const classData = await db.query.classes.findFirst({ where: eq(schema.classes.id, "fighter") });

    const result = createNativePartyMember(
      character,
      raceData,
      classData,
      null,
      null,
      null,
      [],
      [],
      {
        activeEffects: [],
        featureActiveEffects: [],
        itemActiveEffects: [],
        spellActiveEffects: [],
        magicItems: [],
        feats: [],
      },
    );
    expect(result.name).toBe("Tiefling");
  });

  it("Background with Origin Feat", async () => {
    const character = {
      name: "Acolyte",
      level: 1,
      backgroundId: "acolyte",
      classId: "cleric",
      abilities: { STR: 10, DEX: 10, CON: 14, INT: 10, WIS: 16, CHA: 12 },
    } as any;
    const classData = await db.query.classes.findFirst({ where: eq(schema.classes.id, "cleric") });
    const backgroundData = await db.query.backgrounds.findFirst({
      where: eq(schema.backgrounds.id, "acolyte"),
    });
    const feat = await db.query.feats.findFirst({
      where: eq(schema.feats.id, "magic-initiate-cleric"),
    });

    const result = createNativePartyMember(
      character,
      null as any,
      classData,
      backgroundData,
      null,
      feat,
      [],
      [],
      {
        activeEffects: [],
        featureActiveEffects: [],
        itemActiveEffects: [],
        spellActiveEffects: [],
        magicItems: [],
        feats: [],
      },
    );
    expect(result.name).toBe("Acolyte");
    expect(result.background).toBe("Acolyte");
  });

  it("Magic Item Attunement", async () => {
    const character = {
      name: "Attuner",
      level: 1,
      classId: "fighter",
      abilities: { STR: 16, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 10 },
      customEquipment: [
        { name: "Ring of Protection", quantity: 1, isEquipped: true, isAttuned: true },
      ],
    } as any;
    const classData = await db.query.classes.findFirst({ where: eq(schema.classes.id, "fighter") });
    const magicItem = await db.query.magicItems.findFirst({
      where: eq(schema.magicItems.id, "ring-of-protection-dmg"),
    });

    const result = createNativePartyMember(
      character,
      null as any,
      classData,
      null,
      null,
      null,
      [],
      [],
      {
        magicItems: magicItem ? [magicItem] : [],
        activeEffects: [],
        featureActiveEffects: [],
        itemActiveEffects: [],
        spellActiveEffects: [],
        feats: [],
      },
    );
    expect(result.name).toBe("Attuner");
  });
});
