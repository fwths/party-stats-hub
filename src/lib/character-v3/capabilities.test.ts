import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import {
  applyCapabilityMatches,
  CapabilityReconciliationConflictError,
  CapabilityReconciliationPermissionError,
  reconcileBackgroundCapabilities,
  reconcileStartingClassCapabilities,
  reconcileSpeciesCapabilities,
  reconcileSubclassCapabilities,
  type BackgroundCapabilityCatalogRecord,
  type ClassCapabilityCatalogRecord,
  type SpeciesCapabilityCatalogRecord,
  type SubclassFeatureCapabilityCatalogRecord,
} from "./capabilities";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { buildCapabilityReadinessReport } from "./capability-readiness";
import {
  confirmImportedMagicInitiate,
  MagicInitiateConflictError,
  MagicInitiatePermissionError,
  type MagicInitiateSpellCatalogRecord,
} from "./magic-initiate";
import { confirmImportedTieflingLegacy } from "./tiefling-legacy";
import { confirmImportedElfLineage } from "./elf-lineage";
import { confirmImportedFirbolgMagic } from "./species-spell-bundle";
import type { CharacterAggregate } from "./schema";
import {
  applyCapabilityChoice,
  CapabilityChoiceConflictError,
  CapabilityChoicePermissionError,
  deriveBackgroundCapabilityChoices,
  deriveConditionalSubclassCapabilityChoices,
  deriveOriginFeatCapabilityChoices,
  deriveSpeciesCapabilityChoices,
  deriveStartingClassCapabilityChoices,
  type CapabilityChoiceOption,
  type OriginFeatCapabilityCatalogRecord,
} from "./capability-choices";
import {
  applyAcceptedV3Reconciliation,
  recordContentVersionDecision,
  reconcileCharacterV3,
  type V3CatalogRecord,
} from "./reconcile";

type ClassRow = {
  id: string;
  name: string;
  source: string;
  raw_json: string;
  proficiencies_json: string | null;
};
type SubclassRow = {
  id: string;
  class_id: string;
  name: string;
  source: string;
  raw_json: string | null;
};
type SpeciesRow = {
  id: string;
  name: string;
  source: string;
  raw_json: string;
  senses_json: string | null;
  resistances_json: string | null;
  immunities_json: string | null;
  languages_json: string | null;
};
type BackgroundRow = {
  id: string;
  name: string;
  source: string;
  raw_json: string | null;
  origin_feat_id: string | null;
  tool_proficiencies_json: string | null;
  language_proficiencies_json: string | null;
};
type SpellRow = {
  id: string;
  name: string;
  level: number;
  source: string;
  raw_json: string;
};
type FeatRow = {
  id: string;
  name: string;
  source: string;
  raw_json: string | null;
};

const db = new Database(path.join(process.cwd(), "sqlite.db"), { readonly: true });
afterAll(() => db.close());
const classRows = db
  .prepare("SELECT id, name, source, raw_json, proficiencies_json FROM classes")
  .all() as ClassRow[];
const subclassRows = db
  .prepare("SELECT id, class_id, name, source, raw_json FROM subclasses")
  .all() as SubclassRow[];
const speciesRows = db
  .prepare(
    "SELECT id, name, source, raw_json, senses_json, resistances_json, immunities_json, languages_json FROM species",
  )
  .all() as SpeciesRow[];
const backgroundRows = db
  .prepare(
    "SELECT id, name, source, raw_json, origin_feat_id, tool_proficiencies_json, language_proficiencies_json FROM backgrounds",
  )
  .all() as BackgroundRow[];
const featRows = db.prepare("SELECT id, name, source, raw_json FROM feats").all() as FeatRow[];
const spellRows = db
  .prepare("SELECT id, name, level, source, raw_json FROM spells")
  .all() as SpellRow[];
const spellClasses = db.prepare("SELECT spell_id, class_id FROM class_spells").all() as Array<{
  spell_id: string;
  class_id: string;
}>;

function edition(rawJson: string): string | null {
  try {
    const value = JSON.parse(rawJson).edition;
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

const classRuleCatalog: V3CatalogRecord[] = classRows.map((row) => ({
  kind: "class",
  id: row.id,
  name: row.name,
  sourceId: row.source,
  edition: edition(row.raw_json),
  contentRevision: `catalog:${row.source}:${edition(row.raw_json) ?? "legacy"}`,
}));
const classEdition = new Map(classRuleCatalog.map((record) => [record.id, record.edition]));
const subclassRuleCatalog: V3CatalogRecord[] = subclassRows.map((row) => {
  const recordEdition = edition(row.raw_json ?? "") ?? classEdition.get(row.class_id) ?? null;
  return {
    kind: "subclass",
    id: row.id,
    name: row.name,
    sourceId: row.source,
    edition: recordEdition,
    contentRevision: `catalog:${row.source}:${recordEdition ?? "legacy"}`,
  };
});
const speciesRuleCatalog: V3CatalogRecord[] = speciesRows.map((row) => ({
  kind: "species",
  id: row.id,
  name: row.name,
  sourceId: row.source,
  edition: edition(row.raw_json),
  contentRevision: `catalog:${row.source}:${edition(row.raw_json) ?? "legacy"}`,
}));
const backgroundRuleCatalog: V3CatalogRecord[] = backgroundRows.map((row) => ({
  kind: "background",
  id: row.id,
  name: row.name,
  sourceId: row.source,
  edition: edition(row.raw_json ?? ""),
  contentRevision: `catalog:${row.source}:${edition(row.raw_json ?? "") ?? "legacy"}`,
}));
const featRuleCatalog: V3CatalogRecord[] = featRows.map((row) => ({
  kind: "feat",
  id: row.id,
  name: row.name,
  sourceId: row.source,
  edition: edition(row.raw_json ?? ""),
  contentRevision: `catalog:${row.source}:${edition(row.raw_json ?? "") ?? (["XPHB", "XDMG", "XMM"].includes(row.source) ? "one" : "legacy")}`,
}));
const spellRuleCatalog: V3CatalogRecord[] = spellRows.map((row) => {
  const recordEdition = edition(row.raw_json);
  const current = ["XPHB", "XDMG", "XMM"].includes(row.source) || recordEdition === "one";
  return {
    kind: "spell",
    id: row.id,
    name: row.name,
    sourceId: row.source,
    edition: recordEdition,
    contentRevision: `catalog:${row.source}:${recordEdition ?? (current ? "one" : "legacy")}`,
  };
});
const ruleCatalog: V3CatalogRecord[] = [
  ...classRuleCatalog,
  ...subclassRuleCatalog,
  ...speciesRuleCatalog,
  ...backgroundRuleCatalog,
  ...featRuleCatalog,
];
const capabilityCatalog: ClassCapabilityCatalogRecord[] = classRows.map((row) => ({
  id: row.id,
  sourceId: row.source,
  proficienciesJson: row.proficiencies_json,
}));
const speciesCapabilityCatalog: SpeciesCapabilityCatalogRecord[] = speciesRows.map((row) => ({
  id: row.id,
  sourceId: row.source,
  rawJson: row.raw_json,
  sensesJson: row.senses_json,
  resistancesJson: row.resistances_json,
  immunitiesJson: row.immunities_json,
  languagesJson: row.languages_json,
}));
const backgroundCapabilityCatalog: BackgroundCapabilityCatalogRecord[] = backgroundRows.map(
  (row) => ({
    id: row.id,
    sourceId: row.source,
    originFeatId: row.origin_feat_id,
    toolProficienciesJson: row.tool_proficiencies_json,
    languageProficienciesJson: row.language_proficiencies_json,
  }),
);
const originFeatCapabilityCatalog: OriginFeatCapabilityCatalogRecord[] = featRows.map((row) => {
  const contentRevision = `catalog:${row.source}:${edition(row.raw_json ?? "") ?? (["XPHB", "XDMG", "XMM"].includes(row.source) ? "one" : "legacy")}`;
  return {
    featRef: {
      kind: "feat",
      familyKey: createRuleFamilyKey("feat", row.name),
      versionKey: createRuleVersionKey({
        kind: "feat",
        sourceId: row.source,
        upstreamId: row.id,
        contentRevision,
      }),
      name: row.name,
      rulesGeneration: "2024",
      sourceId: row.source,
      upstreamId: row.id,
      contentRevision,
      compatibility: ["XPHB", "XDMG", "XMM"].includes(row.source) ? "core-2024" : "legacy",
      verification: ["XPHB", "XDMG", "XMM"].includes(row.source)
        ? "verified"
        : "imported-unverified",
    },
    rawJson: row.raw_json,
  };
});
const magicInitiateSpellCatalog: MagicInitiateSpellCatalogRecord[] = spellRows.map((row) => {
  const recordEdition = edition(row.raw_json);
  const current = ["XPHB", "XDMG", "XMM"].includes(row.source) || recordEdition === "one";
  const contentRevision = `catalog:${row.source}:${recordEdition ?? (current ? "one" : "legacy")}`;
  return {
    spellRef: {
      kind: "spell",
      familyKey: createRuleFamilyKey("spell", row.name),
      versionKey: createRuleVersionKey({
        kind: "spell",
        sourceId: row.source,
        upstreamId: row.id,
        contentRevision,
      }),
      name: row.name,
      rulesGeneration: "2024",
      sourceId: row.source,
      upstreamId: row.id,
      contentRevision,
      compatibility: current
        ? row.source === "XPHB"
          ? "core-2024"
          : "current-2024-compatible"
        : "legacy",
      verification: current ? "verified" : "imported-unverified",
    },
    level: row.level,
    classIds: spellClasses
      .filter((entry) => entry.spell_id === row.id)
      .map((entry) => entry.class_id),
  };
});

let currentCapabilityOptionCache: CapabilityChoiceOption[] | null = null;

function currentCapabilityOptions(): CapabilityChoiceOption[] {
  if (currentCapabilityOptionCache) return currentCapabilityOptionCache;
  const instruments = db
    .prepare(
      "SELECT id, name, source, raw_json FROM compendium_entries WHERE entity_type = 'baseitem' AND source = 'XPHB'",
    )
    .all() as Array<{ id: string; name: string; source: string; raw_json: string }>;
  const languageRows = db
    .prepare("SELECT id, name, source, type FROM languages WHERE source = 'XPHB'")
    .all() as Array<{ id: string; name: string; source: string; type: string | null }>;
  const ref = (input: { kind: "tool" | "language"; id: string; name: string; source: string }) => {
    const contentRevision = `catalog:${input.source}:one`;
    return {
      kind: input.kind,
      familyKey: createRuleFamilyKey("other", input.name),
      versionKey: createRuleVersionKey({
        kind: "other",
        sourceId: input.source,
        upstreamId: input.id,
        contentRevision,
      }),
      name: input.name,
      rulesGeneration: "2024" as const,
      sourceId: input.source,
      upstreamId: input.id,
      contentRevision,
      compatibility: "core-2024" as const,
      verification: "verified" as const,
    };
  };
  currentCapabilityOptionCache = [
    ...instruments.flatMap((row) => {
      const type = String(JSON.parse(row.raw_json).type);
      if (type.startsWith("INS")) {
        return [
          {
            ref: ref({ kind: "tool", ...row }),
            capabilityLabel: row.name,
            choiceSourceVersionKey: null,
            categories: ["tool", "musical-instrument"] as const,
          },
        ];
      }
      if (type.startsWith("AT")) {
        return [
          {
            ref: ref({ kind: "tool", ...row }),
            capabilityLabel: row.name,
            choiceSourceVersionKey: null,
            categories: ["tool", "artisan-tool"] as const,
          },
        ];
      }
      return [];
    }),
    ...languageRows.map((row) => ({
      ref: ref({ kind: "language", ...row }),
      capabilityLabel: row.name,
      choiceSourceVersionKey: null,
      categories: row.type === "standard" ? (["standard-language"] as const) : [],
    })),
  ].filter((option) => option.categories.length > 0) as CapabilityChoiceOption[];
  return currentCapabilityOptionCache;
}
const subclassVersions = new Map(
  subclassRuleCatalog.map((record) => [
    record.id,
    createRuleVersionKey({
      kind: "subclass",
      sourceId: record.sourceId,
      upstreamId: record.id,
      contentRevision: record.contentRevision,
    }),
  ]),
);
const subclassFeatureCatalog: SubclassFeatureCapabilityCatalogRecord[] = (
  db
    .prepare(
      "SELECT id, name, source, subclass_id, level_required, foundry_json FROM class_features WHERE subclass_id IS NOT NULL",
    )
    .all() as Array<{
    id: string;
    name: string;
    source: string;
    subclass_id: string;
    level_required: number;
    foundry_json: string | null;
  }>
).map((row) => {
  const subclass = subclassRuleCatalog.find((record) => record.id === row.subclass_id)!;
  const contentRevision = subclass.contentRevision;
  return {
    subclassVersionKey: subclassVersions.get(row.subclass_id)!,
    featureRef: {
      kind: "feature",
      familyKey: createRuleFamilyKey("feature", row.name),
      versionKey: createRuleVersionKey({
        kind: "feature",
        sourceId: row.source,
        upstreamId: row.id,
        contentRevision,
      }),
      name: row.name,
      rulesGeneration: "2024",
      sourceId: row.source,
      upstreamId: row.id,
      contentRevision,
      compatibility: ["XPHB", "XDMG", "XMM"].includes(row.source)
        ? "core-2024"
        : subclass.edition === "one"
          ? "current-2024-compatible"
          : "legacy",
      verification:
        ["XPHB", "XDMG", "XMM"].includes(row.source) || subclass.edition === "one"
          ? "verified"
          : "imported-unverified",
    },
    levelRequired: row.level_required,
    foundryJson: row.foundry_json,
  };
});

const fixtures = [
  {
    id: 97349530,
    owner: "qemuel",
    matches: 6,
    unexplained: [
      "Heavy Armor",
      "Calligrapher's Supplies",
      "Leatherworker's Tools",
      "Smith's Tools",
    ],
    deferred: ["tool:anyArtisansTool:1"],
  },
  {
    id: 131296315,
    owner: "nikos",
    matches: 1,
    unexplained: ["Calligrapher's Supplies"],
    deferred: [],
  },
  {
    id: 131593533,
    owner: "eleni",
    matches: 2,
    unexplained: ["Bagpipes", "Drum", "Dulcimer", "Flute", "Lute", "Lyre", "Viol"],
    deferred: ["tool:anyMusicalInstrument:3"],
  },
  {
    id: 132900149,
    owner: "alexia",
    matches: 4,
    unexplained: ["Calligrapher's Supplies"],
    deferred: [],
  },
  {
    id: 132940690,
    owner: "andreas",
    matches: 5,
    unexplained: ["Flute"],
    deferred: [],
  },
] as const;

const canonicalCharacterCache = new Map<number, CharacterAggregate>();

function canonicalCharacter(fixture: (typeof fixtures)[number]) {
  const cached = canonicalCharacterCache.get(fixture.id);
  if (cached) return cached;
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", `char-${fixture.id}.json`), "utf8"),
  );
  const imported = migrateDdbPayloadToCharacterV3({
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
  const character = applyAcceptedV3Reconciliation({
    character: imported,
    report: reconcileCharacterV3(imported, ruleCatalog),
    catalogRevision: "sqlite:class-capability-test",
  });
  canonicalCharacterCache.set(fixture.id, character);
  return character;
}

function applyDeterministicCapabilityMatches(character: ReturnType<typeof canonicalCharacter>) {
  let current = character;
  const reports = [
    () => reconcileStartingClassCapabilities(current, capabilityCatalog),
    () => reconcileSubclassCapabilities(current, subclassFeatureCatalog),
    () => reconcileSpeciesCapabilities(current, speciesCapabilityCatalog),
    () => reconcileBackgroundCapabilities(current, backgroundCapabilityCatalog),
  ];
  reports.forEach((createReport, index) => {
    const report = createReport();
    if (report.matches.length === 0) return;
    current = applyCapabilityMatches({
      character: current,
      report,
      actorUserId: current.identity.ownerUserId,
      expectedBuildRevision: current.build.revision,
      mutationId: `${current.identity.ownerUserId}:readiness-fixed:${index}`,
    }).character;
  });
  return current;
}

describe("Character V3 fixed starting-class capabilities", () => {
  it.each(fixtures)("matches only deterministic class grants for $id", (fixture) => {
    const character = canonicalCharacter(fixture);
    const report = reconcileStartingClassCapabilities(character, capabilityCatalog);

    expect(report.issues).toEqual([]);
    expect(report.matches).toHaveLength(fixture.matches);
    expect(report.missingFromBaseline).toEqual([]);
    expect(report.deferredChoices).toEqual(fixture.deferred);
    expect(report.unexplainedBaseline.map((capability) => capability.label).sort()).toEqual(
      [...fixture.unexplained].sort(),
    );
    expect(report.matches.every((match) => match.grant.sourceRef.verification === "verified")).toBe(
      true,
    );
  });

  it.each(fixtures)("removes proven matches and records exact provenance for $id", (fixture) => {
    const character = canonicalCharacter(fixture);
    const beforeCapabilities = character.migrationBaseline!.capabilities.length;
    const report = reconcileStartingClassCapabilities(character, capabilityCatalog);
    const result = applyCapabilityMatches({
      character,
      report,
      actorUserId: fixture.owner,
      expectedBuildRevision: character.build.revision,
      mutationId: `${fixture.owner}:starting-class-capabilities`,
    });

    expect(result.character.migrationBaseline!.capabilities).toHaveLength(
      beforeCapabilities - fixture.matches,
    );
    expect(
      result.character.resolutions.filter(
        (resolution) => resolution.type === "capability-baseline-reconciled",
      ),
    ).toHaveLength(fixture.matches);
    expect(result.auditEvent.removedCapabilityIds).toHaveLength(fixture.matches);
    expect(result.auditEvent.sourceVersionKeys).toEqual([
      character.build.levels[0].classRef.versionKey,
    ]);
  });

  it("does not infer Qemuel's Heavy Armor from base Artificer", () => {
    const qemuel = canonicalCharacter(fixtures[0]);
    const report = reconcileStartingClassCapabilities(qemuel, capabilityCatalog);
    expect(report.unexplainedBaseline).toContainEqual(
      expect.objectContaining({ kind: "armor-proficiency", label: "Heavy Armor" }),
    );
    expect(report.grants.map((grant) => grant.label)).not.toContain("Heavy Armor");
  });

  it("derives Armorer Heavy Armor but defers conditional Smith's Tools provenance", () => {
    const qemuel = canonicalCharacter(fixtures[0]);
    const classReport = reconcileStartingClassCapabilities(qemuel, capabilityCatalog);
    const afterClass = applyCapabilityMatches({
      character: qemuel,
      report: classReport,
      actorUserId: "qemuel",
      expectedBuildRevision: qemuel.build.revision,
      mutationId: "qemuel:class-capabilities-before-subclass",
    }).character;
    const subclassReport = reconcileSubclassCapabilities(afterClass, subclassFeatureCatalog);

    expect(subclassReport.matches).toHaveLength(1);
    expect(subclassReport.matches[0]).toMatchObject({
      baseline: { label: "Heavy Armor", kind: "armor-proficiency" },
      grant: {
        label: "Heavy Armor",
        grantMode: "fixed-subclass-feature",
        sourceRef: { name: "Tools of the Trade", verification: "verified" },
      },
    });
    expect(subclassReport.deferredChoices).toEqual(
      expect.arrayContaining([
        expect.stringContaining("conditional-tool:"),
        expect.stringContaining("anyArtisansTool:1"),
      ]),
    );
    expect(subclassReport.grants.map((grant) => grant.label)).not.toContain("Smith's Tools");

    const result = applyCapabilityMatches({
      character: afterClass,
      report: subclassReport,
      actorUserId: "qemuel",
      expectedBuildRevision: afterClass.build.revision,
      mutationId: "qemuel:armorer-capabilities",
    });
    const remainingLabels = result.character.migrationBaseline!.capabilities.map(
      (capability) => capability.label,
    );
    expect(remainingLabels).not.toContain("Heavy Armor");
    expect(remainingLabels).toContain("Smith's Tools");
  });

  it.each([
    { fixture: fixtures[0], unexplainedDefenses: ["Fire"] },
    { fixture: fixtures[2], unexplainedDefenses: ["Fire"] },
    { fixture: fixtures[1], unexplainedDefenses: ["Magical Sleep", "Psychic"] },
  ])(
    "derives only fixed current-species capabilities for $fixture.id",
    ({ fixture, unexplainedDefenses }) => {
      const character = canonicalCharacter(fixture);
      const report = reconcileSpeciesCapabilities(character, speciesCapabilityCatalog);

      expect(report.matches).toContainEqual(
        expect.objectContaining({
          baseline: expect.objectContaining({
            label: "Darkvision",
            kind: "sense",
            value: 60,
            sourceRef: null,
            status: "imported-unreconciled",
            id: expect.any(String),
            currentSheetConfirmation: {
              method: "ddb-current-sheet",
              status: "owner-confirmed",
              sourceSystem: "ddb",
            },
          }),
          grant: expect.objectContaining({
            label: "Darkvision",
            kind: "sense",
            value: 60,
            grantMode: "fixed-species",
            sourceRef: expect.objectContaining({ verification: "verified" }),
          }),
        }),
      );
      for (const label of unexplainedDefenses) {
        expect(report.unexplainedBaseline.map((capability) => capability.label)).toContain(label);
      }
      if (fixture.id === 97349530 || fixture.id === 131593533) {
        expect(report.deferredChoices).toContainEqual(
          expect.stringContaining("resistance-choice:"),
        );
        expect(report.grants.map((grant) => grant.label)).not.toContain("Fire");
      }
    },
  );

  it("removes Tiefling Darkvision without inventing the chosen Fiendish Legacy resistance", () => {
    const qemuel = canonicalCharacter(fixtures[0]);
    const report = reconcileSpeciesCapabilities(qemuel, speciesCapabilityCatalog);
    const result = applyCapabilityMatches({
      character: qemuel,
      report,
      actorUserId: "qemuel",
      expectedBuildRevision: qemuel.build.revision,
      mutationId: "qemuel:species-capabilities",
    });
    const remaining = result.character.migrationBaseline!.capabilities.map(
      (capability) => capability.label,
    );
    expect(remaining).not.toContain("Darkvision");
    expect(remaining).toContain("Fire");
  });

  it("refuses legacy species capabilities until the owner approves the exact version", () => {
    for (const fixture of [fixtures[3], fixtures[4]]) {
      const character = canonicalCharacter(fixture);
      const report = reconcileSpeciesCapabilities(character, speciesCapabilityCatalog);
      expect(report.grants).toEqual([]);
      expect(report.matches).toEqual([]);
      expect(report.issues).toContainEqual(expect.stringContaining("has not been approved"));
    }
  });

  it("derives fixed Half-Orc capabilities only after an explicit legacy-version decision", () => {
    const dresana = canonicalCharacter(fixtures[4]);
    const versionReport = reconcileCharacterV3(dresana, ruleCatalog);
    const halfOrc = versionReport.entries.find((entry) => entry.imported.name === "Half-Orc")!;
    const approved = recordContentVersionDecision({
      character: dresana,
      report: versionReport,
      decision: {
        mutationId: "andreas:test-approve-half-orc",
        actorUserId: "andreas",
        expectedBuildRevision: dresana.build.revision,
        importedVersionKey: halfOrc.imported.versionKey,
        resolution: "accept-matched-version",
        reason: "Test-only approval of the matched legacy species.",
        catalogRevision: "sqlite:species-capability-test",
      },
    }).character;
    const report = reconcileSpeciesCapabilities(approved, speciesCapabilityCatalog);

    expect(report.issues).toEqual([]);
    expect(report.matches.map((match) => match.baseline.label).sort()).toEqual([
      "Common",
      "Darkvision",
      "Orc",
    ]);
    expect(report.unexplainedBaseline.map((capability) => capability.label)).toContain("Goblin");
    expect(
      report.grants.every((grant) => grant.sourceRef.compatibility === "legacy-5e-compatible"),
    ).toBe(true);

    const result = applyCapabilityMatches({
      character: approved,
      report,
      actorUserId: "andreas",
      expectedBuildRevision: approved.build.revision,
      mutationId: "andreas:half-orc-capabilities",
    });
    const remaining = result.character.migrationBaseline!.capabilities.map(
      (capability) => capability.label,
    );
    expect(remaining).not.toContain("Darkvision");
    expect(remaining).not.toContain("Common");
    expect(remaining).not.toContain("Orc");
    expect(remaining).toContain("Goblin");
  });

  it("reports unsupported catalog grants instead of guessing", () => {
    const willow = canonicalCharacter(fixtures[1]);
    const row = capabilityCatalog.find((candidate) => candidate.id === "sorcerer")!;
    const report = reconcileStartingClassCapabilities(willow, [
      {
        ...row,
        proficienciesJson: JSON.stringify({
          starting: { weapons: ["choose one exotic weapon"] },
        }),
      },
    ]);
    expect(report.grants).toEqual([]);
    expect(report.matches).toEqual([]);
    expect(report.issues).toEqual([
      "Unsupported weapon-proficiency grant: choose one exotic weapon",
    ]);
  });

  it("enforces owner, revision, and report freshness", () => {
    const dresana = canonicalCharacter(fixtures[4]);
    const report = reconcileStartingClassCapabilities(dresana, capabilityCatalog);
    const base = {
      character: dresana,
      report,
      actorUserId: "andreas",
      expectedBuildRevision: dresana.build.revision,
      mutationId: "dresana:capability-guards",
    };
    expect(() => applyCapabilityMatches({ ...base, actorUserId: "qemuel" })).toThrow(
      CapabilityReconciliationPermissionError,
    );
    expect(() =>
      applyCapabilityMatches({
        ...base,
        expectedBuildRevision: dresana.build.revision + 1,
      }),
    ).toThrow(CapabilityReconciliationConflictError);
    expect(() =>
      applyCapabilityMatches({
        ...base,
        report: { ...report, buildRevision: report.buildRevision - 1 },
      }),
    ).toThrow(/does not match the current character revision/);
  });
});

describe("Character V3 background capabilities", () => {
  it.each([
    { fixture: fixtures[0], background: "Sage" },
    { fixture: fixtures[1], background: "Acolyte" },
    { fixture: fixtures[3], background: "Sage" },
  ])("reconciles the fixed Calligrapher's Supplies grant from $background", ({ fixture }) => {
    const character = canonicalCharacter(fixture);
    const report = reconcileBackgroundCapabilities(character, backgroundCapabilityCatalog);

    expect(report.issues).toEqual([]);
    expect(report.deferredChoices).toEqual([]);
    expect(report.matches).toHaveLength(1);
    expect(report.matches[0]).toMatchObject({
      baseline: { kind: "tool", label: "Calligrapher's Supplies" },
      grant: {
        kind: "tool",
        label: "Calligrapher's Supplies",
        grantMode: "fixed-background",
        sourceRef: { verification: "verified" },
      },
    });

    const result = applyCapabilityMatches({
      character,
      report,
      actorUserId: fixture.owner,
      expectedBuildRevision: character.build.revision,
      mutationId: `${fixture.owner}:fixed-background-capability`,
    });
    expect(
      result.character.migrationBaseline?.capabilities.some(
        (capability) => capability.label === "Calligrapher's Supplies",
      ),
    ).toBe(false);
    expect(result.auditEvent.sourceVersionKeys).toEqual([character.build.backgroundRef.versionKey]);
  });

  it("does not guess which of Ari's instruments came from Entertainer", () => {
    const ari = canonicalCharacter(fixtures[2]);
    const report = reconcileBackgroundCapabilities(ari, backgroundCapabilityCatalog);

    expect(report.grants).toEqual([]);
    expect(report.matches).toEqual([]);
    expect(report.deferredChoices).toEqual([
      `background-choice:${ari.build.backgroundRef.versionKey}:tool:0:anymusicalinstrument:1`,
    ]);
    expect(report.unexplainedBaseline.map((capability) => capability.label)).toEqual(
      expect.arrayContaining(["Bagpipes", "Drum", "Dulcimer", "Flute", "Lute", "Lyre", "Viol"]),
    );
  });

  it("blocks Outlander grants before approval, then preserves both owner choices as unresolved", () => {
    const dresana = canonicalCharacter(fixtures[4]);
    const blocked = reconcileBackgroundCapabilities(dresana, backgroundCapabilityCatalog);
    expect(blocked.grants).toEqual([]);
    expect(blocked.issues).toEqual([expect.stringContaining("has not been approved")]);

    const versionReport = reconcileCharacterV3(dresana, ruleCatalog);
    const outlander = versionReport.entries.find((entry) => entry.imported.name === "Outlander")!;
    const approved = recordContentVersionDecision({
      character: dresana,
      report: versionReport,
      decision: {
        mutationId: "andreas:test-approve-outlander",
        actorUserId: "andreas",
        expectedBuildRevision: dresana.build.revision,
        importedVersionKey: outlander.imported.versionKey,
        resolution: "accept-matched-version",
        reason: "Test-only approval of the matched legacy background.",
        catalogRevision: "sqlite:background-capability-test",
      },
    }).character;
    const report = reconcileBackgroundCapabilities(approved, backgroundCapabilityCatalog);

    expect(report.issues).toEqual([]);
    expect(report.grants).toEqual([]);
    expect(report.matches).toEqual([]);
    expect(report.deferredChoices).toHaveLength(2);
    expect(report.deferredChoices).toEqual(
      expect.arrayContaining([
        expect.stringContaining(":tool:0:anymusicalinstrument:1"),
        expect.stringContaining(":language:0:anyStandard:1"),
      ]),
    );
    expect(report.unexplainedBaseline.map((capability) => capability.label)).toEqual(
      expect.arrayContaining(["Flute", "Goblin"]),
    );
  });
});

describe("Character V3 owner-confirmed capability choices", () => {
  it("requires Alexia's exact Firbolg approval before confirming Firbolg Magic", () => {
    const echo = canonicalCharacter(fixtures[3]);
    const selectedSpellVersionKeys = ["Detect Magic", "Disguise Self"].map(
      (name) =>
        magicInitiateSpellCatalog.find(
          (entry) => entry.spellRef.name === name && entry.spellRef.sourceId === "XPHB",
        )!.spellRef.versionKey,
    );
    const base = {
      character: echo,
      speciesCatalog: speciesCapabilityCatalog,
      spellCatalog: magicInitiateSpellCatalog,
      actorUserId: "alexia",
      expectedBuildRevision: echo.build.revision,
      mutationId: "alexia:test-confirm-firbolg-magic",
      castingAbility: "WIS" as const,
      selectedSpellVersionKeys,
    };
    expect(() => confirmImportedFirbolgMagic(base)).toThrow(
      /Firbolg version must be verified or explicitly approved/,
    );
    const versionReport = reconcileCharacterV3(echo, ruleCatalog);
    const firbolg = versionReport.entries.find((entry) => entry.imported.name === "Firbolg")!;
    const approved = recordContentVersionDecision({
      character: echo,
      report: versionReport,
      decision: {
        mutationId: "alexia:test-approve-mpmm-firbolg",
        actorUserId: "alexia",
        expectedBuildRevision: echo.build.revision,
        importedVersionKey: firbolg.imported.versionKey,
        resolution: "accept-matched-version",
        reason: "Test-only explicit approval of exact MPMM Firbolg.",
        catalogRevision: "sqlite:firbolg-magic-test",
      },
    }).character;
    const result = confirmImportedFirbolgMagic({
      ...base,
      character: approved,
      expectedBuildRevision: approved.build.revision,
      mutationId: "alexia:test-confirm-approved-firbolg-magic",
    });
    expect(result.character.build.decisions).toContainEqual(
      expect.objectContaining({
        type: "species-spell-bundle-selection",
        traitName: "Firbolg Magic",
        castingAbility: "WIS",
        sourceRef: expect.objectContaining({
          name: "Firbolg",
          compatibility: "legacy-5e-compatible",
          verification: "imported-unverified",
        }),
      }),
    );
    const confirmed = result.character.build.spells.filter((spell) =>
      spell.decisionId?.includes("decision:firbolg-magic"),
    );
    expect(confirmed.map((spell) => spell.spellRef.name).sort()).toEqual([
      "Detect Magic",
      "Disguise Self",
    ]);
    expect(result.auditEvent.type).toBe("confirm-firbolg-magic-import");
  });

  it("atomically confirms Willow's High Elf lineage and Charisma spellcasting", () => {
    const willow = canonicalCharacter(fixtures[1]);
    const spellNames = ["Detect Magic", "Elementalism", "Misty Step"];
    const selectedSpellVersionKeys = spellNames.map(
      (name) =>
        magicInitiateSpellCatalog.find(
          (entry) => entry.spellRef.name === name && entry.spellRef.sourceId === "XPHB",
        )!.spellRef.versionKey,
    );
    const result = confirmImportedElfLineage({
      character: willow,
      speciesCatalog: speciesCapabilityCatalog,
      spellCatalog: magicInitiateSpellCatalog,
      actorUserId: "nikos",
      expectedBuildRevision: willow.build.revision,
      mutationId: "nikos:test-confirm-high-elf-lineage",
      lineage: "high-elf",
      castingAbility: "CHA",
      selectedSpellVersionKeys,
    });
    expect(result.character.build.decisions).toContainEqual(
      expect.objectContaining({
        type: "elf-lineage-selection",
        lineage: "high-elf",
        castingAbility: "CHA",
        sourceRef: expect.objectContaining({ name: "Elf", sourceId: "XPHB" }),
      }),
    );
    const confirmed = result.character.build.spells.filter((spell) =>
      spell.decisionId?.includes("decision:elf-lineage"),
    );
    expect(confirmed.map((spell) => spell.spellRef.name).sort()).toEqual(spellNames);
    expect(result.auditEvent.type).toBe("confirm-elf-lineage-import");
    expect(() =>
      confirmImportedElfLineage({
        character: result.character,
        speciesCatalog: speciesCapabilityCatalog,
        spellCatalog: magicInitiateSpellCatalog,
        actorUserId: "nikos",
        expectedBuildRevision: result.character.build.revision,
        mutationId: "nikos:test-replay-high-elf-lineage",
        lineage: "high-elf",
        castingAbility: "CHA",
        selectedSpellVersionKeys,
      }),
    ).toThrow(/already been confirmed/);
  });

  it("rejects a non-Wizard cantrip for High Elf lineage", () => {
    const willow = canonicalCharacter(fixtures[1]);
    const selectedSpellVersionKeys = ["Detect Magic", "Guidance", "Misty Step"].map(
      (name) =>
        magicInitiateSpellCatalog.find(
          (entry) => entry.spellRef.name === name && entry.spellRef.sourceId === "XPHB",
        )!.spellRef.versionKey,
    );
    expect(() =>
      confirmImportedElfLineage({
        character: willow,
        speciesCatalog: speciesCapabilityCatalog,
        spellCatalog: magicInitiateSpellCatalog,
        actorUserId: "nikos",
        expectedBuildRevision: willow.build.revision,
        mutationId: "nikos:test-reject-high-elf-guidance",
        lineage: "high-elf",
        castingAbility: "CHA",
        selectedSpellVersionKeys,
      }),
    ).toThrow(/one Wizard cantrip/);
  });

  it.each([
    { fixture: fixtures[0], ability: "INT" as const },
    { fixture: fixtures[2], ability: "CHA" as const },
  ])("atomically confirms Infernal Legacy resistance and spells for $fixture.id", (expected) => {
    const character = canonicalCharacter(expected.fixture);
    const spellNames = ["Darkness", "Fire Bolt", "Hellish Rebuke", "Thaumaturgy"];
    const selectedSpellVersionKeys = spellNames.map(
      (name) =>
        magicInitiateSpellCatalog.find(
          (entry) => entry.spellRef.name === name && entry.spellRef.sourceId === "XPHB",
        )!.spellRef.versionKey,
    );
    const result = confirmImportedTieflingLegacy({
      character,
      speciesCatalog: speciesCapabilityCatalog,
      spellCatalog: magicInitiateSpellCatalog,
      actorUserId: expected.fixture.owner,
      expectedBuildRevision: character.build.revision,
      mutationId: `${expected.fixture.owner}:test-confirm-infernal-legacy`,
      legacy: "infernal",
      castingAbility: expected.ability,
      selectedSpellVersionKeys,
    });
    expect(result.character.build.decisions).toContainEqual(
      expect.objectContaining({
        type: "tiefling-legacy-selection",
        sourceRef: expect.objectContaining({ name: "Tiefling", sourceId: "XPHB" }),
        legacy: "infernal",
        castingAbility: expected.ability,
        resistance: "Fire",
      }),
    );
    expect(result.character.migrationBaseline?.capabilities).not.toContainEqual(
      expect.objectContaining({ kind: "resistance", label: "Fire" }),
    );
    const confirmed = result.character.build.spells.filter((spell) =>
      spell.decisionId?.includes("decision:tiefling-legacy"),
    );
    expect(confirmed.map((spell) => spell.spellRef.name).sort()).toEqual(spellNames);
    expect(confirmed.every((spell) => spell.spellRef.sourceId === "XPHB")).toBe(true);
    expect(() =>
      confirmImportedTieflingLegacy({
        character: result.character,
        speciesCatalog: speciesCapabilityCatalog,
        spellCatalog: magicInitiateSpellCatalog,
        actorUserId: expected.fixture.owner,
        expectedBuildRevision: result.character.build.revision,
        mutationId: `${expected.fixture.owner}:test-replay-infernal-legacy`,
        legacy: "infernal",
        castingAbility: expected.ability,
        selectedSpellVersionKeys,
      }),
    ).toThrow(/already been confirmed/);
    expect(result.auditEvent).toMatchObject({
      type: "confirm-tiefling-legacy-import",
      legacy: "infernal",
      resistance: "Fire",
    });
  });

  it("rejects a Tiefling legacy whose spells and resistance do not match the imported bundle", () => {
    const qemuel = canonicalCharacter(fixtures[0]);
    const abyssalSpells = ["Hold Person", "Poison Spray", "Ray of Sickness", "Thaumaturgy"].map(
      (name) =>
        magicInitiateSpellCatalog.find(
          (entry) => entry.spellRef.name === name && entry.spellRef.sourceId === "XPHB",
        )!.spellRef.versionKey,
    );
    expect(() =>
      confirmImportedTieflingLegacy({
        character: qemuel,
        speciesCatalog: speciesCapabilityCatalog,
        spellCatalog: magicInitiateSpellCatalog,
        actorUserId: "qemuel",
        expectedBuildRevision: qemuel.build.revision,
        mutationId: "qemuel:test-reject-abyssal-legacy",
        legacy: "abyssal",
        castingAbility: "INT",
        selectedSpellVersionKeys: abyssalSpells,
      }),
    ).toThrow(/does not match abyssal legacy/);
  });

  it.each([
    {
      fixture: fixtures[0],
      feat: "Magic Initiate (Wizard)",
      ability: "INT",
      spells: ["Booming Blade", "Identify", "Mage Hand"],
    },
    {
      fixture: fixtures[1],
      feat: "Magic Initiate (Cleric)",
      ability: "CHA",
      spells: ["Bless", "Guidance", "Thaumaturgy"],
    },
    {
      fixture: fixtures[3],
      feat: "Magic Initiate (Wizard)",
      ability: "WIS",
      spells: ["Fire Bolt", "Mage Hand", "Shield"],
    },
  ])("preserves source-aware Magic Initiate spells for $fixture.id", (expected) => {
    const character = canonicalCharacter(expected.fixture);
    const featSpells = character.build.spells.filter(
      (spell) => spell.grantSourceRef?.name === expected.feat,
    );
    expect(featSpells.map((spell) => spell.spellRef.name).sort()).toEqual(expected.spells);
    expect(featSpells.every((spell) => spell.classVersionKey === null)).toBe(true);
    expect(featSpells.every((spell) => spell.mode === "granted")).toBe(true);
    expect(featSpells.every((spell) => spell.castingAbility === expected.ability)).toBe(true);
    for (const name of expected.spells) {
      expect(character.build.spells.filter((spell) => spell.spellRef.name === name)).toHaveLength(
        1,
      );
    }
  });

  it.each([
    {
      fixture: fixtures[0],
      species: "Tiefling",
      ability: "INT",
      spells: ["Darkness", "Fire Bolt", "Hellish Rebuke", "Thaumaturgy"],
    },
    {
      fixture: fixtures[1],
      species: "Elf",
      ability: "CHA",
      spells: ["Detect Magic", "Elementalism", "Misty Step"],
    },
    {
      fixture: fixtures[3],
      species: "Firbolg",
      ability: "WIS",
      spells: ["Detect Magic", "Disguise Self"],
    },
  ])("preserves deduplicated species-granted spells for $fixture.id", (expected) => {
    const character = canonicalCharacter(expected.fixture);
    const speciesSpells = character.build.spells.filter(
      (spell) => spell.grantSourceRef?.versionKey === character.build.speciesRef.versionKey,
    );
    expect(speciesSpells.map((spell) => spell.spellRef.name).sort()).toEqual(expected.spells);
    expect(speciesSpells.every((spell) => spell.classVersionKey === null)).toBe(true);
    expect(speciesSpells.every((spell) => spell.castingAbility === expected.ability)).toBe(true);
    expect(speciesSpells.every((spell) => spell.grantSourceRef?.name === expected.species)).toBe(
      true,
    );
  });

  it("preserves Qemuel's Sending spell as item-granted by Sending Stones", () => {
    const qemuel = canonicalCharacter(fixtures[0]);
    const sending = qemuel.build.spells.find(
      (spell) => spell.spellRef.name === "Sending" && spell.grantSourceRef?.kind === "item",
    )!;
    expect(sending).toMatchObject({
      classVersionKey: null,
      mode: "granted",
      grantSourceRef: { kind: "item", name: "Sending Stones" },
    });
  });

  it.each([
    {
      fixture: fixtures[1],
      list: "cleric" as const,
      ability: "CHA" as const,
      spells: ["Bless", "Guidance", "Thaumaturgy"],
    },
    {
      fixture: fixtures[3],
      list: "wizard" as const,
      ability: "WIS" as const,
      spells: ["Fire Bolt", "Mage Hand", "Shield"],
    },
  ])("atomically confirms exact Magic Initiate choices for $fixture.id", (expected) => {
    const character = canonicalCharacter(expected.fixture);
    const feat = originFeatCapabilityCatalog.find(
      (entry) => entry.featRef.name === "Magic Initiate" && entry.featRef.sourceId === "XPHB",
    )!;
    const selectedSpellVersionKeys = expected.spells.map(
      (name) =>
        magicInitiateSpellCatalog.find(
          (entry) => entry.spellRef.name === name && entry.spellRef.sourceId === "XPHB",
        )!.spellRef.versionKey,
    );
    const result = confirmImportedMagicInitiate({
      character,
      feat: { featRef: feat.featRef, rawJson: feat.rawJson! },
      spellCatalog: magicInitiateSpellCatalog,
      actorUserId: expected.fixture.owner,
      expectedBuildRevision: character.build.revision,
      mutationId: `${expected.fixture.owner}:test-confirm-magic-initiate`,
      spellList: expected.list,
      castingAbility: expected.ability,
      selectedSpellVersionKeys,
    });
    expect(result.character.build.decisions).toContainEqual(
      expect.objectContaining({
        type: "magic-initiate-selection",
        sourceRef: expect.objectContaining({ name: "Magic Initiate", sourceId: "XPHB" }),
        spellList: expected.list,
        castingAbility: expected.ability,
      }),
    );
    const confirmed = result.character.build.spells.filter(
      (spell) => spell.decisionId === result.character.build.decisions.at(-1)!.id,
    );
    expect(confirmed.map((spell) => spell.spellRef.name).sort()).toEqual(expected.spells);
    expect(confirmed.every((spell) => spell.spellRef.verification === "verified")).toBe(true);
    expect(result.auditEvent.spellVersionKeys).toEqual(selectedSpellVersionKeys);
    expect(() =>
      confirmImportedMagicInitiate({
        character: result.character,
        feat: { featRef: feat.featRef, rawJson: feat.rawJson! },
        spellCatalog: magicInitiateSpellCatalog,
        actorUserId: expected.fixture.owner,
        expectedBuildRevision: result.character.build.revision,
        mutationId: `${expected.fixture.owner}:test-replay-magic-initiate`,
        spellList: expected.list,
        castingAbility: expected.ability,
        selectedSpellVersionKeys,
      }),
    ).toThrow(/already been confirmed/);
  });

  it("confirms Qemuel's TCE Booming Blade under the MOB legacy-compatible table policy", () => {
    const qemuel = canonicalCharacter(fixtures[0]);
    const feat = originFeatCapabilityCatalog.find(
      (entry) => entry.featRef.name === "Magic Initiate" && entry.featRef.sourceId === "XPHB",
    )!;
    const selectedSpellVersionKeys = ["Booming Blade", "Identify", "Mage Hand"].map(
      (name) =>
        magicInitiateSpellCatalog.find((entry) => entry.spellRef.name === name)!.spellRef
          .versionKey,
    );
    const base = {
      character: qemuel,
      feat: { featRef: feat.featRef, rawJson: feat.rawJson! },
      spellCatalog: magicInitiateSpellCatalog,
      actorUserId: "qemuel",
      expectedBuildRevision: qemuel.build.revision,
      mutationId: "qemuel:test-confirm-magic-initiate",
      spellList: "wizard" as const,
      castingAbility: "INT" as const,
      selectedSpellVersionKeys,
    };
    expect(() => confirmImportedMagicInitiate({ ...base, actorUserId: "alexia" })).toThrow(
      MagicInitiatePermissionError,
    );
    expect(() =>
      confirmImportedMagicInitiate({
        ...base,
        expectedBuildRevision: qemuel.build.revision + 1,
      }),
    ).toThrow(MagicInitiateConflictError);
    expect(() =>
      confirmImportedMagicInitiate({
        ...base,
        spellList: "cleric",
      }),
    ).toThrow(/not on the cleric list/);

    const magicInitiateRuleCatalog = [...ruleCatalog, ...spellRuleCatalog];
    const versionReport = reconcileCharacterV3(qemuel, magicInitiateRuleCatalog);
    const boomingBlade = versionReport.entries.find(
      (entry) => entry.imported.name === "Booming Blade",
    )!;
    expect(boomingBlade.canonical).toMatchObject({
      name: "Booming Blade",
      sourceId: "TCE",
      compatibility: "legacy-5e-compatible",
      verification: "imported-unverified",
    });
    const result = confirmImportedMagicInitiate({
      ...base,
      mutationId: "qemuel:test-confirm-mob-policy-magic-initiate",
    });
    expect(result.character.build.decisions).toContainEqual(
      expect.objectContaining({
        type: "magic-initiate-selection",
        spellList: "wizard",
        castingAbility: "INT",
      }),
    );
    const confirmedBoomingBlade = result.character.build.spells.find(
      (spell) => spell.spellRef.name === "Booming Blade" && spell.decisionId !== null,
    )!;
    expect(confirmedBoomingBlade.spellRef).toMatchObject({
      sourceId: "TCE",
      compatibility: "legacy",
      verification: "imported-unverified",
    });
  });

  it("hydrates Musician's three instruments independently from Bard and Entertainer", () => {
    const ari = canonicalCharacter(fixtures[2]);
    const musician = deriveOriginFeatCapabilityChoices(
      ari,
      backgroundCapabilityCatalog,
      originFeatCapabilityCatalog,
    );
    expect(musician).toMatchObject({
      issues: [],
      requirements: [
        expect.objectContaining({
          sourceRef: expect.objectContaining({ name: "Musician", kind: "feat", sourceId: "XPHB" }),
          characterSourceVersionKey: ari.build.backgroundRef.versionKey,
          kind: "tool",
          count: 3,
          optionSet: "musical-instrument",
        }),
      ],
    });
    const selected = ["Bagpipes", "Dulcimer", "Viol"].map(
      (label) => ari.migrationBaseline!.capabilities.find((entry) => entry.label === label)!.id,
    );
    const simulated = applyCapabilityChoice({
      character: ari,
      requirement: musician.requirements[0],
      options: currentCapabilityOptions(),
      selectedBaselineCapabilityIds: selected,
      actorUserId: "eleni",
      expectedBuildRevision: ari.build.revision,
      mutationId: "eleni:test-confirm-musician-instruments",
    });
    expect(simulated.character.build.decisions).toContainEqual(
      expect.objectContaining({
        type: "rule-selection",
        sourceRef: expect.objectContaining({ name: "Musician", kind: "feat" }),
        selections: expect.arrayContaining([
          expect.objectContaining({ name: "Bagpipes" }),
          expect.objectContaining({ name: "Dulcimer" }),
          expect.objectContaining({ name: "Viol" }),
        ]),
      }),
    );
    for (const fixture of [fixtures[0], fixtures[1], fixtures[3], fixtures[4]]) {
      const character = canonicalCharacter(fixture);
      expect(
        deriveOriginFeatCapabilityChoices(
          character,
          backgroundCapabilityCatalog,
          originFeatCapabilityCatalog,
        ).requirements,
      ).toEqual([]);
    }
  });

  it("resolves the two Armorer tool branches only after the earlier Artificer choice", () => {
    const qemuel = canonicalCharacter(fixtures[0]);
    expect(
      deriveConditionalSubclassCapabilityChoices(qemuel, subclassFeatureCatalog).requirements,
    ).toEqual([]);
    const artificerChoice = deriveStartingClassCapabilityChoices(qemuel, capabilityCatalog)
      .requirements[0];
    const leatherworker = qemuel.migrationBaseline!.capabilities.find(
      (entry) => entry.label === "Leatherworker's Tools",
    )!;
    const choseLeatherworker = applyCapabilityChoice({
      character: qemuel,
      requirement: artificerChoice,
      options: currentCapabilityOptions(),
      selectedBaselineCapabilityIds: [leatherworker.id],
      actorUserId: "qemuel",
      expectedBuildRevision: qemuel.build.revision,
      mutationId: "qemuel:test-artificer-leatherworker",
    }).character;
    const fixedSmithReport = reconcileSubclassCapabilities(
      choseLeatherworker,
      subclassFeatureCatalog,
    );
    expect(fixedSmithReport.matches).toContainEqual(
      expect.objectContaining({
        baseline: expect.objectContaining({ label: "Smith's Tools" }),
        grant: expect.objectContaining({
          label: "Smith's Tools",
          sourceRef: expect.objectContaining({ name: "Tools of the Trade" }),
        }),
      }),
    );
    expect(fixedSmithReport.deferredChoices).not.toContainEqual(
      expect.stringContaining("anyArtisansTool"),
    );

    const smith = qemuel.migrationBaseline!.capabilities.find(
      (entry) => entry.label === "Smith's Tools",
    )!;
    const choseSmith = applyCapabilityChoice({
      character: qemuel,
      requirement: artificerChoice,
      options: currentCapabilityOptions(),
      selectedBaselineCapabilityIds: [smith.id],
      actorUserId: "qemuel",
      expectedBuildRevision: qemuel.build.revision,
      mutationId: "qemuel:test-artificer-smith",
    }).character;
    const conditional = deriveConditionalSubclassCapabilityChoices(
      choseSmith,
      subclassFeatureCatalog,
    );
    expect(conditional.issues).toEqual([]);
    expect(conditional.requirements).toEqual([
      expect.objectContaining({
        sourceRef: expect.objectContaining({ name: "Tools of the Trade" }),
        characterSourceVersionKey: choseSmith.build.subclasses[0].subclassRef.versionKey,
        count: 1,
        optionSet: "artisan-tool",
        excludedCapabilityLabels: ["smith's tools"],
      }),
    ]);
    expect(
      reconcileSubclassCapabilities(choseSmith, subclassFeatureCatalog).grants.map(
        (grant) => grant.label,
      ),
    ).not.toContain("Smith's Tools");
    const fallback = applyCapabilityChoice({
      character: choseSmith,
      requirement: conditional.requirements[0],
      options: currentCapabilityOptions(),
      selectedBaselineCapabilityIds: [leatherworker.id],
      actorUserId: "qemuel",
      expectedBuildRevision: choseSmith.build.revision,
      mutationId: "qemuel:test-armorer-fallback-leatherworker",
    });
    expect(fallback.character.build.decisions).toContainEqual(
      expect.objectContaining({
        type: "rule-selection",
        sourceRef: expect.objectContaining({ name: "Tools of the Trade" }),
        selections: [expect.objectContaining({ name: "Leatherworker's Tools" })],
      }),
    );
    expect(() =>
      applyCapabilityChoice({
        character: choseSmith,
        requirement: conditional.requirements[0],
        options: currentCapabilityOptions(),
        selectedBaselineCapabilityIds: [smith.id],
        actorUserId: "qemuel",
        expectedBuildRevision: choseSmith.build.revision,
        mutationId: "qemuel:test-reject-smith-as-other-tool",
      }),
    ).toThrow(/no longer exists/);
  });

  it.each([fixtures[0], fixtures[2]])(
    "hydrates and validates the exact Tiefling resistance choice for $id",
    (fixture) => {
      const character = canonicalCharacter(fixture);
      const speciesChoices = deriveSpeciesCapabilityChoices(character, speciesCapabilityCatalog);
      expect(speciesChoices.issues).toEqual([]);
      expect(speciesChoices.requirements).toEqual([
        expect.objectContaining({
          sourceRef: expect.objectContaining({ name: "Tiefling", sourceId: "XPHB" }),
          kind: "resistance",
          selectionKind: "feature-option",
          count: 1,
          optionSet: "damage-resistance",
        }),
      ]);
      expect(speciesChoices.options.map((option) => option.capabilityLabel).sort()).toEqual([
        "Fire",
        "Necrotic",
        "Poison",
      ]);
      const fire = character.migrationBaseline!.capabilities.find(
        (capability) => capability.kind === "resistance" && capability.label === "Fire",
      )!;
      expect(() =>
        applyCapabilityChoice({
          character,
          requirement: speciesChoices.requirements[0],
          options: speciesChoices.options,
          selectedBaselineCapabilityIds: [fire.id],
          actorUserId: fixture.owner,
          expectedBuildRevision: character.build.revision,
          mutationId: `${fixture.owner}:test-reject-non-atomic-tiefling-resistance`,
        }),
      ).toThrow(/atomic legacy operation/);
    },
  );

  it("hydrates independent Bard and Artificer starting-class tool choices", () => {
    const ari = canonicalCharacter(fixtures[2]);
    const bard = deriveStartingClassCapabilityChoices(ari, capabilityCatalog);
    expect(bard).toMatchObject({
      issues: [],
      requirements: [
        expect.objectContaining({
          sourceRef: expect.objectContaining({ name: "Bard" }),
          kind: "tool",
          count: 3,
          optionSet: "musical-instrument",
        }),
      ],
    });
    const entertainer = deriveBackgroundCapabilityChoices(ari, backgroundCapabilityCatalog);
    expect(entertainer.requirements[0]).toMatchObject({
      sourceRef: expect.objectContaining({ name: "Entertainer" }),
      count: 1,
      optionSet: "musical-instrument",
    });
    expect(entertainer.requirements[0].id).not.toBe(bard.requirements[0].id);

    const qemuel = canonicalCharacter(fixtures[0]);
    expect(deriveStartingClassCapabilityChoices(qemuel, capabilityCatalog)).toMatchObject({
      issues: [],
      requirements: [
        expect.objectContaining({
          sourceRef: expect.objectContaining({ name: "Artificer" }),
          kind: "tool",
          count: 1,
          optionSet: "artisan-tool",
        }),
      ],
    });
  });

  it("can validate a simulated three-instrument Bard choice without changing MOB authority", () => {
    const ari = canonicalCharacter(fixtures[2]);
    const requirement = deriveStartingClassCapabilityChoices(ari, capabilityCatalog)
      .requirements[0];
    const selected = ["Drum", "Flute", "Lute"].map(
      (label) => ari.migrationBaseline!.capabilities.find((entry) => entry.label === label)!.id,
    );
    const result = applyCapabilityChoice({
      character: ari,
      requirement,
      options: currentCapabilityOptions(),
      selectedBaselineCapabilityIds: selected,
      actorUserId: "eleni",
      expectedBuildRevision: ari.build.revision,
      mutationId: "eleni:test-confirm-bard-instruments",
    });
    const decision = result.character.build.decisions.find(
      (entry) => entry.id === "decision:capability-choice:eleni:test-confirm-bard-instruments",
    );
    expect(decision).toMatchObject({
      type: "rule-selection",
      sourceRef: expect.objectContaining({ name: "Bard" }),
      selections: expect.arrayContaining([
        expect.objectContaining({ name: "Drum" }),
        expect.objectContaining({ name: "Flute" }),
        expect.objectContaining({ name: "Lute" }),
      ]),
    });
    expect(result.auditEvent.removedCapabilityIds).toEqual(selected);
  });

  it("records Ari's explicitly selected Entertainer instrument as an authoritative decision", () => {
    const ari = canonicalCharacter(fixtures[2]);
    const choices = deriveBackgroundCapabilityChoices(ari, backgroundCapabilityCatalog);
    expect(choices.issues).toEqual([]);
    expect(choices.requirements).toHaveLength(1);
    expect(choices.requirements[0]).toMatchObject({
      kind: "tool",
      count: 1,
      optionSet: "musical-instrument",
    });
    const bagpipes = ari.migrationBaseline!.capabilities.find(
      (capability) => capability.kind === "tool" && capability.label === "Bagpipes",
    )!;
    const result = applyCapabilityChoice({
      character: ari,
      requirement: choices.requirements[0],
      options: currentCapabilityOptions(),
      selectedBaselineCapabilityIds: [bagpipes.id],
      actorUserId: "eleni",
      expectedBuildRevision: ari.build.revision,
      mutationId: "eleni:test-confirm-entertainer-instrument",
    });

    expect(result.character.migrationBaseline!.capabilities).not.toContainEqual(
      expect.objectContaining({ id: bagpipes.id }),
    );
    expect(result.character.build.decisions).toContainEqual(
      expect.objectContaining({
        type: "rule-selection",
        selectionKind: "tool",
        sourceRef: expect.objectContaining({ name: "Entertainer" }),
        selections: [expect.objectContaining({ kind: "tool", name: "Bagpipes", sourceId: "XPHB" })],
      }),
    );
    expect(result.character.resolutions).toContainEqual(
      expect.objectContaining({
        type: "capability-choice-confirmed",
        baselineCapabilityId: bagpipes.id,
        decidedByUserId: "eleni",
        method: "owner-confirmed-rule-choice",
      }),
    );
    expect(result.auditEvent.removedCapabilityIds).toEqual([bagpipes.id]);
    expect(
      deriveBackgroundCapabilityChoices(result.character, backgroundCapabilityCatalog).requirements,
    ).toEqual([]);
    const drum = result.character.migrationBaseline!.capabilities.find(
      (capability) => capability.kind === "tool" && capability.label === "Drum",
    )!;
    expect(() =>
      applyCapabilityChoice({
        character: result.character,
        requirement: {
          ...choices.requirements[0],
          buildRevision: result.character.build.revision,
        },
        options: currentCapabilityOptions(),
        selectedBaselineCapabilityIds: [drum.id],
        actorUserId: "eleni",
        expectedBuildRevision: result.character.build.revision,
        mutationId: "eleni:test-replay-entertainer-instrument",
      }),
    ).toThrow(/already been resolved/);
  });

  it("hydrates both Outlander choices only after the legacy background is approved", () => {
    const dresana = canonicalCharacter(fixtures[4]);
    expect(deriveBackgroundCapabilityChoices(dresana, backgroundCapabilityCatalog)).toMatchObject({
      requirements: [],
      issues: [expect.stringContaining("has not been approved")],
    });
    const versionReport = reconcileCharacterV3(dresana, ruleCatalog);
    const outlander = versionReport.entries.find((entry) => entry.imported.name === "Outlander")!;
    const approved = recordContentVersionDecision({
      character: dresana,
      report: versionReport,
      decision: {
        mutationId: "andreas:test-approve-outlander-choices",
        actorUserId: "andreas",
        expectedBuildRevision: dresana.build.revision,
        importedVersionKey: outlander.imported.versionKey,
        resolution: "accept-matched-version",
        reason: "Test-only approval for choice hydration.",
        catalogRevision: "sqlite:background-choice-test",
      },
    }).character;
    const choices = deriveBackgroundCapabilityChoices(approved, backgroundCapabilityCatalog);
    expect(choices.issues).toEqual([]);
    expect(choices.requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "tool", count: 1, optionSet: "musical-instrument" }),
        expect.objectContaining({ kind: "language", count: 1, optionSet: "standard-language" }),
      ]),
    );
  });

  it("rejects wrong owners, stale requirements, duplicates, wrong kinds, and ineligible options", () => {
    const ari = canonicalCharacter(fixtures[2]);
    const requirement = deriveBackgroundCapabilityChoices(ari, backgroundCapabilityCatalog)
      .requirements[0];
    const bagpipes = ari.migrationBaseline!.capabilities.find(
      (capability) => capability.label === "Bagpipes",
    )!;
    const common = ari.migrationBaseline!.capabilities.find(
      (capability) => capability.label === "Common",
    )!;
    const base = {
      character: ari,
      requirement,
      options: currentCapabilityOptions(),
      selectedBaselineCapabilityIds: [bagpipes.id],
      actorUserId: "eleni",
      expectedBuildRevision: ari.build.revision,
      mutationId: "eleni:choice-guards",
    };
    expect(() => applyCapabilityChoice({ ...base, actorUserId: "qemuel" })).toThrow(
      CapabilityChoicePermissionError,
    );
    expect(() =>
      applyCapabilityChoice({ ...base, expectedBuildRevision: ari.build.revision + 1 }),
    ).toThrow(CapabilityChoiceConflictError);
    expect(() =>
      applyCapabilityChoice({
        ...base,
        requirement: { ...requirement, buildRevision: requirement.buildRevision - 1 },
      }),
    ).toThrow(/does not match the current character revision/);
    expect(() =>
      applyCapabilityChoice({ ...base, selectedBaselineCapabilityIds: [bagpipes.id, bagpipes.id] }),
    ).toThrow(/exactly 1 distinct/);
    expect(() =>
      applyCapabilityChoice({ ...base, selectedBaselineCapabilityIds: [common.id] }),
    ).toThrow(/wrong kind/);
    expect(() =>
      applyCapabilityChoice({
        ...base,
        options: base.options.filter((option) => option.ref.name !== "Bagpipes"),
      }),
    ).toThrow(/does not resolve to one eligible exact option/);
  });
});

describe("Character V3 native capability readiness", () => {
  it.each([
    {
      fixture: fixtures[0],
      remaining: [
        "language:Common",
        "language:Elvish",
        "language:Giant",
        "resistance:Fire",
        "tool:Leatherworker's Tools",
        "tool:Smith's Tools",
      ],
    },
    {
      fixture: fixtures[1],
      remaining: [
        "condition-immunity:Magical Sleep",
        "language:Common",
        "language:Elvish",
        "language:Halfling",
        "resistance:Psychic",
      ],
    },
    {
      fixture: fixtures[2],
      remaining: [
        "language:Common",
        "language:Draconic",
        "language:Orc",
        "resistance:Fire",
        "tool:Bagpipes",
        "tool:Drum",
        "tool:Dulcimer",
        "tool:Flute",
        "tool:Lute",
        "tool:Lyre",
        "tool:Viol",
      ],
    },
    {
      fixture: fixtures[3],
      remaining: ["language:Common", "language:Druidic", "language:Giant"],
    },
    {
      fixture: fixtures[4],
      remaining: [
        "language:Common",
        "language:Goblin",
        "language:Orc",
        "sense:Darkvision",
        "tool:Flute",
      ],
    },
  ])(
    "publishes the exact post-fixed-grant source-provenance manifest for $fixture.id",
    ({ fixture, remaining }) => {
    const character = applyDeterministicCapabilityMatches(canonicalCharacter(fixture));
    const background = deriveBackgroundCapabilityChoices(character, backgroundCapabilityCatalog);
    const startingClass = deriveStartingClassCapabilityChoices(character, capabilityCatalog);
    const subclass = deriveConditionalSubclassCapabilityChoices(character, subclassFeatureCatalog);
    const species = deriveSpeciesCapabilityChoices(character, speciesCapabilityCatalog);
    const originFeat = deriveOriginFeatCapabilityChoices(
      character,
      backgroundCapabilityCatalog,
      originFeatCapabilityCatalog,
    );
    const report = buildCapabilityReadinessReport({
      character,
      requirements: [
        ...background.requirements,
        ...startingClass.requirements,
        ...subclass.requirements,
        ...species.requirements,
        ...originFeat.requirements,
      ],
      options: [...currentCapabilityOptions(), ...species.options],
    });

    expect(
      report.remainingCapabilities
        .map((capability) => `${capability.kind}:${capability.label}`)
        .sort(),
    ).toEqual([...remaining].sort());
    expect(report.remainingCapabilityCount).toBe(remaining.length);
    },
  );

  it.each([
    { fixture: fixtures[0], expectedSlots: 2 },
    { fixture: fixtures[1], expectedSlots: 0 },
    { fixture: fixtures[2], expectedSlots: 8 },
    { fixture: fixtures[3], expectedSlots: 0 },
    { fixture: fixtures[4], expectedSlots: 0 },
  ])(
    "builds a conservative post-fixed-grant matrix for $fixture.id",
    ({ fixture, expectedSlots }) => {
      const character = applyDeterministicCapabilityMatches(canonicalCharacter(fixture));
      const background = deriveBackgroundCapabilityChoices(character, backgroundCapabilityCatalog);
      const startingClass = deriveStartingClassCapabilityChoices(character, capabilityCatalog);
      const subclass = deriveConditionalSubclassCapabilityChoices(
        character,
        subclassFeatureCatalog,
      );
      const species = deriveSpeciesCapabilityChoices(character, speciesCapabilityCatalog);
      const originFeat = deriveOriginFeatCapabilityChoices(
        character,
        backgroundCapabilityCatalog,
        originFeatCapabilityCatalog,
      );
      const requirements = [
        ...background.requirements,
        ...startingClass.requirements,
        ...subclass.requirements,
        ...species.requirements,
        ...originFeat.requirements,
      ];
      const report = buildCapabilityReadinessReport({
        character,
        requirements,
        options: [...currentCapabilityOptions(), ...species.options],
      });

      expect(report.readyForNativeCapabilityAuthority).toBe(false);
      expect(report.remainingCapabilityCount).toBe(
        character.migrationBaseline?.capabilities.length ?? 0,
      );
      expect(report.pendingChoiceSlotCount).toBe(expectedSlots);
      expect(report.maximumChoiceCoverage).toBeLessThanOrEqual(expectedSlots);
      expect(report.minimumUnresolvedAfterChoices).toBe(
        report.remainingCapabilityCount - report.maximumChoiceCoverage,
      );
      expect(report.definiteUnexplained.map((entry) => entry.label)).not.toContain(
        "Calligrapher's Supplies",
      );
    },
  );

  it("caps Ari's instrument coverage at the seven Musician/Bard/Entertainer slots", () => {
    const ari = applyDeterministicCapabilityMatches(canonicalCharacter(fixtures[2]));
    const background = deriveBackgroundCapabilityChoices(ari, backgroundCapabilityCatalog);
    const startingClass = deriveStartingClassCapabilityChoices(ari, capabilityCatalog);
    const species = deriveSpeciesCapabilityChoices(ari, speciesCapabilityCatalog);
    const originFeat = deriveOriginFeatCapabilityChoices(
      ari,
      backgroundCapabilityCatalog,
      originFeatCapabilityCatalog,
    );
    const report = buildCapabilityReadinessReport({
      character: ari,
      requirements: [
        ...background.requirements,
        ...startingClass.requirements,
        ...species.requirements,
        ...originFeat.requirements,
      ],
      options: [...currentCapabilityOptions(), ...species.options],
    });

    expect(report.pendingChoiceSlotCount).toBe(8);
    expect(report.maximumChoiceCoverage).toBe(8);
    const instrumentCandidates = report.candidates.filter((candidate) => {
      const capability = ari.migrationBaseline!.capabilities.find(
        (entry) => entry.id === candidate.capabilityId,
      );
      return ["Bagpipes", "Drum", "Dulcimer", "Flute", "Lute", "Lyre", "Viol"].includes(
        capability?.label ?? "",
      );
    });
    expect(instrumentCandidates).toHaveLength(7);
    expect(instrumentCandidates.every((candidate) => candidate.requirementIds.length === 3)).toBe(
      true,
    );
    expect(report.minimumUnresolvedAfterChoices).toBeGreaterThanOrEqual(0);
  });
});
