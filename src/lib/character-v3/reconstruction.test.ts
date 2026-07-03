import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCharacterPayload } from "../parser";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import {
  auditMagicItemMechanics,
  buildV3ReconstructionReadinessReport,
  projectV3ReconstructableFacts,
} from "./reconstruction";

const fixtures = [
  { id: 97349530, owner: "qemuel", name: "Qem" },
  { id: 131296315, owner: "nikos", name: "Willow" },
  { id: 131593533, owner: "eleni", name: "Ari" },
  { id: 132900149, owner: "alexia", name: "Echo" },
  { id: 132940690, owner: "andreas", name: "Dresana" },
] as const;

function character(fixture: (typeof fixtures)[number]) {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", `char-${fixture.id}.json`), "utf8"),
  );
  return migrateDdbPayloadToCharacterV3({
    payload,
    ownerUserId: fixture.owner,
    campaignId: "mother-of-bob",
    v2MigrationOptions:
      fixture.id === 97349530
        ? {
            excludedFeatDefinitions: [
              {
                definitionId: 2048517,
                reason: "Player confirmed that Qemuel does not have a Dark Bargain.",
              },
            ],
          }
        : undefined,
  });
}

function cachedPayload(fixture: (typeof fixtures)[number]) {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", `char-${fixture.id}.json`), "utf8"),
  );
}

function sortedNames(entries: Array<{ name: string }>) {
  return entries.map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
}

describe("Character V3 DDB-independent reconstruction proof", () => {
  it.each(fixtures)("projects all directly authored facts for $name from V3 alone", (fixture) => {
    const aggregate = character(fixture);
    const facts = projectV3ReconstructableFacts(JSON.parse(JSON.stringify(aggregate)));

    expect(facts).toMatchObject({
      identity: {
        id: `mob:character:${fixture.id}`,
        ownerUserId: fixture.owner,
        name: aggregate.identity.name,
      },
      revisions: { build: aggregate.build.revision, liveState: aggregate.liveState.revision },
      hitPoints: {
        maximum: expect.any(Number),
        current: aggregate.liveState.currentHp,
      },
    });
    expect(facts.progression.levels).toHaveLength(aggregate.build.levels.length);
    expect(facts.liveState.hitDice.status).toBe("tracked");
    if (facts.liveState.hitDice.status === "tracked") {
      expect(facts.liveState.hitDice.pools.reduce((sum, pool) => sum + pool.maximum, 0)).toBe(
        facts.progression.levels.length,
      );
    }
    expect(facts).not.toHaveProperty("ddbPayload");
  });

  it.each(fixtures)(
    "reconstructs $name's imported current-sheet truth from V3 without retaining a runtime DDB payload",
    (fixture) => {
      const raw = cachedPayload(fixture);
      const imported = parseCharacterPayload(fixture.id, raw);
      const aggregate = character(fixture);
      const facts = projectV3ReconstructableFacts(JSON.parse(JSON.stringify(aggregate)));

      expect(JSON.stringify(facts)).not.toContain(`char-${fixture.id}`);
      expect(JSON.stringify(facts)).not.toContain("readonlyUrl");
      expect(facts.profile).toMatchObject({
        movement: {
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          walk: imported.speed,
          special: imported.specialSpeeds,
        },
        armorClass: {
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          value: imported.armorClass,
        },
        initiative: {
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          value: imported.initiative,
        },
        passiveScores: {
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          perception: imported.passivePerception,
          investigation: imported.passiveInvestigation,
          insight: imported.passiveInsight,
        },
        skills: {
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          values: imported.skills,
        },
        savingThrows: {
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          values: imported.saves,
        },
        spellcastingTotals: {
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          values: imported.spellcasting.map((entry) => ({ ...entry, ability: entry.ability })),
        },
        senses: {
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          values: imported.senses,
        },
        defenses: {
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          values: imported.defenses,
        },
        proficiencies: {
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          languages: imported.languages,
          tools: imported.tools,
          armor: imported.armorProficiencies,
          weapons: imported.weaponProficiencies,
        },
        actions: {
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          values: imported.actions.map((action) => ({
            name: action.name,
            source: action.source,
            description: action.description ?? "",
            activation: action.activation ?? null,
            limitedUse: action.uses
              ? { maximum: action.uses.max, recovery: action.uses.reset }
              : null,
          })),
        },
        attacks: {
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          values: imported.attacks,
        },
        encumbrance: {
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          weightCarried: imported.weightCarried,
          carryingCapacity: imported.carryingCapacity,
        },
      });
      expect(sortedNames(facts.items)).toEqual(sortedNames(imported.inventory));
      expect(facts.profile.features.values.map((feature) => feature.name)).toEqual(
        imported.features.map((feature) => feature.name),
      );
    },
  );

  it.each(fixtures)("refuses to overclaim a complete native sheet for $name", (fixture) => {
    const report = buildV3ReconstructionReadinessReport(character(fixture));
    const codes = new Set(report.blockers.map((blocker) => blocker.code));

    expect(report.readyForDdbIndependentSheet).toBe(false);
    expect(report.authoritativeDomains).toContain("authored-facts");
    expect(report.blockedDomains).toEqual(
      expect.arrayContaining([
        "capabilities",
        "hit-dice",
        "derived-sheet",
      ]),
    );
    expect(report.blockedDomains).not.toContain("abilities");
    expect(report.blockedDomains).not.toContain("hit-points");
    expect(codes).not.toContain("unverified-ability-basis");
    expect(codes).not.toContain("unverified-hp-baseline");
    expect(codes).toContain("unverified-hit-die-pool");
    expect(codes).toContain("native-compiler-missing:armor-class");
    expect(
      report.blockers
        .filter((blocker) => blocker.code === "imported-capability-unreconciled")
        .every(
          (blocker) =>
            blocker.message.includes("DDB-confirmed current-sheet truth") &&
            blocker.needsPlayerDecision === false,
        ),
    ).toBe(true);
    expect(report.blockers.some((blocker) => blocker.message.includes("Dark Bargain"))).toBe(false);
  });

  it("keeps older persisted MOB imported foundations trusted even before confirmation metadata existed", () => {
    const aggregate = character(fixtures[0]);
    const legacyPersisted = {
      ...aggregate,
      build: {
        ...aggregate.build,
        abilityBasis: {
          method: aggregate.build.abilityBasis.method,
          baseScores: aggregate.build.abilityBasis.baseScores,
          verified: aggregate.build.abilityBasis.verified,
        },
      },
      hitPoints: {
        ...aggregate.hitPoints,
        baseline: {
          throughCharacterLevel: aggregate.hitPoints.baseline.throughCharacterLevel,
          maximum: aggregate.hitPoints.baseline.maximum,
          method: aggregate.hitPoints.baseline.method,
          verified: aggregate.hitPoints.baseline.verified,
        },
      },
    };

    const report = buildV3ReconstructionReadinessReport(legacyPersisted);
    const codes = new Set(report.blockers.map((blocker) => blocker.code));

    expect(codes).not.toContain("unverified-ability-basis");
    expect(codes).not.toContain("unverified-hp-baseline");
    expect(report.blockedDomains).not.toContain("abilities");
    expect(report.blockedDomains).not.toContain("hit-points");
  });

  it("blocks DDB-independent inventory authority for unmodeled imported magic items", () => {
    const base = character(fixtures[0]);
    const magicItemIndex = base.items.findIndex((item) => item.details?.magic === true);
    expect(magicItemIndex).toBeGreaterThanOrEqual(0);

    const report = buildV3ReconstructionReadinessReport(base);

    expect(report.blockers).toContainEqual(
      expect.objectContaining({
        code: "imported-magic-item-mechanics-unmodeled",
        domain: "inventory",
        path: `items.${magicItemIndex}`,
      }),
    );
  });

  it("blocks item charges that are not backed by an exact rule source", () => {
    const base = character(fixtures[0]);
    const item = base.items[0];
    const withCharges = {
      ...base,
      items: [
        {
          ...item,
          charges: {
            key: "item:test-wand:charges",
            label: "Test Wand Charges",
            current: 1,
            maximum: 3,
            recovery: "dawn" as const,
            sourceVersionKey: null,
            provenance: "imported-unverified" as const,
            recoveryRules: [{ trigger: "dawn" as const, restore: { type: "fixed" as const, amount: 1 } }],
          },
        },
        ...base.items.slice(1),
      ],
    };

    const report = buildV3ReconstructionReadinessReport(withCharges);

    expect(report.blockers).toContainEqual(
      expect.objectContaining({
        code: "item-charges-without-rule-source",
        domain: "inventory",
        path: "items.0.charges",
      }),
    );
  });

  it("audits concrete imported magic-item mechanics by item name", () => {
    const base = character(fixtures[0]);
    const audit = auditMagicItemMechanics(base);

    expect(audit.length).toBeGreaterThan(0);
    expect(audit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Sending Stones",
          mechanicsModeled: false,
          reasons: expect.arrayContaining(["imported magic-item effects are display-only"]),
        }),
      ]),
    );
  });

  it.each(fixtures)("keeps magic-item audit paths aligned with readiness blockers for $name", (fixture) => {
    const base = character(fixture);
    const audit = auditMagicItemMechanics(base);
    const report = buildV3ReconstructionReadinessReport(base);
    const blockerPaths = new Set(
      report.blockers
        .filter((blocker) => blocker.code === "imported-magic-item-mechanics-unmodeled")
        .map((blocker) => blocker.path),
    );
    const importedMagicAuditPaths = audit
      .filter((entry) => entry.reasons.includes("imported magic-item effects are display-only"))
      .map((entry) => entry.path);

    expect(importedMagicAuditPaths.every((path) => blockerPaths.has(path))).toBe(true);
    expect(
      audit.every((entry) => entry.itemId.length > 0 && entry.name.length > 0 && entry.path.startsWith("items.")),
    ).toBe(true);
  });

  it("can recognize verified item charges as modeled when the exact item definition owns them", () => {
    const base = character(fixtures[0]);
    const item = base.items.find((entry) => entry.definitionRef !== null)!;
    const modeled = {
      ...base,
      items: [
        {
          ...item,
          provenance: "native" as const,
          details: item.details ? { ...item.details, magic: true } : item.details,
          charges: {
            key: "item:test:charges",
            label: "Test Item Charges",
            current: 3,
            maximum: 3,
            recovery: "dawn" as const,
            sourceVersionKey: item.definitionRef!.versionKey,
            provenance: "verified-rule" as const,
            recoveryRules: [{ trigger: "dawn" as const, restore: { type: "all" as const } }],
          },
        },
        ...base.items.slice(1),
      ],
    };

    expect(auditMagicItemMechanics(modeled)[0]).toMatchObject({
      itemId: item.id,
      mechanicsModeled: true,
      reasons: [],
    });
  });
});
