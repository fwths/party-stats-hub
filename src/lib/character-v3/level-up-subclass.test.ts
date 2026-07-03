import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { advanceCharacterLevel } from "./operations";
import { ExactRuleRefSchema } from "./schema";
import { compileLevelUpSubclassChoice, deriveLevelUpSubclassPlan } from "./level-up-subclass";

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

describe("Character V3 level-up subclass planner", () => {
  it("requires an exact subclass choice when the next class level reaches an unselected subclass level", () => {
    const imported = dresana();
    const character = {
      ...imported,
      build: { ...imported.build, subclasses: [] },
    };
    const classVersionKey = character.build.levels.at(-1)!.classRef.versionKey;
    const subclassRef = ExactRuleRefSchema.parse({
      kind: "subclass",
      familyKey: createRuleFamilyKey("subclass", "Path of the Test"),
      versionKey: createRuleVersionKey({
        kind: "subclass",
        sourceId: "XPHB",
        upstreamId: "barbarian-test-path",
        contentRevision: "2024",
      }),
      name: "Path of the Test",
      rulesGeneration: "2024",
      sourceId: "XPHB",
      upstreamId: "barbarian-test-path",
      contentRevision: "2024",
      compatibility: "core-2024",
      verification: "verified",
    });
    const plan = deriveLevelUpSubclassPlan({
      character,
      classVersionKey,
      subclassCatalog: [{ classVersionKey, levelChosen: 8, subclassRef }],
    });

    expect(plan).toMatchObject({
      nextCharacterLevel: 8,
      nextClassLevel: 8,
      requiresSubclass: true,
      candidates: [subclassRef],
    });
    expect(() =>
      compileLevelUpSubclassChoice({
        character,
        classVersionKey,
        plan,
        selection: { mode: "none" },
      }),
    ).toThrow(/requires a subclass/);
    const choice = compileLevelUpSubclassChoice({
      character,
      classVersionKey,
      plan,
      selection: { mode: "subclass", subclassVersionKey: subclassRef.versionKey },
    });
    expect(choice).not.toBeNull();
    expect(choice).toEqual({
      classVersionKey,
      subclassRef,
      selectedAtCharacterLevel: 8,
    });

    const result = advanceCharacterLevel(character, {
      mutationId: "mutation:dresana:test-subclass-level",
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
      subclasses: [choice!],
      spells: [],
    });

    expect(result.character.build.subclasses).toContainEqual(choice!);
  });
});
