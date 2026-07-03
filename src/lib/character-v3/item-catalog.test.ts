import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { resolveCatalogItem } from "./item-catalog";

describe("Character V3 trusted item catalogue resolver", () => {
  const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "cache", "char-132940690.json"), "utf8"));
  const character = migrateDdbPayloadToCharacterV3({ payload, ownerUserId: "andreas", campaignId: "mother-of-bob" });

  it("constructs a verified exact-reference 2024 weapon item", () => {
    const item = resolveCatalogItem({
      character, instanceId: "item:test:longsword", quantity: 1,
      record: { kind: "weapon", id: "longsword-xphb", name: "Longsword", source: "XPHB", category: "Martial", type: "Melee", costGp: 15, damageDice: "1d8", damageType: "Slashing", properties: ["Versatile"], weight: 3 },
    });
    expect(item.definitionRef).toMatchObject({ kind: "item", compatibility: "core-2024", verification: "verified" });
    expect(item.details).toMatchObject({ sourceSystem: "rules-catalog", provenance: "verified-rule", damage: "1d8 Slashing" });
    expect(item.attunementRequirement).toEqual({ status: "not-required", conditions: null, provenance: "verified-rule" });
  });

  it("marks an allowed newer-compatible supplement distinctly from core 2024", () => {
    const item = resolveCatalogItem({
      character, instanceId: "item:test:sending-stones", quantity: 1,
      record: { kind: "magic-item", id: "sending-stones-tce", name: "Sending Stones", source: "TCE", type: "Wondrous Item", rarity: "Uncommon", description: "A matched pair of stones.", weight: null, requiresAttunement: false, attunementConditions: null },
    });
    expect(item.definitionRef?.compatibility).toBe("current-2024-compatible");
    expect(item.attunementRequirement.status).toBe("not-required");
  });
});
