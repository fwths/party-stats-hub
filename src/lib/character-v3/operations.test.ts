import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import {
  advanceCharacterLevel,
  CharacterV3ConflictError,
  CharacterV3PermissionError,
} from "./operations";
import { maximumHitPoints } from "./schema";
import { effectiveAbilityScores } from "./derived-sheet";

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

function input(character: ReturnType<typeof dresana>) {
  const tough = character.build.decisions
    .flatMap((decision) => (decision.type === "rule-selection" ? decision.selections : []))
    .find((selection) => selection.name === "Tough");
  expect(tough).toBeDefined();
  return {
    mutationId: "mutation:dresana:level-8",
    actorUserId: "andreas",
    expectedBuildRevision: character.build.revision,
    expectedLiveStateRevision: character.liveState.revision,
    classRef: character.build.levels.at(-1)!.classRef,
    hp: {
      method: "fixed" as const,
      hitDieContribution: 7,
      constitutionModifier: 3,
      bonuses: [{ sourceRef: tough!, label: "Tough", amount: 2 }],
    },
    currentHpPolicy: "preserve-damage" as const,
    decisions: [],
    spells: [],
  };
}

describe("Character V3 atomic level advancement", () => {
  it("advances Dresana with an unambiguous HP ledger and audit event", () => {
    const before = dresana();
    const result = advanceCharacterLevel(before, input(before));

    expect(maximumHitPoints(before.hitPoints)).toBe(89);
    expect(maximumHitPoints(result.character.hitPoints)).toBe(101);
    expect(result.character.liveState.currentHp).toBe(101);
    expect(result.character.liveState.hitDice).toMatchObject({
      status: "tracked",
      pools: [expect.objectContaining({ maximum: 8, remaining: 8, die: 12 })],
    });
    expect(result.character.hitPoints.gains).toEqual([
      {
        characterLevel: 8,
        method: "fixed",
        hitDieContribution: 7,
        constitutionModifier: 3,
        bonuses: [
          expect.objectContaining({ label: "Tough", amount: 2, sourceRef: expect.any(Object) }),
        ],
        total: 12,
      },
    ]);
    expect(result.character.build.levels.at(-1)).toMatchObject({
      characterLevel: 8,
      classLevel: 8,
      provenance: "native",
    });
    expect(result.auditEvent).toMatchObject({
      maximumHp: { before: 89, after: 101 },
      currentHp: { before: 89, after: 101 },
      buildRevision: { before: 1, after: 2 },
      liveStateRevision: { before: 0, after: 1 },
    });
  });

  it("rejects non-owner advancement", () => {
    const character = dresana();
    expect(() =>
      advanceCharacterLevel(character, { ...input(character), actorUserId: "qemuel" }),
    ).toThrow(CharacterV3PermissionError);
  });

  it("rejects stale build and live-state revisions independently", () => {
    const character = dresana();
    expect(() =>
      advanceCharacterLevel(character, {
        ...input(character),
        expectedBuildRevision: character.build.revision + 1,
      }),
    ).toThrow(CharacterV3ConflictError);
    expect(() =>
      advanceCharacterLevel(character, {
        ...input(character),
        expectedLiveStateRevision: character.liveState.revision + 1,
      }),
    ).toThrow(CharacterV3ConflictError);
  });

  it("requires new decisions to belong to the new level", () => {
    const character = dresana();
    const feat = character.build.decisions.find(
      (decision) => decision.type === "rule-selection" && decision.selectionKind === "feat",
    )!;
    expect(() =>
      advanceCharacterLevel(character, {
        ...input(character),
        decisions: [{ ...feat, id: "decision:new", provenance: "native" }],
      }),
    ).toThrow(/assigned to the new character level/);
  });

  it("rejects duplicate decision IDs and ASIs that exceed the score cap", () => {
    const character = dresana();
    const sourceRef = character.build.levels.at(-1)!.classRef;
    const asi = {
      id: "decision:level-8-asi",
      type: "ability-score-increase" as const,
      madeAtCharacterLevel: 8,
      provenance: "native" as const,
      sourceRef,
      increases: [{ ability: "STR" as const, amount: 2 }],
    };

    expect(() =>
      advanceCharacterLevel(character, {
        ...input(character),
        decisions: [asi, asi],
      }),
    ).toThrow(/unique IDs/);

    const capped = {
      ...character,
      build: {
        ...character.build,
        abilityBasis: {
          ...character.build.abilityBasis,
          baseScores: { ...character.build.abilityBasis.baseScores, STR: 20 },
        },
      },
    };
    expect(() => advanceCharacterLevel(capped, { ...input(capped), decisions: [asi] })).toThrow(
      /cannot exceed 20/,
    );
  });

  it("applies a valid ASI to the authoritative scores in the same atomic advancement", () => {
    const character = dresana();
    const ability = (Object.entries(character.build.abilityBasis.baseScores).find(
      ([, score]) => score <= 18,
    )?.[0] ?? "CHA") as keyof typeof character.build.abilityBasis.baseScores;
    const beforeScore = character.build.abilityBasis.baseScores[ability];
    const result = advanceCharacterLevel(character, {
      ...input(character),
      decisions: [
        {
          id: "decision:level-8-valid-asi",
          type: "ability-score-increase",
          madeAtCharacterLevel: 8,
          provenance: "native",
          sourceRef: character.build.levels.at(-1)!.classRef,
          increases: [{ ability, amount: 2 }],
        },
      ],
    });

    expect(result.character.build.abilityBasis.baseScores[ability]).toBe(beforeScore);
    expect(effectiveAbilityScores(result.character)[ability]).toBe(beforeScore + 2);
    expect(result.character.build.decisions).toContainEqual(
      expect.objectContaining({ id: "decision:level-8-valid-asi" }),
    );
  });

  it("updates a verified feature resource in the same atomic advancement", () => {
    const character = dresana();
    const rage = character.liveState.resources.find(
      (resource) => resource.key === "action:class:rage-enter",
    )!;
    const result = advanceCharacterLevel(character, {
      ...input(character),
      resourceUpdates: [
        {
          ...rage,
          sourceVersionKey: "rule:feature:xphb:barbarian-rage-1:2024",
          provenance: "verified-rule",
          current: rage.current + 1,
          maximum: rage.maximum + 1,
          recovery: "long-rest",
          recoveryRules: [
            { trigger: "short-rest", restore: { type: "fixed", amount: 1 } },
            { trigger: "long-rest", restore: { type: "all" } },
          ],
        },
      ],
    });
    expect(result.character.liveState.resources).toContainEqual(
      expect.objectContaining({
        key: rage.key,
        maximum: rage.maximum + 1,
        provenance: "verified-rule",
      }),
    );
  });

  it("re-derives attunement capacity effects and rejects forged values", () => {
    const character = dresana();
    const classRef = character.build.levels.at(-1)!.classRef;
    const sourceRef = {
      ...classRef,
      kind: "feature" as const,
      familyKey: "feature:magic-item-adept",
      versionKey: `feature:${classRef.sourceId}:magic-item-adept@${classRef.contentRevision}`,
      upstreamId: "magic-item-adept",
      name: "Magic Item Adept",
      compatibility: "current-2024-compatible" as const,
      verification: "verified" as const,
    };
    const valid = advanceCharacterLevel(character, {
      ...input(character),
      attunementCapacityReplacements: [{ sourceRef, maximum: 4 }],
    });
    expect(valid.character.build.attunementCapacity.replacements).toContainEqual({
      sourceRef,
      maximum: 4,
    });
    expect(() =>
      advanceCharacterLevel(character, {
        ...input(character),
        attunementCapacityReplacements: [{ sourceRef, maximum: 99 }],
      }),
    ).toThrow(/authoritative feature semantics/i);
    expect(() =>
      advanceCharacterLevel(character, {
        ...input(character),
        attunementCapacityReplacements: [{
          sourceRef: {
            ...sourceRef,
            upstreamId: "unknown-feature",
            versionKey: `feature:${classRef.sourceId}:unknown-feature@${classRef.contentRevision}`,
          },
          maximum: 4,
        }],
      }),
    ).toThrow(/authoritative feature semantics/i);
  });
});
