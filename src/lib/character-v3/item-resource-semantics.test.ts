import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { recoverCharacterResources } from "./live-state-operations";
import { auditMagicItemMechanics, buildV3ReconstructionReadinessReport } from "./reconstruction";
import { reconcileSendingStonesCharges } from "./item-resource-semantics";

function qemuel() {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", "char-97349530.json"), "utf8"),
  );
  return migrateDdbPayloadToCharacterV3({
    payload,
    ownerUserId: "qemuel",
    campaignId: "mother-of-bob",
    v2MigrationOptions: {
      excludedFeatDefinitions: [
        {
          definitionId: 2048517,
          reason: "Player confirmed that Qemuel does not have a Dark Bargain.",
        },
      ],
    },
  });
}

describe("Character V3 item resource semantics", () => {
  it("reconciles Qemuel's Sending Stones as one dawn-restored verified item use", () => {
    const character = qemuel();
    const item = character.items.find((entry) => entry.name === "Sending Stones")!;

    expect(item.charges).toBeNull();
    expect(buildV3ReconstructionReadinessReport(character).blockers).toContainEqual(
      expect.objectContaining({
        code: "imported-magic-item-mechanics-unmodeled",
        path: `items.${character.items.findIndex((entry) => entry.id === item.id)}`,
      }),
    );

    const result = reconcileSendingStonesCharges({
      character,
      actorUserId: "qemuel",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: "mutation:qemuel:sending-stones-charges",
    });
    const updatedItem = result.character.items.find((entry) => entry.id === item.id)!;

    expect(updatedItem.charges).toMatchObject({
      label: "Sending Stones Uses",
      current: 1,
      maximum: 1,
      recovery: "dawn",
      sourceVersionKey: item.definitionRef!.versionKey,
      provenance: "verified-rule",
      recoveryRules: [{ trigger: "dawn", restore: { type: "all" } }],
    });
    expect(result.auditEvent).toMatchObject({
      type: "reconcile-sending-stones-charges",
      itemId: item.id,
      itemDefinitionVersionKey: item.definitionRef!.versionKey,
      liveStateRevision: { before: character.liveState.revision, after: character.liveState.revision + 1 },
    });
    expect(auditMagicItemMechanics(result.character)).toContainEqual(
      expect.objectContaining({
        name: "Sending Stones",
        mechanicsModeled: true,
        reasons: [],
      }),
    );
    expect(buildV3ReconstructionReadinessReport(result.character).blockers).not.toContainEqual(
      expect.objectContaining({
        code: "imported-magic-item-mechanics-unmodeled",
        path: `items.${result.character.items.findIndex((entry) => entry.id === item.id)}`,
      }),
    );
  });

  it("preserves an expended Sending Stones use and restores it at dawn", () => {
    const character = qemuel();
    const reconciled = reconcileSendingStonesCharges({
      character,
      actorUserId: "qemuel",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: "mutation:qemuel:sending-stones-expended",
    }).character;
    const itemIndex = reconciled.items.findIndex((entry) => entry.name === "Sending Stones");
    const depleted = {
      ...reconciled,
      items: reconciled.items.map((item, index) =>
        index === itemIndex && item.charges ? { ...item, charges: { ...item.charges, current: 0 } } : item,
      ),
    };

    const restored = recoverCharacterResources(depleted, {
      mutationId: "mutation:qemuel:sending-stones-dawn",
      actorUserId: "qemuel",
      expectedBuildRevision: depleted.build.revision,
      expectedLiveStateRevision: depleted.liveState.revision,
      trigger: "dawn",
    });

    expect(restored.character.items[itemIndex].charges?.current).toBe(1);
  });

  it("rejects non-owner and stale Sending Stones reconciliation", () => {
    const character = qemuel();
    const command = {
      character,
      actorUserId: "qemuel",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: "mutation:qemuel:sending-stones-reject",
    };

    expect(() => reconcileSendingStonesCharges({ ...command, actorUserId: "nikos" })).toThrow(
      /owner/,
    );
    expect(() =>
      reconcileSendingStonesCharges({
        ...command,
        expectedLiveStateRevision: character.liveState.revision + 1,
      }),
    ).toThrow(/revision conflict/);
  });
});
