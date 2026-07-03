import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV3 } from "@/lib/character-v3/migrate-v2";
import { maximumHitPoints } from "@/lib/character-v3/schema";
import { adaptSyncedCharacterToPartyMember } from "./CharacterV3SyncPanel";

describe("Mother of Bob native party-card adapter", () => {
  it("renders a usable synchronized member without a legacy DDB PartyMember", () => {
    const payload = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "data", "cache", "char-132940690.json"),
        "utf8",
      ),
    );
    const character = migrateDdbPayloadToCharacterV3({
      payload,
      ownerUserId: "andreas",
      campaignId: "mother-of-bob",
    });

    const member = adaptSyncedCharacterToPartyMember(character, []);

    expect(member.id).toBe(132940690);
    expect(member.name).toBe(character.identity.name);
    expect(member.isNative).toBe(true);
    expect(member.hpMax).toBe(maximumHitPoints(character.hitPoints));
    expect(member.hpCurrent).toBe(character.liveState.currentHp);
    expect(member.abilities).toHaveLength(6);
    expect(member.skills).toEqual(character.profile.skills.values);
    expect(member.inventory.length).toBe(character.items.length);
    expect(member.inventory.map((item) => item.id)).toEqual(character.items.map((item) => item.id));
    const nonSlotResources = character.liveState.resources.filter(
      (resource) => !/^(?:spell|pact)-slot:\d+$/.test(resource.key),
    );
    expect(member.actions.some((action) => action.uses)).toBe(nonSlotResources.length > 0);
    expect(member.actions.some((action) => /slot/i.test(action.name))).toBe(false);
    expect(member.spellSlots).toEqual(
      character.liveState.resources
        .filter((resource) => resource.key.startsWith("spell-slot:"))
        .map((resource) => ({
          level: Number(resource.key.split(":")[1]),
          max: resource.maximum,
          used: resource.maximum - resource.current,
        })),
    );
    expect(member.pactSlots).toEqual(
      character.liveState.resources
        .filter((resource) => resource.key.startsWith("pact-slot:"))
        .map((resource) => ({
          level: Number(resource.key.split(":")[1]),
          max: resource.maximum,
          used: resource.maximum - resource.current,
        })),
    );
    expect(member.cantrips.map((spell) => spell.name)).toEqual(
      character.build.spells
        .filter((spell) => spell.active && spell.spellLevel === 0)
        .map((spell) => spell.spellRef.name)
        .sort((left, right) => left.localeCompare(right)),
    );
    expect(member.allSpells.map((spell) => spell.name)).toEqual(
      character.build.spells
        .filter((spell) => spell.active && spell.spellLevel > 0)
        .sort(
          (left, right) =>
            left.spellLevel - right.spellLevel || left.spellRef.name.localeCompare(right.spellRef.name),
        )
        .map((spell) => spell.spellRef.name),
    );
    expect(member.inventory.map((item) => item.attunementRequirement)).toEqual(
      character.items.map((item) => item.attunementRequirement),
    );
    expect(member.attunementCapacity).toBe(character.build.attunementCapacity.baseline.maximum);

    const staleLegacyMember = {
      ...member,
      inventory: [{
        name: "Stale DDB item",
        type: "Item",
        rarity: null,
        magic: false,
        equipped: false,
        attuned: false,
        quantity: 1,
      }],
      attacks: [{
        name: "Stale DDB attack",
        attackBonus: 0,
        damage: "0",
        damageType: "none",
        properties: [],
        isWeapon: false,
      }],
      actions: [{ name: "Stale DDB action", source: "other" }],
      features: [{
        name: "Stale DDB feature",
        description: "obsolete",
        source: "other" as const,
        sourceName: "DDB",
      }],
      passivePerception: 999,
      metamagic: [{ name: "Stale DDB metamagic", description: "obsolete" }],
      weaponMasteries: [{ name: "Stale DDB mastery", description: "obsolete" }],
      creatures: [],
    };
    const refreshed = adaptSyncedCharacterToPartyMember(character, [staleLegacyMember]);
    expect(refreshed.inventory.some((item) => item.name === "Stale DDB item")).toBe(false);
    expect(refreshed.attacks.some((attack) => attack.name === "Stale DDB attack")).toBe(false);
    expect(refreshed.actions.some((action) => action.name === "Stale DDB action")).toBe(false);
    expect(refreshed.features.some((feature) => feature.name === "Stale DDB feature")).toBe(false);
    expect(refreshed.passivePerception).toBe(character.profile.passiveScores.perception ?? 10);
    expect(refreshed.metamagic).toEqual(character.profile.specializations.metamagic);
    expect(refreshed.weaponMasteries).toEqual(character.profile.specializations.weaponMasteries);
    expect(refreshed.creatures).toHaveLength(character.companions.length);
    expect(refreshed.creatures.map((creature) => creature.definition.name)).toEqual(
      character.companions.map((companion) => companion.definition.name),
    );
  });
});
