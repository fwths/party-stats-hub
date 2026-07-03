import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import {
  addCharacterCondition,
  recoverCharacterResources,
  removeCharacterCondition,
  setCharacterExhaustion,
  setCharacterInspiration,
  spendCharacterResource,
  takeCharacterLongRest,
  takeCharacterShortRest,
} from "./live-state-operations";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { CharacterAggregateSchema, ExactRuleRefSchema, type CharacterAggregate } from "./schema";

function fixture(): CharacterAggregate {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", "char-131593533.json"), "utf8"),
  );
  const character = migrateDdbPayloadToCharacterV3({
    payload,
    ownerUserId: "eleni",
    campaignId: "mother-of-bob",
  });
  const [fixed, shortAll, longOnly] = character.liveState.resources;
  return CharacterAggregateSchema.parse({
    ...character,
    liveState: {
      ...character.liveState,
      resources: character.liveState.resources.map((resource) => {
        if (resource.key === fixed.key) {
          return {
            ...resource,
            current: 0,
            maximum: 3,
            recovery: "long-rest",
            recoveryRules: [
              { trigger: "short-rest", restore: { type: "fixed", amount: 1 } },
              { trigger: "long-rest", restore: { type: "all" } },
            ],
          };
        }
        if (resource.key === shortAll.key) {
          return {
            ...resource,
            current: 0,
            maximum: 2,
            recovery: "short-rest",
            recoveryRules: [
              { trigger: "short-rest", restore: { type: "all" } },
              { trigger: "long-rest", restore: { type: "all" } },
            ],
          };
        }
        if (resource.key === longOnly.key) {
          return {
            ...resource,
            current: 0,
            maximum: 4,
            recovery: "long-rest",
            recoveryRules: [{ trigger: "long-rest", restore: { type: "all" } }],
          };
        }
        return resource;
      }),
    },
  });
}

describe("Character V3 live resource operations", () => {
  it("applies a 2024 Short Rest as one audited hit-die, healing, and recovery transaction", () => {
    const character = fixture();
    expect(character.liveState.hitDice.status).toBe("tracked");
    if (character.liveState.hitDice.status !== "tracked") return;
    const pool = character.liveState.hitDice.pools.find((entry) => entry.remaining > 0)!;
    const prepared = CharacterAggregateSchema.parse({
      ...character,
      liveState: { ...character.liveState, currentHp: Math.max(1, character.liveState.currentHp - 5) },
    });
    const result = takeCharacterShortRest(prepared, {
      mutationId: "mutation:eleni:short-rest",
      actorUserId: "eleni",
      expectedBuildRevision: prepared.build.revision,
      expectedLiveStateRevision: prepared.liveState.revision,
      hitDice: [{ classVersionKey: pool.classVersionKey, amount: 1 }],
      hitPointsRestored: 4,
    });
    expect(result.auditEvent.type).toBe("take-character-short-rest");
    expect(result.character.liveState.currentHp).toBe(prepared.liveState.currentHp + 4);
    if (result.character.liveState.hitDice.status === "tracked") {
      expect(
        result.character.liveState.hitDice.pools.find(
          (entry) => entry.classVersionKey === pool.classVersionKey,
        )?.remaining,
      ).toBe(pool.remaining - 1);
    }
    expect(result.character.liveState.resources[0].current).toBe(1);
  });

  it("applies 2024 Long Rest recovery atomically", () => {
    const character = fixture();
    const prepared = CharacterAggregateSchema.parse({
      ...character,
      liveState: {
        ...character.liveState,
        currentHp: 1,
        temporaryHp: 7,
        exhaustion: 2,
        hitDice:
          character.liveState.hitDice.status === "tracked"
            ? {
                status: "tracked" as const,
                pools: character.liveState.hitDice.pools.map((pool) => ({ ...pool, remaining: 0 })),
              }
            : character.liveState.hitDice,
      },
    });
    const result = takeCharacterLongRest(prepared, {
      mutationId: "mutation:eleni:long-rest",
      actorUserId: "eleni",
      expectedBuildRevision: prepared.build.revision,
      expectedLiveStateRevision: prepared.liveState.revision,
    });
    expect(result.auditEvent.type).toBe("take-character-long-rest");
    expect(result.character.liveState.currentHp).toBeGreaterThan(1);
    expect(result.character.liveState.temporaryHp).toBe(0);
    expect(result.character.liveState.exhaustion).toBe(1);
    expect(result.character.liveState.resources.every((resource) => resource.current === resource.maximum)).toBe(true);
    if (result.character.liveState.hitDice.status === "tracked") {
      expect(result.character.liveState.hitDice.pools.every((pool) => pool.remaining === pool.maximum)).toBe(true);
    }
  });

  it("spends a resource under owner and revision authority", () => {
    const character = fixture();
    const resource = character.liveState.resources[3];
    const prepared = CharacterAggregateSchema.parse({
      ...character,
      liveState: {
        ...character.liveState,
        resources: character.liveState.resources.map((entry) =>
          entry.key === resource.key ? { ...entry, current: 2, maximum: 2 } : entry,
        ),
      },
    });
    const result = spendCharacterResource(prepared, {
      mutationId: "mutation:eleni:spend-resource",
      actorUserId: "eleni",
      expectedBuildRevision: prepared.build.revision,
      expectedLiveStateRevision: prepared.liveState.revision,
      resourceKey: resource.key,
      amount: 1,
    });
    expect(result.auditEvent.change).toEqual({
      resourceKey: resource.key,
      before: 2,
      after: 1,
    });
    expect(result.character.liveState.revision).toBe(prepared.liveState.revision + 1);
  });

  it("applies only structured rules for the selected recovery trigger", () => {
    const character = fixture();
    const [fixed, shortAll, longOnly] = character.liveState.resources;
    const shortRest = recoverCharacterResources(character, {
      mutationId: "mutation:eleni:short-resource-recovery",
      actorUserId: "eleni",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      trigger: "short-rest",
    });
    expect(shortRest.auditEvent.changes).toEqual([
      { resourceKey: fixed.key, before: 0, after: 1 },
      { resourceKey: shortAll.key, before: 0, after: 2 },
    ]);
    expect(
      shortRest.character.liveState.resources.find((entry) => entry.key === longOnly.key)?.current,
    ).toBe(0);

    const longRest = recoverCharacterResources(shortRest.character, {
      mutationId: "mutation:eleni:long-resource-recovery",
      actorUserId: "eleni",
      expectedBuildRevision: shortRest.character.build.revision,
      expectedLiveStateRevision: shortRest.character.liveState.revision,
      trigger: "long-rest",
    });
    expect(longRest.auditEvent.changes).toEqual([
      { resourceKey: fixed.key, before: 1, after: 3 },
      { resourceKey: longOnly.key, before: 0, after: 4 },
    ]);
  });

  it("rejects insufficient spending, no-op recovery, non-owners, and stale revisions", () => {
    const character = fixture();
    const resource = character.liveState.resources[0];
    const spend = {
      mutationId: "mutation:eleni:invalid-spend",
      actorUserId: "eleni",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      resourceKey: resource.key,
      amount: 1,
    };
    expect(() => spendCharacterResource(character, spend)).toThrow(/Insufficient/);
    expect(() => spendCharacterResource(character, { ...spend, actorUserId: "qemuel" })).toThrow(
      /owner/,
    );
    expect(() =>
      spendCharacterResource(character, {
        ...spend,
        expectedLiveStateRevision: character.liveState.revision + 1,
      }),
    ).toThrow(/revision conflict/);
    expect(() =>
      recoverCharacterResources(character, {
        mutationId: "mutation:eleni:dawn-resource-recovery",
        actorUserId: "eleni",
        expectedBuildRevision: character.build.revision,
        expectedLiveStateRevision: character.liveState.revision,
        trigger: "dawn",
      }),
    ).toThrow(/No depleted resources/);
  });

  it("allows an explicit reasoned creator/admin override and records it", () => {
    const character = fixture();
    const result = recoverCharacterResources(character, {
      mutationId: "mutation:qemuel:admin-recovery",
      actorUserId: "qemuel",
      authority: {
        actorRole: "admin",
        mode: "administrator-override",
        reason: "Creator correction requested for synchronized party state.",
      },
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      trigger: "short-rest",
    });
    expect(result.auditEvent.authorization).toEqual({
      mode: "administrator-override",
      actorRole: "admin",
      overrideReason: "Creator correction requested for synchronized party state.",
    });
  });
});

describe("Character V3 live table-state operations", () => {
  it("sets inspiration with owner authority and audit history", () => {
    const character = CharacterAggregateSchema.parse({
      ...fixture(),
      liveState: { ...fixture().liveState, inspiration: false },
    });
    const result = setCharacterInspiration(character, {
      mutationId: "mutation:eleni:gain-inspiration",
      actorUserId: "eleni",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      inspiration: true,
    });
    expect(result.character.liveState.inspiration).toBe(true);
    expect(result.character.liveState.revision).toBe(character.liveState.revision + 1);
    expect(result.auditEvent).toMatchObject({
      type: "set-character-inspiration",
      change: { before: false, after: true },
      authorization: { mode: "owner", actorRole: "player", overrideReason: null },
    });
  });

  it("rejects inspiration no-ops, non-owners, and stale revisions", () => {
    const character = CharacterAggregateSchema.parse({
      ...fixture(),
      liveState: { ...fixture().liveState, inspiration: false },
    });
    const command = {
      mutationId: "mutation:eleni:gain-inspiration",
      actorUserId: "eleni",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      inspiration: true,
    };
    expect(() => setCharacterInspiration(character, { ...command, inspiration: false })).toThrow(
      /already false/,
    );
    expect(() => setCharacterInspiration(character, { ...command, actorUserId: "qemuel" })).toThrow(
      /owner/,
    );
    expect(() =>
      setCharacterInspiration(character, {
        ...command,
        expectedLiveStateRevision: character.liveState.revision + 1,
      }),
    ).toThrow(/revision conflict/);
  });

  it("sets exhaustion as bounded audited live state", () => {
    const character = fixture();
    const result = setCharacterExhaustion(character, {
      mutationId: "mutation:eleni:set-exhaustion",
      actorUserId: "eleni",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      exhaustion: 2,
    });
    expect(result.character.liveState.exhaustion).toBe(2);
    expect(result.auditEvent.change).toEqual({ before: character.liveState.exhaustion, after: 2 });
    expect(() =>
      setCharacterExhaustion(result.character, {
        mutationId: "mutation:eleni:noop-exhaustion",
        actorUserId: "eleni",
        expectedBuildRevision: result.character.build.revision,
        expectedLiveStateRevision: result.character.liveState.revision,
        exhaustion: 2,
      }),
    ).toThrow(/already 2/);
    expect(() =>
      setCharacterExhaustion(character, {
        mutationId: "mutation:eleni:invalid-exhaustion",
        actorUserId: "eleni",
        expectedBuildRevision: character.build.revision,
        expectedLiveStateRevision: character.liveState.revision,
        exhaustion: 7,
      }),
    ).toThrow();
  });

  it("adds and removes custom/freeform conditions with owner authority", () => {
    const character = fixture();
    const condition = {
      id: "condition:ari:prone:round-4",
      conditionRef: null,
      label: "Prone",
      sourceLabel: "Owlbear shove",
      appliedByUserId: "danny",
    };
    const added = addCharacterCondition(character, {
      mutationId: "mutation:eleni:add-prone",
      actorUserId: "eleni",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      condition,
    });
    expect(added.character.liveState.conditions).toContainEqual(condition);
    expect(added.auditEvent).toMatchObject({
      type: "add-character-condition",
      condition,
    });

    const removed = removeCharacterCondition(added.character, {
      mutationId: "mutation:eleni:remove-prone",
      actorUserId: "eleni",
      expectedBuildRevision: added.character.build.revision,
      expectedLiveStateRevision: added.character.liveState.revision,
      conditionId: condition.id,
    });
    expect(removed.character.liveState.conditions).not.toContainEqual(condition);
    expect(removed.auditEvent).toMatchObject({
      type: "remove-character-condition",
      condition,
    });
  });

  it("rejects duplicate condition IDs, missing removals, non-owners, and stale condition edits", () => {
    const character = fixture();
    const condition = {
      id: "condition:ari:poisoned",
      conditionRef: null,
      label: "Poisoned",
      sourceLabel: null,
      appliedByUserId: "danny",
    };
    const addCommand = {
      mutationId: "mutation:eleni:add-poisoned",
      actorUserId: "eleni",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      condition,
    };
    const added = addCharacterCondition(character, addCommand);
    expect(() =>
      addCharacterCondition(added.character, {
        ...addCommand,
        expectedLiveStateRevision: added.character.liveState.revision,
      }),
    ).toThrow(/already exists/);
    expect(() =>
      addCharacterCondition(character, { ...addCommand, actorUserId: "qemuel" }),
    ).toThrow(/owner/);
    expect(() =>
      addCharacterCondition(character, {
        ...addCommand,
        expectedLiveStateRevision: character.liveState.revision + 1,
      }),
    ).toThrow(/revision conflict/);
    expect(() =>
      removeCharacterCondition(character, {
        mutationId: "mutation:eleni:remove-missing",
        actorUserId: "eleni",
        expectedBuildRevision: character.build.revision,
        expectedLiveStateRevision: character.liveState.revision,
        conditionId: "condition:missing",
      }),
    ).toThrow(/does not exist/);
  });

  it("rejects duplicate canonical condition refs before persistence", () => {
    const character = fixture();
    const poisonedRef = ExactRuleRefSchema.parse({
      kind: "condition",
      familyKey: createRuleFamilyKey("other", "Poisoned"),
      versionKey: createRuleVersionKey({
        kind: "other",
        sourceId: "XPHB",
        upstreamId: "poisoned-condition",
        contentRevision: "2024",
      }),
      name: "Poisoned",
      rulesGeneration: "2024",
      sourceId: "XPHB",
      upstreamId: "poisoned-condition",
      contentRevision: "2024",
      compatibility: "core-2024",
      verification: "verified",
    });
    const condition = {
      id: "condition:ari:poisoned:one",
      conditionRef: poisonedRef,
      label: "Poisoned",
      sourceLabel: "Giant spider bite",
      appliedByUserId: "danny",
    };
    const added = addCharacterCondition(character, {
      mutationId: "mutation:eleni:add-poisoned-rule",
      actorUserId: "eleni",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      condition,
    });

    expect(() =>
      addCharacterCondition(added.character, {
        mutationId: "mutation:eleni:add-poisoned-rule-again",
        actorUserId: "eleni",
        expectedBuildRevision: added.character.build.revision,
        expectedLiveStateRevision: added.character.liveState.revision,
        condition: {
          ...condition,
          id: "condition:ari:poisoned:two",
          sourceLabel: "Second spider bite",
        },
      }),
    ).toThrow(/already has condition Poisoned/);
  });

  it("allows explicit admin override for table-state correction and records it", () => {
    const character = fixture();
    const result = setCharacterExhaustion(character, {
      mutationId: "mutation:qemuel:correct-exhaustion",
      actorUserId: "qemuel",
      authority: {
        actorRole: "admin",
        mode: "administrator-override",
        reason: "Creator correction requested for synchronized party state.",
      },
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      exhaustion: 1,
    });
    expect(result.auditEvent.authorization).toEqual({
      mode: "administrator-override",
      actorRole: "admin",
      overrideReason: "Creator correction requested for synchronized party state.",
    });
  });
});
