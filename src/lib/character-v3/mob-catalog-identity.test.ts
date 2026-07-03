import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import {
  loadClassHitPointRule,
  loadClassProgressionJson,
  loadClassSpellCatalog,
  loadSubclassAdditionalSpells,
} from "./level-up-catalog.server";
import {
  resolveMobCatalogClassIdentity,
  resolveMobCatalogSubclassIdentity,
} from "./mob-catalog-identity";

describe("MOB imported-to-catalog rule identity bridge", () => {
  it.each([
    [97349530, "artificer", "EFA", "artificer-armorer"],
    [131296315, "sorcerer", "XPHB", "sorcerer-aberrant"],
    [131593533, "bard", "XPHB", "bard-glamour"],
    [132900149, "druid", "XPHB", "druid-stars"],
    [132940690, "barbarian", "XPHB", "barbarian-wild-heart"],
  ])(
    "resolves character %s without changing aggregate version keys",
    (id, classId, sourceId, subclassId) => {
      const payload = JSON.parse(fs.readFileSync(`data/cache/char-${id}.json`, "utf8"));
      const character = migrateDdbPayloadToCharacterV3({
        payload,
        ownerUserId: "test-owner",
        campaignId: "mother-of-bob",
      });
      const importedClass = character.build.levels[0].classRef;
      const importedSubclass = character.build.subclasses[0].subclassRef;
      expect(resolveMobCatalogClassIdentity(importedClass)).toMatchObject({
        upstreamId: classId,
        sourceId,
        versionKey: importedClass.versionKey,
      });
      expect(resolveMobCatalogSubclassIdentity(importedSubclass)).toMatchObject({
        upstreamId: subclassId,
        sourceId,
        versionKey: importedSubclass.versionKey,
      });
    },
  );

  it("opens every MOB next-level catalog boundary with the explicit bridge", () => {
    const sqlite = new Database("sqlite.db", { readonly: true });
    for (const id of [97349530, 131296315, 131593533, 132900149, 132940690]) {
      const payload = JSON.parse(fs.readFileSync(`data/cache/char-${id}.json`, "utf8"));
      const character = migrateDdbPayloadToCharacterV3({
        payload,
        ownerUserId: "test-owner",
        campaignId: "mother-of-bob",
      });
      const classRef = resolveMobCatalogClassIdentity(character.build.levels[0].classRef);
      const subclassRef = resolveMobCatalogSubclassIdentity(
        character.build.subclasses[0].subclassRef,
      );
      expect(() => loadClassHitPointRule(sqlite, classRef)).not.toThrow();
      expect(() => loadClassProgressionJson(sqlite, classRef)).not.toThrow();
      expect(() => loadClassSpellCatalog(sqlite, classRef)).not.toThrow();
      expect(() => loadSubclassAdditionalSpells(sqlite, subclassRef)).not.toThrow();
    }
    sqlite.close();
  });
});
