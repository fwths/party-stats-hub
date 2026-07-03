import { describe, expect, it } from "vitest";
import { loadItemCatalogRecord, searchItemCatalog } from "./item-catalog.server";

describe("Character V3 seeded item catalogue", () => {
  it("searches presentation-safe summaries and reloads the authoritative row", () => {
    const results = searchItemCatalog("Longsword", 10);
    const result = results.find((entry) => entry.kind === "weapon");
    expect(result).toMatchObject({ name: "Longsword", kind: "weapon", source: "XPHB" });
    const record = loadItemCatalogRecord("weapon", String(result?.id));
    expect(record).toMatchObject({ kind: "weapon", name: "Longsword", source: "XPHB" });
  });

  it("does not resolve unknown or source-less identities", () => {
    expect(loadItemCatalogRecord("magic-item", "does-not-exist")).toBeNull();
  });
});
