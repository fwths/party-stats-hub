import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV2 } from "./migrate-ddb";
import {
  applyCharacterStateCommand,
  appendCharacterLevel,
  CharacterPermissionError,
  CharacterStateConflictError,
} from "./operations";
import {
  CharacterAggregateSchema,
  CharacterBuildSchema,
  CharacterLiveStateSchema,
  type CharacterAggregate,
} from "./schema";

const mobCharacters = [
  { id: 97349530, ownerUserId: "qemuel", name: "Qemuel", className: "Artificer", level: 7 },
  {
    id: 131296315,
    ownerUserId: "nikos",
    name: "Willow Alatáriel",
    className: "Sorcerer",
    level: 7,
  },
  {
    id: 131593533,
    ownerUserId: "eleni",
    name: 'Arion "Ari" Starfire',
    className: "Bard",
    level: 7,
  },
  { id: 132900149, ownerUserId: "alexia", name: "Echo", className: "Druid", level: 7 },
  {
    id: 132940690,
    ownerUserId: "andreas",
    name: "Dresana Silvakias",
    className: "Barbarian",
    level: 7,
  },
] as const;

function readPayload(id: number): any {
  const filePath = path.join(process.cwd(), "data", "cache", `char-${id}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function mobMigrationOptions(id: number) {
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

function migrateCharacter(index = 0): CharacterAggregate {
  const fixture = mobCharacters[index];
  return migrateDdbPayloadToCharacterV2(
    readPayload(fixture.id),
    fixture.ownerUserId,
    mobMigrationOptions(fixture.id),
  );
}

describe("Character Schema V2 DDB migration prototype", () => {
  it.each(mobCharacters)("represents $name as a valid, strict V2 aggregate", (fixture) => {
    const character = migrateDdbPayloadToCharacterV2(
      readPayload(fixture.id),
      fixture.ownerUserId,
      mobMigrationOptions(fixture.id),
    );

    expect(CharacterAggregateSchema.parse(character)).toEqual(character);
    expect(character.identity.name).toBe(fixture.name);
    expect(character.identity.ownerUserId).toBe(fixture.ownerUserId);
    expect(character.build.ruleset).toBe("2024");
    expect(character.build.levels).toHaveLength(fixture.level);
    expect(character.build.levels.at(-1)?.classLevel).toBe(fixture.level);
    expect(character.build.levels[0].classRef.name).toBe(fixture.className);
    expect(
      character.build.levels.every((level) => level.reconstruction === "single-class-import"),
    ).toBe(true);
    expect(character.migrationIssues.some((issue) => issue.severity === "blocking")).toBe(false);
  });

  it("preserves imported data through a JSON round trip", () => {
    const character = migrateCharacter(1);
    const restored = CharacterAggregateSchema.parse(JSON.parse(JSON.stringify(character)));
    expect(restored).toEqual(character);
  });

  it("keeps imported choices explicitly unverified instead of inventing acquisition levels", () => {
    const character = migrateCharacter(0);
    expect(character.build.choices.length).toBeGreaterThan(0);
    expect(
      character.build.choices.every(
        (choice) =>
          choice.provenance === "imported" &&
          choice.grantedAtCharacterLevel === null &&
          choice.selection.verification === "imported-unverified",
      ),
    ).toBe(true);
    expect(character.build.abilityBasis).toMatchObject({
      method: "imported-baseline",
      verified: false,
    });
  });

  it("detects Dark Bargain as unresolved when no migration decision is supplied", () => {
    const fixture = mobCharacters[0];
    const character = migrateDdbPayloadToCharacterV2(readPayload(fixture.id), fixture.ownerUserId);
    const darkBargain = character.build.choices.find(
      (choice) => choice.selection.name === "Dark Bargain",
    );
    expect(darkBargain).toMatchObject({
      selectionState: "unresolved-required-choice",
      payload: {
        unresolvedChoices: [
          expect.objectContaining({
            choiceId: "3-316418",
          }),
        ],
      },
    });
    expect(character.migrationIssues).toContainEqual(
      expect.objectContaining({
        code: "DDB_REQUIRED_CHOICE_UNRESOLVED",
        severity: "blocking",
      }),
    );
  });

  it("excludes Qemuel's unselected Dark Bargain through an auditable migration decision", () => {
    const character = migrateCharacter(0);
    expect(character.build.choices.some((choice) => choice.selection.name === "Dark Bargain")).toBe(
      false,
    );
    expect(character.migrationResolutions).toContainEqual({
      kind: "exclude-imported-feat-wrapper",
      sourceDefinitionId: "2048517",
      reason: "Player confirmed that Qemuel does not have a Dark Bargain.",
    });
    expect(character.migrationIssues.some((issue) => issue.severity === "blocking")).toBe(false);
  });

  it("rejects non-contiguous and internally inconsistent level histories", () => {
    const character = migrateCharacter(0);
    const malformed = structuredClone(character.build);
    malformed.levels[2].characterLevel = 7;
    malformed.levels[3].classLevel = 2;
    expect(CharacterBuildSchema.safeParse(malformed).success).toBe(false);
  });

  it("rejects impossible live values and duplicate resource keys", () => {
    const character = migrateCharacter(0);
    expect(
      CharacterLiveStateSchema.safeParse({
        ...character.liveState,
        currentHp: character.liveState.maxHp + 1,
      }).success,
    ).toBe(false);

    const resource = character.liveState.resources[0];
    expect(resource).toBeDefined();
    expect(
      CharacterLiveStateSchema.safeParse({
        ...character.liveState,
        resources: [...character.liveState.resources, resource],
      }).success,
    ).toBe(false);
  });
});

describe("Character Schema V2 native level revisions", () => {
  it("appends a native level as a new immutable build revision", () => {
    const character = migrateCharacter(0);
    const original = structuredClone(character.build);
    const classRef = character.build.levels[0].classRef;
    const leveled = appendCharacterLevel(character.build, {
      expectedRevision: 1,
      classRef: { ...classRef, verification: "verified" },
      hpGain: 7,
    });

    expect(original).toEqual(character.build);
    expect(leveled.revision).toBe(2);
    expect(leveled.levels).toHaveLength(8);
    expect(leveled.levels.at(-1)).toMatchObject({
      characterLevel: 8,
      classLevel: 8,
      hpGain: 7,
      reconstruction: "native",
    });
  });

  it("refuses a level-up based on a stale build revision", () => {
    const character = migrateCharacter(0);
    expect(() =>
      appendCharacterLevel(character.build, {
        expectedRevision: 99,
        classRef: character.build.levels[0].classRef,
        hpGain: 7,
      }),
    ).toThrow(CharacterStateConflictError);
  });
});

describe("Character Schema V2 synchronized live-state commands", () => {
  it("allows the owning player to edit and emits an auditable revision event", () => {
    const character = migrateCharacter(3);
    const result = applyCharacterStateCommand(character.identity, character.liveState, {
      mutationId: "echo-damage-1",
      actorUserId: "alexia",
      expectedRevision: 0,
      type: "adjust-hit-points",
      delta: -7,
    });

    expect(result.state.revision).toBe(1);
    expect(result.state.currentHp).toBe(Math.max(0, character.liveState.currentHp - 7));
    expect(result.event).toMatchObject({
      mutationId: "echo-damage-1",
      actorUserId: "alexia",
      characterId: character.identity.id,
      fromRevision: 0,
      toRevision: 1,
    });
  });

  it("rejects edits from another player", () => {
    const character = migrateCharacter(3);
    expect(() =>
      applyCharacterStateCommand(character.identity, character.liveState, {
        mutationId: "qem-edits-echo",
        actorUserId: "qemuel",
        expectedRevision: 0,
        type: "adjust-hit-points",
        delta: -1,
      }),
    ).toThrow(CharacterPermissionError);
  });

  it("detects concurrent stale-browser writes instead of silently overwriting", () => {
    const character = migrateCharacter(3);
    const firstBrowser = applyCharacterStateCommand(character.identity, character.liveState, {
      mutationId: "echo-first-browser",
      actorUserId: "alexia",
      expectedRevision: 0,
      type: "adjust-hit-points",
      delta: -2,
    });

    expect(firstBrowser.state.revision).toBe(1);
    expect(() =>
      applyCharacterStateCommand(character.identity, firstBrowser.state, {
        mutationId: "echo-stale-browser",
        actorUserId: "alexia",
        expectedRevision: 0,
        type: "set-temporary-hit-points",
        value: 4,
      }),
    ).toThrow(CharacterStateConflictError);
  });

  it("treats retried mutation IDs as idempotent", () => {
    const character = migrateCharacter(3);
    const command = {
      mutationId: "echo-retried-action",
      actorUserId: "alexia",
      expectedRevision: 0,
      type: "adjust-hit-points" as const,
      delta: -2,
    };
    const first = applyCharacterStateCommand(character.identity, character.liveState, command);
    const retry = applyCharacterStateCommand(
      character.identity,
      first.state,
      command,
      new Set([command.mutationId]),
    );

    expect(retry.duplicate).toBe(true);
    expect(retry.event).toBeNull();
    expect(retry.state).toEqual(first.state);
  });

  it("spends a resource without changing unrelated live state", () => {
    const character = migrateCharacter(0);
    const resource = character.liveState.resources.find((entry) => entry.current > 0);
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = applyCharacterStateCommand(character.identity, character.liveState, {
      mutationId: "qemuel-spell-slot",
      actorUserId: "qemuel",
      expectedRevision: 0,
      type: "spend-resource",
      resourceKey: resource.key,
      amount: 1,
    });

    expect(result.state.currentHp).toBe(character.liveState.currentHp);
    expect(result.state.resources.find((entry) => entry.key === resource.key)?.current).toBe(
      resource.current - 1,
    );
  });
});
