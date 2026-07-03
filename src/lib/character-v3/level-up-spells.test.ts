import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { CharacterAggregateSchema, ExactRuleRefSchema, type ExactRuleRef } from "./schema";
import {
  compileLevelUpSpellSelection,
  deriveLevelUpSpellChoicePlans,
  type LevelUpSpellCatalogRecord,
} from "./level-up-spells";

function dresana() {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", "char-132940690.json"), "utf8"),
  );
  return migrateDdbPayloadToCharacterV3({
    payload,
    ownerUserId: "andreas",
    campaignId: "mother-of-bob",
  });
}

function spellRef(name: string, upstreamId: string): ExactRuleRef {
  return ExactRuleRefSchema.parse({
    kind: "spell",
    familyKey: createRuleFamilyKey("spell", name),
    versionKey: createRuleVersionKey({
      kind: "spell",
      sourceId: "XPHB",
      upstreamId,
      contentRevision: "2024",
    }),
    name,
    rulesGeneration: "2024",
    sourceId: "XPHB",
    upstreamId,
    contentRevision: "2024",
    compatibility: "core-2024",
    verification: "verified",
  });
}

describe("Character V3 level-up spell choices", () => {
  it("hydrates exact class spell options and excludes already selected spells", () => {
    const character = dresana();
    const classVersionKey = character.build.levels.at(-1)!.classRef.versionKey;
    const alreadySelected = spellRef("Already Selected", "already-selected");
    const characterWithExistingSpell = {
      ...character,
      build: {
        ...character.build,
        spells: [
          ...character.build.spells,
          {
            id: "spell:already-selected",
            spellRef: alreadySelected,
            spellLevel: 4,
            classVersionKey,
            grantSourceRef: null,
            castingAbility: null,
            mode: "prepared" as const,
            active: true,
            selectedAtCharacterLevel: character.build.levels.length,
            provenance: "native" as const,
            decisionId: null,
          },
        ],
      },
    };
    const catalog: LevelUpSpellCatalogRecord[] = [
      {
        spellRef: alreadySelected,
        level: 4,
        classVersionKeys: [classVersionKey],
      },
      {
        spellRef: spellRef("New Native Spell", "new-native-spell"),
        level: 4,
        classVersionKeys: [classVersionKey],
      },
      { spellRef: spellRef("Too High", "too-high"), level: 9, classVersionKeys: [classVersionKey] },
    ];

    const [plan] = deriveLevelUpSpellChoicePlans({
      character: characterWithExistingSpell,
      classVersionKey,
      requirements: [{ kind: "prepared-spell", count: 1, label: "Choose 1 prepared spell" }],
      spellCatalog: catalog,
      maximumSpellLevel: 4,
    });

    expect(plan).toMatchObject({ readyToSelect: true, count: 1, selectionMode: "prepared" });
    expect(plan.options.map((option) => option.spellRef.name)).toEqual(["New Native Spell"]);
  });

  it("compiles a schema-valid spell decision and spell rows for the next level", () => {
    const character = dresana();
    const classVersionKey = character.build.levels.at(-1)!.classRef.versionKey;
    const [plan] = deriveLevelUpSpellChoicePlans({
      character,
      classVersionKey,
      requirements: [{ kind: "cantrip", count: 1, label: "Choose 1 cantrip" }],
      spellCatalog: [
        {
          spellRef: spellRef("Native Cantrip", "native-cantrip"),
          level: 0,
          classVersionKeys: [classVersionKey],
        },
      ],
      maximumSpellLevel: 4,
    });
    const compiled = compileLevelUpSpellSelection({
      character,
      classVersionKey,
      plan,
      selectedSpellVersionKeys: [plan.options[0].spellRef.versionKey],
      decisionId: "decision:dresana:level-8:cantrip",
    });
    const nextLevel = character.build.levels.length + 1;
    const nextHitDice =
      character.liveState.hitDice.status === "tracked"
        ? {
            ...character.liveState.hitDice,
            pools: character.liveState.hitDice.pools.map((pool) =>
              pool.classVersionKey === classVersionKey
                ? { ...pool, maximum: pool.maximum + 1, remaining: pool.remaining + 1 }
                : pool,
            ),
          }
        : character.liveState.hitDice;

    expect(compiled.decision).toMatchObject({
      type: "spell-selection",
      selectionMode: "cantrip",
      madeAtCharacterLevel: nextLevel,
      provenance: "native",
    });
    expect(compiled.spells[0]).toMatchObject({
      mode: "cantrip",
      spellLevel: 0,
      selectedAtCharacterLevel: nextLevel,
      decisionId: compiled.decision.id,
    });
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          levels: [
            ...character.build.levels,
            {
              characterLevel: nextLevel,
              classLevel: character.build.levels.at(-1)!.classLevel + 1,
              classRef: character.build.levels.at(-1)!.classRef,
              provenance: "native",
            },
          ],
          decisions: [...character.build.decisions, compiled.decision],
          spells: [...character.build.spells, ...compiled.spells],
        },
        liveState: {
          ...character.liveState,
          hitDice: nextHitDice,
        },
        hitPoints: {
          ...character.hitPoints,
          gains: [
            ...character.hitPoints.gains,
            {
              characterLevel: nextLevel,
              method: "fixed",
              hitDieContribution: 7,
              constitutionModifier: 3,
              bonuses: [],
              total: 10,
            },
          ],
        },
      }),
    ).not.toThrow();
  });

  it("rejects duplicate spell selections", () => {
    const character = dresana();
    const classVersionKey = character.build.levels.at(-1)!.classRef.versionKey;
    const [plan] = deriveLevelUpSpellChoicePlans({
      character,
      classVersionKey,
      requirements: [{ kind: "cantrip", count: 2, label: "Choose 2 cantrips" }],
      spellCatalog: [
        { spellRef: spellRef("One", "one"), level: 0, classVersionKeys: [classVersionKey] },
        { spellRef: spellRef("Two", "two"), level: 0, classVersionKeys: [classVersionKey] },
      ],
      maximumSpellLevel: 4,
    });

    expect(() =>
      compileLevelUpSpellSelection({
        character,
        classVersionKey,
        plan,
        selectedSpellVersionKeys: [
          plan.options[0].spellRef.versionKey,
          plan.options[0].spellRef.versionKey,
        ],
        decisionId: "decision:dresana:duplicate-cantrip",
      }),
    ).toThrow(/same spell/);
  });
});
