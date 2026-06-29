import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV2 } from "../character-v2/migrate-ddb";
import { migrateCharacterV2ToV3, migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import {
  CharacterAggregateSchema,
  ExactRuleRefSchema,
  HitPointLedgerSchema,
  maximumHitPoints,
} from "./schema";

const fixtures = [
  { id: 97349530, owner: "qemuel", level: 7, caster: true },
  { id: 131296315, owner: "nikos", level: 7, caster: true },
  { id: 131593533, owner: "eleni", level: 6, caster: true },
  { id: 132900149, owner: "alexia", level: 6, caster: true },
  { id: 132940690, owner: "andreas", level: 6, caster: false },
] as const;

function payload(id: number): unknown {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", `char-${id}.json`), "utf8"),
  );
}

function v2Options(id: number) {
  return id === 97349530
    ? {
        excludedFeatDefinitions: [
          {
            definitionId: 2048517,
            reason: "Player confirmed that Qemuel does not have a Dark Bargain.",
          },
        ],
      }
    : undefined;
}

function migrate(index = 4) {
  const fixture = fixtures[index];
  return migrateDdbPayloadToCharacterV3({
    payload: payload(fixture.id),
    ownerUserId: fixture.owner,
    campaignId: "mother-of-bob",
    v2MigrationOptions: v2Options(fixture.id),
  });
}

describe("Character V3 hardened migration", () => {
  it.each(fixtures)("strictly represents DDB character $id", (fixture) => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(fixture.id),
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(CharacterAggregateSchema.parse(character)).toEqual(character);
    expect(character.build.schemaVersion).toBe(3);
    expect(character.build.levels).toHaveLength(fixture.level);
    expect(character.identity.campaignId).toBe("mother-of-bob");
    expect(character.profile.currencies).toEqual(
      expect.objectContaining({ cp: expect.any(Number), gp: expect.any(Number) }),
    );
    expect(maximumHitPoints(character.hitPoints)).toBeGreaterThan(0);
    expect(character.hitPoints.baseline).toMatchObject({
      throughCharacterLevel: fixture.level,
      method: "imported-baseline",
    });
    expect(character.build.spells.length > 0).toBe(fixture.caster);
    expect(character.build.levels.every((level) => level.classRef.versionKey.includes("@"))).toBe(
      true,
    );
  });

  it("survives a strict JSON round trip", () => {
    const character = migrate(2);
    expect(CharacterAggregateSchema.parse(JSON.parse(JSON.stringify(character)))).toEqual(
      character,
    );
  });

  it("preserves Qemuel's explicit Dark Bargain exclusion as an auditable resolution", () => {
    const qemuel = migrate(0);
    expect(qemuel.resolutions).toContainEqual({
      id: "resolution:ddb:exclude:2048517",
      type: "exclude-imported-definition",
      sourceSystem: "ddb",
      sourceDefinitionId: "2048517",
      reason: "Player confirmed that Qemuel does not have a Dark Bargain.",
    });
    expect(
      qemuel.build.decisions.some(
        (decision) =>
          decision.type === "rule-selection" &&
          decision.selections.some((selection) => selection.name === "Dark Bargain"),
      ),
    ).toBe(false);
  });

  it("marks a pure V2 migration as blocked when its spell snapshot is unavailable", () => {
    const fixture = fixtures[2];
    const v2 = migrateDdbPayloadToCharacterV2(
      payload(fixture.id),
      fixture.owner,
      v2Options(fixture.id),
    );
    const v3 = migrateCharacterV2ToV3(v2, { campaignId: "mother-of-bob" });
    expect(v3.build.spells).toEqual([]);
    expect(v3.migrationIssues).toContainEqual(
      expect.objectContaining({ code: "V3_SPELL_SNAPSHOT_NOT_PROVIDED", severity: "blocking" }),
    );
  });
});

describe("Character V3 adversarial invariants", () => {
  it("rejects a spoofed exact rule version key", () => {
    const ref = migrate().build.levels[0].classRef;
    expect(() => ExactRuleRefSchema.parse({ ...ref, versionKey: "class:fake@fake" })).toThrow(
      /exact rule version key/,
    );
  });

  it("rejects verified legacy content", () => {
    const ref = migrate().build.speciesRef;
    expect(() =>
      ExactRuleRefSchema.parse({
        ...ref,
        compatibility: "legacy",
        verification: "verified",
      }),
    ).toThrow(/current 2024-compatible/);
  });

  it("rejects an HP gain whose total hides its components", () => {
    expect(() =>
      HitPointLedgerSchema.parse({
        baseline: {
          throughCharacterLevel: 1,
          maximum: 15,
          method: "native-first-level",
          verified: true,
        },
        gains: [
          {
            characterLevel: 2,
            method: "fixed",
            hitDieContribution: 7,
            constitutionModifier: 3,
            bonuses: [{ sourceRef: null, label: "Tough", amount: 2 }],
            total: 10,
          },
        ],
      }),
    ).toThrow(/Expected HP gain 12/);
  });

  it("rejects a level not accounted for by the HP ledger", () => {
    const character = migrate(2);
    const last = character.build.levels.at(-1)!;
    const malformed = {
      ...character,
      build: {
        ...character.build,
        levels: [
          ...character.build.levels,
          {
            ...last,
            characterLevel: last.characterLevel + 1,
            classLevel: last.classLevel + 1,
          },
        ],
      },
    };
    expect(() => CharacterAggregateSchema.parse(malformed)).toThrow(
      /account for every character level/,
    );
  });

  it("rejects current HP above ledger-derived maximum", () => {
    const character = migrate();
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        liveState: {
          ...character.liveState,
          currentHp: maximumHitPoints(character.hitPoints) + 1,
        },
      }),
    ).toThrow(/derived maximum HP/);
  });

  it("rejects duplicate decisions and dangling spell decisions", () => {
    const character = migrate(2);
    const decision = {
      id: "decision:one",
      type: "rule-selection" as const,
      madeAtCharacterLevel: 1,
      provenance: "native" as const,
      selectionKind: "feat" as const,
      sourceRef: null,
      selections: [character.build.speciesRef],
    };
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: { ...character.build, decisions: [decision, decision] },
      }),
    ).toThrow(/IDs must be unique/);
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: character.build.spells.map((spell, index) =>
            index === 0 ? { ...spell, decisionId: "decision:missing" } : spell,
          ),
        },
      }),
    ).toThrow(/unknown decision/);
  });

  it("rejects a typed choice whose selected rule has the wrong kind", () => {
    const character = migrate();
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          decisions: [
            {
              id: "decision:not-a-feat",
              type: "rule-selection",
              madeAtCharacterLevel: 1,
              provenance: "native",
              selectionKind: "feat",
              sourceRef: null,
              selections: [character.build.speciesRef],
            },
          ],
        },
      }),
    ).toThrow(/feat decision cannot select species/);
  });

  it("rejects a spell instance that disagrees with its decision", () => {
    const character = migrate(2);
    const spell = character.build.spells[0];
    const decision = {
      id: "decision:spell",
      type: "spell-selection" as const,
      madeAtCharacterLevel: character.build.levels.length,
      provenance: "native" as const,
      classVersionKey: spell.classVersionKey,
      selectionMode: spell.mode,
      sourceRef: null,
      spellVersionKeys: [spell.spellRef.versionKey],
    };
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          decisions: [decision],
          spells: character.build.spells.map((selection, index) =>
            index === 0
              ? { ...selection, decisionId: decision.id, mode: "granted" as const }
              : selection,
          ),
        },
      }),
    ).toThrow(/does not match its typed decision/);
  });

  it("requires exactly one class or grant source for every spell instance", () => {
    const character = migrate(2);
    const classSpell = character.build.spells.find((spell) => spell.classVersionKey !== null)!;
    const replace = (spell: typeof classSpell) =>
      character.build.spells.map((entry) => (entry.id === spell.id ? spell : entry));
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: replace({ ...classSpell, grantSourceRef: character.build.backgroundRef }),
        },
      }),
    ).toThrow(/exactly one class or grant source/);
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: replace({ ...classSpell, classVersionKey: null, grantSourceRef: null }),
        },
      }),
    ).toThrow(/exactly one class or grant source/);
  });

  it("keeps attunement limits rule-derived instead of hardcoding three", () => {
    const character = migrate();
    const items = Array.from({ length: 4 }, (_, index) => ({
      id: `custom:item:${index}`,
      definitionRef: null,
      name: `Custom attuned item ${index}`,
      quantity: 1,
      equipped: true,
      attuned: true,
      containerId: null,
      provenance: "custom" as const,
      charges: null,
    }));
    expect(CharacterAggregateSchema.parse({ ...character, items }).items).toHaveLength(4);
  });

  it("rejects missing and self-referential item containers", () => {
    const character = migrate();
    const item = {
      id: "custom:item",
      definitionRef: null,
      name: "Bag",
      quantity: 1,
      equipped: false,
      attuned: false,
      containerId: "missing:item",
      provenance: "custom" as const,
      charges: null,
    };
    expect(() => CharacterAggregateSchema.parse({ ...character, items: [item] })).toThrow(
      /container does not exist/,
    );
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        items: [{ ...item, containerId: item.id }],
      }),
    ).toThrow(/cannot contain itself/);
  });

  it("rejects multi-item container cycles", () => {
    const character = migrate();
    const item = (id: string, containerId: string) => ({
      id,
      definitionRef: null,
      name: id,
      quantity: 1,
      equipped: false,
      attuned: false,
      containerId,
      provenance: "custom" as const,
      charges: null,
    });
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        items: [item("bag:a", "bag:b"), item("bag:b", "bag:a")],
      }),
    ).toThrow(/cannot form a cycle/);
  });

  it("rejects arbitrary fields inside typed decisions", () => {
    const character = migrate();
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          decisions: [
            {
              id: "decision:unsafe",
              type: "rule-selection",
              madeAtCharacterLevel: 1,
              provenance: "custom",
              selectionKind: "other",
              sourceRef: null,
              selections: [character.build.speciesRef],
              payload: { executableMystery: true },
            },
          ],
        },
      }),
    ).toThrow();
  });
});
