import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { compileLevelUpDecision, deriveLevelUpDecisionPlan } from "./level-up-planner";
import { advanceCharacterLevel } from "./operations";

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

describe("Character V3 level-up decision planner", () => {
  it("derives only score-cap-safe ASI allocations for Dresana's level 8", () => {
    const character = dresana();
    const plan = deriveLevelUpDecisionPlan({
      character,
      classVersionKey: character.build.levels.at(-1)!.classRef.versionKey,
    });

    expect(plan).toMatchObject({
      nextCharacterLevel: 8,
      nextClassLevel: 8,
      requiresAsiOrFeat: true,
      eligibleFeats: [],
    });
    expect(plan.asiAllocations.length).toBeGreaterThan(0);
    for (const allocation of plan.asiAllocations) {
      expect(allocation.reduce((sum, increase) => sum + increase.amount, 0)).toBe(2);
      for (const increase of allocation) {
        expect(
          character.build.abilityBasis.baseScores[increase.ability] + increase.amount,
        ).toBeLessThanOrEqual(20);
      }
    }
  });

  it("rejects a class that is not in the character build", () => {
    expect(() =>
      deriveLevelUpDecisionPlan({ character: dresana(), classVersionKey: "missing" }),
    ).toThrow(/not part/);
  });

  it("compiles only an ASI allocation contained in the current plan", () => {
    const character = dresana();
    const classVersionKey = character.build.levels.at(-1)!.classRef.versionKey;
    const plan = deriveLevelUpDecisionPlan({ character, classVersionKey });
    const decision = compileLevelUpDecision({
      character,
      classVersionKey,
      plan,
      selection: { mode: "asi", allocation: plan.asiAllocations[0] },
      decisionId: "decision:dresana:level-8",
    });
    expect(decision).toMatchObject({
      type: "ability-score-increase",
      madeAtCharacterLevel: 8,
      provenance: "native",
      increases: plan.asiAllocations[0],
    });
    expect(() =>
      compileLevelUpDecision({
        character,
        classVersionKey,
        plan,
        selection: { mode: "asi", allocation: [{ ability: "STR", amount: 1 }] },
        decisionId: "decision:invalid",
      }),
    ).toThrow(/not eligible/);
  });

  it("allows no ASI or feat decision on ordinary levels", () => {
    const character = dresana();
    const advanced = advanceCharacterLevel(character, {
      mutationId: "mutation:dresana:test-level-8",
      actorUserId: "andreas",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      classRef: character.build.levels.at(-1)!.classRef,
      hp: {
        method: "fixed",
        hitDieContribution: 7,
        constitutionModifier: 3,
        bonuses: [],
      },
      currentHpPolicy: "preserve-damage",
      decisions: [],
      spells: [],
    }).character;
    const classVersionKey = advanced.build.levels.at(-1)!.classRef.versionKey;
    const plan = deriveLevelUpDecisionPlan({ character: advanced, classVersionKey });

    expect(plan).toMatchObject({ nextCharacterLevel: 9, requiresAsiOrFeat: false });
    expect(
      compileLevelUpDecision({
        character: advanced,
        classVersionKey,
        plan,
        selection: { mode: "none" },
        decisionId: "decision:none",
      }),
    ).toBeNull();
    expect(() =>
      compileLevelUpDecision({
        character: advanced,
        classVersionKey,
        plan,
        selection: { mode: "asi", allocation: [{ ability: "STR", amount: 2 }] },
        decisionId: "decision:invalid-ordinary-level",
      }),
    ).toThrow(/does not permit/);
  });
});
