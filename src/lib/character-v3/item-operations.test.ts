import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { maximumAttunedItems, mutateItem } from "./item-operations";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";

function character() {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", "char-132940690.json"), "utf8"),
  );
  return migrateDdbPayloadToCharacterV3({
    payload,
    ownerUserId: "andreas",
    campaignId: "mother-of-bob",
  });
}

describe("Character V3 item operations", () => {
  it("adds a schema-validated item as one audited live revision", () => {
    const current = character();
    const item = {
      ...current.items[0],
      id: "item:native:test-add",
      name: "Test Added Item",
      containerId: null,
    };
    const result = mutateItem(current, {
      mutationId: "mutation:item:add",
      actorUserId: current.identity.ownerUserId,
      expectedBuildRevision: current.build.revision,
      expectedLiveStateRevision: current.liveState.revision,
      operation: "add-item",
      item,
    });
    expect(result.auditEvent).toMatchObject({
      type: "item-add-item",
      itemId: item.id,
      before: null,
    });
    expect(result.character.items.at(-1)).toEqual(item);
    expect(() =>
      mutateItem(result.character, {
        mutationId: "mutation:item:add-duplicate",
        actorUserId: current.identity.ownerUserId,
        expectedBuildRevision: result.character.build.revision,
        expectedLiveStateRevision: result.character.liveState.revision,
        operation: "add-item",
        item,
      }),
    ).toThrow(/already exists/);
  });

  it("equips, attunes, changes quantity, and removes items with live revisions", () => {
    let current = character();
    const itemId = current.items[0].id;
    const run = (operation: "set-equipped" | "set-attuned" | "set-quantity" | "remove-item", extra = {}) => {
      const before = structuredClone(current.items.find((item) => item.id === itemId) ?? null);
      const result = mutateItem(current, {
        mutationId: `mutation:${operation}:${current.liveState.revision}`,
        actorUserId: current.identity.ownerUserId,
        expectedBuildRevision: current.build.revision,
        expectedLiveStateRevision: current.liveState.revision,
        itemId,
        operation,
        ...extra,
      });
      expect(result.character.liveState.revision).toBe(current.liveState.revision + 1);
      expect(result.character.build.revision).toBe(current.build.revision);
      expect(result.auditEvent).toMatchObject({
        type: `item-${operation}`,
        itemId,
        before,
      });
      expect(result.auditEvent.after).toEqual(
        operation === "remove-item"
          ? null
          : result.character.items.find((item) => item.id === itemId),
      );
      current = result.character;
    };

    run("set-equipped", { equipped: true });
    expect(current.items[0].equipped).toBe(true);
    run("set-attuned", { attuned: false });
    run("set-quantity", { quantity: 3 });
    expect(current.items[0].quantity).toBe(3);
    run("remove-item");
    expect(current.items.some((item) => item.id === itemId)).toBe(false);
  });

  it("rejects non-owners, stale revisions, and unknown items", () => {
    const current = character();
    const base = {
      mutationId: "mutation:item:rejected",
      actorUserId: "another-player",
      expectedBuildRevision: current.build.revision,
      expectedLiveStateRevision: current.liveState.revision,
      itemId: current.items[0].id,
      operation: "set-equipped",
      equipped: true,
    };
    expect(() => mutateItem(current, base)).toThrow(/character owner/i);
    expect(() =>
      mutateItem(current, {
        ...base,
        actorUserId: current.identity.ownerUserId,
        expectedLiveStateRevision: current.liveState.revision + 1,
      }),
    ).toThrow(/revision conflict/);
    expect(() =>
      mutateItem(current, {
        ...base,
        actorUserId: current.identity.ownerUserId,
        itemId: "missing-item",
      }),
    ).toThrow(/does not exist/);

  });

  it("rejects invalid quantities instead of treating them as implicit removal", () => {
    const current = character();
    const command = {
      mutationId: "mutation:item:invalid-quantity",
      actorUserId: current.identity.ownerUserId,
      expectedBuildRevision: current.build.revision,
      expectedLiveStateRevision: current.liveState.revision,
      itemId: current.items[0].id,
      operation: "set-quantity",
    };
    expect(() => mutateItem(current, { ...command, quantity: 0 })).toThrow();
    expect(() => mutateItem(current, { ...command, quantity: 1.5 })).toThrow();
  });

  it("does not remove a container while it still contains an item", () => {
    const current = character();
    const containerId = current.items[0].id;
    current.items[1] = { ...current.items[1], containerId };
    expect(() =>
      mutateItem(current, {
        mutationId: "mutation:item:remove-non-empty-container",
        actorUserId: current.identity.ownerUserId,
        expectedBuildRevision: current.build.revision,
        expectedLiveStateRevision: current.liveState.revision,
        itemId: containerId,
        operation: "remove-item",
      }),
    ).toThrow(/non-empty container/i);
  });

  it("rejects attuning an item authoritatively marked as not requiring attunement", () => {
    const current = character();
    current.items[0] = {
      ...current.items[0],
      attunementRequirement: {
        status: "not-required",
        conditions: null,
        provenance: "verified-rule",
      },
    };
    expect(() =>
      mutateItem(current, {
        mutationId: "mutation:item:invalid-attunement",
        actorUserId: current.identity.ownerUserId,
        expectedBuildRevision: current.build.revision,
        expectedLiveStateRevision: current.liveState.revision,
        itemId: current.items[0].id,
        operation: "set-attuned",
        attuned: true,
      }),
    ).toThrow(/does not require attunement/i);
  });

  it("enforces policy capacity while honoring exact-rule replacement effects", () => {
    const current = character();
    current.items = Array.from({ length: 4 }, (_, index) => ({
      ...current.items[0],
      id: `item:attunement:${index}`,
      name: `Attunement item ${index}`,
      attuned: index < 3,
      attunementRequirement: {
        status: "required" as const,
        conditions: null,
        provenance: "verified-rule" as const,
      },
    }));
    expect(maximumAttunedItems(current)).toBe(3);
    const command = {
      mutationId: "mutation:item:capacity",
      actorUserId: current.identity.ownerUserId,
      expectedBuildRevision: current.build.revision,
      expectedLiveStateRevision: current.liveState.revision,
      itemId: current.items[3].id,
      operation: "set-attuned",
      attuned: true,
    };
    expect(() => mutateItem(current, command)).toThrow(/capacity of 3/i);

    const background = current.build.backgroundRef;
    const sourceRef = {
      ...background,
      kind: "feature" as const,
      familyKey: createRuleFamilyKey("feature", "Magic Item Adept"),
      versionKey: createRuleVersionKey({
        kind: "feature",
        sourceId: background.sourceId,
        upstreamId: "magic-item-adept",
        contentRevision: background.contentRevision,
      }),
      name: "Magic Item Adept",
      upstreamId: "magic-item-adept",
      compatibility: "current-2024-compatible" as const,
      verification: "verified" as const,
    };
    current.build.attunementCapacity.replacements.push({
      sourceRef,
      maximum: 4,
    });
    expect(maximumAttunedItems(current)).toBe(4);
    expect(mutateItem(current, command).character.items[3].attuned).toBe(true);
  });
});
