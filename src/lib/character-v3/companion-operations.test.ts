import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { mutateCompanion } from "./companion-operations";

function characterWithCompanion() {
  for (const [ddbId, ownerUserId] of [
    [97349530, "qemuel"],
    [131296315, "nikos"],
    [131593533, "eleni"],
    [132900149, "alexia"],
    [132940690, "andreas"],
  ] as const) {
    const payload = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data", "cache", `char-${ddbId}.json`), "utf8"),
    );
    const character = migrateDdbPayloadToCharacterV3({
      payload,
      ownerUserId,
      campaignId: "mother-of-bob",
      v2MigrationOptions:
        ddbId === 97349530
          ? {
              excludedFeatDefinitions: [
                { definitionId: 2048517, reason: "Qemuel does not have a Dark Bargain." },
              ],
            }
          : undefined,
    });
    if (character.companions.length > 0) return character;
  }
  throw new Error("Expected at least one MOB companion fixture");
}

describe("Character V3 companion operations", () => {
  it("applies damage, healing, temporary HP, and activation with live revisions", () => {
    let character = characterWithCompanion();
    const companion = character.companions[0];
    const mutate = (operation: "damage" | "heal" | "set-temporary-hp" | "set-active", extra: object) => {
      const result = mutateCompanion(character, {
        mutationId: `mutation:${operation}:${character.liveState.revision}`,
        actorUserId: character.identity.ownerUserId,
        expectedBuildRevision: character.build.revision,
        expectedLiveStateRevision: character.liveState.revision,
        companionId: companion.id,
        operation,
        ...extra,
      });
      expect(result.character.liveState.revision).toBe(character.liveState.revision + 1);
      expect(result.character.build.revision).toBe(character.build.revision);
      character = result.character;
    };

    const beforeDamage = character.companions[0].liveState.removedHitPoints;
    mutate("damage", { amount: 3 });
    expect(character.companions[0].liveState.removedHitPoints).toBe(
      Math.min(companion.definition.averageHitPoints, beforeDamage + 3),
    );
    mutate("heal", { amount: 2 });
    mutate("set-temporary-hp", { amount: 5 });
    expect(character.companions[0].liveState.temporaryHitPoints).toBe(5);
    mutate("set-active", { active: false });
    expect(character.companions[0].liveState.active).toBe(false);
  });

  it("rejects non-owners, stale revisions, and unknown companion IDs", () => {
    const character = characterWithCompanion();
    const base = {
      mutationId: "mutation:companion:rejected",
      actorUserId: "another-player",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      companionId: character.companions[0].id,
      operation: "damage",
      amount: 1,
    };
    expect(() => mutateCompanion(character, base)).toThrow(/character owner/i);
    expect(() =>
      mutateCompanion(character, {
        ...base,
        actorUserId: character.identity.ownerUserId,
        expectedLiveStateRevision: character.liveState.revision + 1,
      }),
    ).toThrow(/revision conflict/);
    expect(() =>
      mutateCompanion(character, {
        ...base,
        actorUserId: character.identity.ownerUserId,
        companionId: "missing-companion",
      }),
    ).toThrow(/does not exist/);
  });
});
