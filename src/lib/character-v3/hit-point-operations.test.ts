import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyDamage,
  deriveLifeStatus,
  grantTemporaryHitPoints,
  recordDeathSave,
  restoreHitPoints,
  stabilizeCharacter,
} from "./hit-point-operations";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { CharacterAggregateSchema, maximumHitPoints, type CharacterAggregate } from "./schema";

function fixture(): CharacterAggregate {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", "char-131593533.json"), "utf8"),
  );
  return migrateDdbPayloadToCharacterV3({
    payload,
    ownerUserId: "eleni",
    campaignId: "mother-of-bob",
  });
}

function withState(
  character: CharacterAggregate,
  state: Partial<CharacterAggregate["liveState"]>,
): CharacterAggregate {
  return CharacterAggregateSchema.parse({
    ...character,
    liveState: { ...character.liveState, ...state },
  });
}

function baseInput(character: CharacterAggregate, mutationId: string) {
  return {
    mutationId,
    actorUserId: "eleni",
    expectedBuildRevision: character.build.revision,
    expectedLiveStateRevision: character.liveState.revision,
  };
}

describe("Character V3 Hit Point and death-state operations", () => {
  it("applies temporary HP before current HP and records exact state", () => {
    const character = withState(fixture(), {
      currentHp: 10,
      temporaryHp: 5,
      deathSaves: { successes: 0, failures: 0, stabilized: false },
    });
    const result = applyDamage(character, {
      ...baseInput(character, "mutation:eleni:damage-with-temp"),
      amount: 12,
      criticalHit: false,
    });
    expect(result.character.liveState).toMatchObject({ currentHp: 3, temporaryHp: 0 });
    expect(result.auditEvent.before.lifeStatus).toBe("conscious");
    expect(result.auditEvent.after.lifeStatus).toBe("conscious");
  });

  it("distinguishes unconsciousness, damage at zero, and massive-damage death", () => {
    const standing = withState(fixture(), {
      currentHp: 5,
      temporaryHp: 0,
      deathSaves: { successes: 0, failures: 0, stabilized: false },
    });
    const dropped = applyDamage(standing, {
      ...baseInput(standing, "mutation:eleni:drop-to-zero"),
      amount: 5,
      criticalHit: false,
    }).character;
    expect(deriveLifeStatus(dropped.liveState)).toBe("unconscious");

    const critical = applyDamage(dropped, {
      ...baseInput(dropped, "mutation:eleni:critical-at-zero"),
      amount: 1,
      criticalHit: true,
    }).character;
    expect(critical.liveState.deathSaves.failures).toBe(2);

    const maximum = maximumHitPoints(standing.hitPoints);
    const dead = applyDamage(dropped, {
      ...baseInput(dropped, "mutation:eleni:massive-at-zero"),
      amount: maximum,
      criticalHit: false,
    }).character;
    expect(deriveLifeStatus(dead.liveState)).toBe("dead");
  });

  it("heals up to maximum and clears death saves when HP returns", () => {
    const character = withState(fixture(), {
      currentHp: 0,
      deathSaves: { successes: 1, failures: 2, stabilized: false },
    });
    const healed = restoreHitPoints(character, {
      ...baseInput(character, "mutation:eleni:healing"),
      amount: 10,
    }).character;
    expect(healed.liveState).toMatchObject({
      currentHp: 10,
      deathSaves: { successes: 0, failures: 0, stabilized: false },
    });
    expect(deriveLifeStatus(healed.liveState)).toBe("conscious");
  });

  it("tracks successful, failed, critical, stable, and natural-20 death-save outcomes", () => {
    let character = withState(fixture(), {
      currentHp: 0,
      temporaryHp: 0,
      deathSaves: { successes: 0, failures: 0, stabilized: false },
    });
    for (let index = 1; index <= 3; index += 1) {
      character = recordDeathSave(character, {
        ...baseInput(character, `mutation:eleni:death-success:${index}`),
        result: "success",
      }).character;
    }
    expect(deriveLifeStatus(character.liveState)).toBe("stable");
    expect(character.liveState.deathSaves).toEqual({
      successes: 0,
      failures: 0,
      stabilized: true,
    });

    const unconscious = withState(fixture(), {
      currentHp: 0,
      deathSaves: { successes: 0, failures: 1, stabilized: false },
    });
    const dead = recordDeathSave(unconscious, {
      ...baseInput(unconscious, "mutation:eleni:critical-death-failure"),
      result: "critical-failure",
    }).character;
    expect(deriveLifeStatus(dead.liveState)).toBe("dead");

    const revived = recordDeathSave(unconscious, {
      ...baseInput(unconscious, "mutation:eleni:natural-twenty"),
      result: "critical-success",
    }).character;
    expect(revived.liveState.currentHp).toBe(1);
    expect(deriveLifeStatus(revived.liveState)).toBe("conscious");
  });

  it("replaces rather than stacks temporary HP", () => {
    const character = withState(fixture(), { temporaryHp: 4 });
    const result = grantTemporaryHitPoints(character, {
      ...baseInput(character, "mutation:eleni:temporary-hp"),
      amount: 7,
    });
    expect(result.character.liveState.temporaryHp).toBe(7);
  });

  it("stabilizes an unconscious character and clears death-save marks", () => {
    const character = withState(fixture(), {
      currentHp: 0,
      deathSaves: { successes: 1, failures: 2, stabilized: false },
    });
    const result = stabilizeCharacter(character, {
      ...baseInput(character, "mutation:eleni:stabilize"),
    });
    expect(result.character.liveState.deathSaves).toEqual({
      successes: 0,
      failures: 0,
      stabilized: true,
    });
    expect(result.auditEvent.after.lifeStatus).toBe("stable");
  });

  it("rejects impossible state, dead healing, wrong owner, stale revisions, and no-ops", () => {
    const character = fixture();
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        liveState: {
          ...character.liveState,
          deathSaves: { successes: 1, failures: 0, stabilized: false },
        },
      }),
    ).toThrow(/clear death-save state/);
    const dead = withState(character, {
      currentHp: 0,
      deathSaves: { successes: 0, failures: 3, stabilized: false },
    });
    expect(() =>
      restoreHitPoints(dead, { ...baseInput(dead, "mutation:eleni:heal-dead"), amount: 1 }),
    ).toThrow(/dead/);
    expect(() =>
      applyDamage(character, {
        ...baseInput(character, "mutation:qemuel:damage"),
        actorUserId: "qemuel",
        amount: 1,
        criticalHit: false,
      }),
    ).toThrow(/owner/);
    expect(() =>
      grantTemporaryHitPoints(character, {
        ...baseInput(character, "mutation:eleni:stale-temp"),
        expectedLiveStateRevision: character.liveState.revision + 1,
        amount: 1,
      }),
    ).toThrow(/revision conflict/);
    expect(() =>
      restoreHitPoints(character, {
        ...baseInput(character, "mutation:eleni:full-healing"),
        amount: 1,
      }),
    ).toThrow(/already full/);
  });
});
