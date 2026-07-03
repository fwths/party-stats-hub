import { describe, expect, it } from "vitest";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import { ExactRuleRefSchema } from "./schema";
import {
  assertSupportedLevelUpFeatures,
  compileLevelUpFeatureSelections,
  deriveLevelUpFeaturePlan,
  type LevelUpFeatureCatalogRecord,
} from "./level-up-features";

function feature(name: string, overrides: Partial<LevelUpFeatureCatalogRecord> = {}) {
  const upstreamId = name.toLowerCase().replaceAll(" ", "-");
  return {
    featureRef: ExactRuleRefSchema.parse({
      kind: "feature",
      familyKey: createRuleFamilyKey("feature", name),
      versionKey: createRuleVersionKey({
        kind: "feature",
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
    }),
    classVersionKey: "class:barbarian",
    subclassVersionKey: null,
    levelRequired: 3,
    optionsJson: null,
    usesJson: null,
    mathematicalRecoveryJson: null,
    ...overrides,
  } satisfies LevelUpFeatureCatalogRecord;
}

describe("level-up feature planning", () => {
  it("derives fixed class and selected-subclass unlocks", () => {
    const plan = deriveLevelUpFeaturePlan({
      classVersionKey: "class:barbarian",
      nextClassLevel: 3,
      selectedSubclassVersionKey: "subclass:berserker",
      featureCatalog: [
        feature("Primal Knowledge"),
        feature("Frenzy", { subclassVersionKey: "subclass:berserker" }),
        feature("World Tree Vitality", { subclassVersionKey: "subclass:world-tree" }),
        feature("Wrong Level", { levelRequired: 4 }),
      ],
    });
    expect(plan.unlockedFeatures.map((entry) => entry.name)).toEqual([
      "Primal Knowledge",
      "Frenzy",
    ]);
    expect(plan.unsupportedSemantics).toEqual([]);
  });

  it("compiles exact choose-N feature options and fails closed for unsupported semantics", () => {
    const plan = deriveLevelUpFeaturePlan({
      classVersionKey: "class:barbarian",
      nextClassLevel: 3,
      selectedSubclassVersionKey: null,
      featureCatalog: [
        feature("Choice", { optionsJson: '[{"count":1,"options":["A","B"]}]' }),
        feature("Uses", { usesJson: '{"max":3}' }),
        feature("Recovery", { mathematicalRecoveryJson: '{"period":"long-rest"}' }),
        feature("Malformed", { optionsJson: "not-json" }),
        feature("Empty", { optionsJson: "[]", usesJson: "{}" }),
      ],
    });
    expect(plan.choiceGroups).toHaveLength(1);
    expect(plan.choiceGroups[0]).toMatchObject({ count: 1, featureRef: { name: "Choice" } });
    expect(plan.choiceGroups[0].options.map((option) => option.name)).toEqual(["A", "B"]);
    expect(plan.unsupportedSemantics.map((entry) => entry.semantic)).toEqual([
      "resource-uses",
      "resource-recovery",
      "feature-options",
    ]);
    expect(() => assertSupportedLevelUpFeatures(plan)).toThrow("unsupported feature semantics");

    const safePlan = { ...plan, unsupportedSemantics: [] };
    const decisions = compileLevelUpFeatureSelections({
      plan: safePlan,
      selections: [
        {
          groupId: safePlan.choiceGroups[0].id,
          selectedOptionVersionKeys: [safePlan.choiceGroups[0].options[1].versionKey],
        },
      ],
      madeAtCharacterLevel: 3,
      decisionIdPrefix: "mutation:level-3",
    });
    expect(decisions[0]).toMatchObject({
      id: "mutation:level-3:feature:0",
      type: "rule-selection",
      selectionKind: "feature-option",
      sourceRef: { name: "Choice" },
      selections: [{ name: "B" }],
      madeAtCharacterLevel: 3,
    });
    expect(() =>
      compileLevelUpFeatureSelections({
        plan: safePlan,
        selections: [{ groupId: safePlan.choiceGroups[0].id, selectedOptionVersionKeys: [] }],
        madeAtCharacterLevel: 3,
        decisionIdPrefix: "mutation:level-3",
      }),
    ).toThrow("requires exactly 1 distinct option");
  });
});
