import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { compileLevelUpHitPoints, deriveLevelUpHitPointPlan } from "./level-up-hp";

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

describe("V3 level-up Hit Point planning", () => {
  it("derives Dresana's fixed and physical-die HP components", () => {
    const character = dresana();
    const classVersionKey = character.build.levels.at(-1)!.classRef.versionKey;
    const plan = deriveLevelUpHitPointPlan(character, {
      classVersionKey,
      hitDie: 12,
      fixedContribution: 7,
    });
    expect(plan).toMatchObject({ hitDie: 12, fixedContribution: 7, constitutionModifier: 3 });
    expect(compileLevelUpHitPoints({ plan, selection: { method: "fixed" } })).toMatchObject({
      method: "fixed",
      hitDieContribution: 7,
      constitutionModifier: 3,
    });
    expect(
      compileLevelUpHitPoints({ plan, selection: { method: "rolled", roll: 12 } }),
    ).toMatchObject({ method: "rolled", hitDieContribution: 12 });
    expect(() =>
      compileLevelUpHitPoints({ plan, selection: { method: "rolled", roll: 13 } }),
    ).toThrow(/between 1 and 12/);
  });
});
