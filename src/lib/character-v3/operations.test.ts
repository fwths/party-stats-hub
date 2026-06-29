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
    mutationId: "mutation:dresana:level-7",
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

    expect(maximumHitPoints(before.hitPoints)).toBe(77);
    expect(maximumHitPoints(result.character.hitPoints)).toBe(89);
    expect(result.character.liveState.currentHp).toBe(53);
    expect(result.character.hitPoints.gains).toEqual([
      {
        characterLevel: 7,
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
      characterLevel: 7,
      classLevel: 7,
      provenance: "native",
    });
    expect(result.auditEvent).toMatchObject({
      maximumHp: { before: 77, after: 89 },
      currentHp: { before: 41, after: 53 },
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
});
