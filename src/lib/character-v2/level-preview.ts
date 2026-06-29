import { z } from "zod";
import type { CharacterBuild, RuleRef } from "./schema";
import type { CatalogRecord, CharacterReconciliationReport } from "./reconcile";

export type ClassCatalogRecord = CatalogRecord & {
  kind: "class";
  hitDie: number;
  fixedHp: number;
  progressionJson: string | null;
};

export type FeatureCatalogRecord = CatalogRecord & {
  kind: "feature";
  classId: string;
  subclassId: string | null;
  levelRequired: number;
  optionsJson: string | null;
};

export type LevelChoicePreview = {
  id: string;
  label: string;
  count: number;
  options: string[];
};

export type ProgressionChange = {
  label: string;
  before: number | string;
  after: number | string;
};

export type NextLevelPreview = {
  characterLevel: { before: number; after: number };
  classLevel: { before: number; after: number };
  classRef: RuleRef;
  hp: { hitDie: number; fixed: number };
  automaticFeatures: Array<{ id: string; name: string; sourceId: string }>;
  requiredChoices: LevelChoicePreview[];
  progressionChanges: ProgressionChange[];
  warnings: string[];
  readyToPreview: boolean;
};

const FeatureOptionGroupSchema = z
  .object({
    count: z.number().int().min(1).default(1),
    options: z.array(z.union([z.string(), z.object({ id: z.string(), label: z.string() })])),
  })
  .passthrough();

function parseFeatureOptions(feature: FeatureCatalogRecord): LevelChoicePreview[] {
  if (!feature.optionsJson) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(feature.optionsJson);
  } catch {
    return [];
  }
  const parsed = z.array(FeatureOptionGroupSchema).safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.map((group, index) => ({
    id: `${feature.id}:option:${index}`,
    label: feature.name,
    count: group.count,
    options: group.options.map((option) => (typeof option === "string" ? option : option.label)),
  }));
}

function scalarValue(value: unknown): number | string | null {
  if (typeof value === "number" || typeof value === "string") return value;
  if (value && typeof value === "object" && "value" in value) {
    const nested = (value as { value?: unknown }).value;
    if (typeof nested === "number" || typeof nested === "string") return nested;
  }
  return null;
}

function progressionChanges(
  progressionJson: string | null,
  currentClassLevel: number,
  nextClassLevel: number,
): ProgressionChange[] {
  if (!progressionJson) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(progressionJson);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object" || !("tableGroups" in parsed)) return [];
  const tableGroups = (parsed as { tableGroups?: unknown }).tableGroups;
  if (!Array.isArray(tableGroups)) return [];

  const changes: ProgressionChange[] = [];
  for (const table of tableGroups) {
    if (!table || typeof table !== "object") continue;
    const labels = "colLabels" in table && Array.isArray(table.colLabels) ? table.colLabels : [];
    const rows = "rows" in table && Array.isArray(table.rows) ? table.rows : null;
    const spellRows =
      "rowsSpellProgression" in table && Array.isArray(table.rowsSpellProgression)
        ? table.rowsSpellProgression
        : null;
    const selectedRows = rows ?? spellRows;
    if (!selectedRows) continue;
    const beforeRow = selectedRows[currentClassLevel - 1];
    const afterRow = selectedRows[nextClassLevel - 1];
    if (!Array.isArray(beforeRow) || !Array.isArray(afterRow)) continue;

    labels.forEach((rawLabel, index) => {
      const before = scalarValue(beforeRow[index]);
      const after = scalarValue(afterRow[index]);
      if (before === null || after === null || before === after) return;
      changes.push({
        label: String(rawLabel).replace(/\{@filter\s+([^|}]+).*?\}/g, "$1"),
        before,
        after,
      });
    });
  }
  return changes;
}

function progressionChoices(
  classId: string,
  nextClassLevel: number,
  changes: ProgressionChange[],
): LevelChoicePreview[] {
  const choices: LevelChoicePreview[] = [];
  for (const change of changes) {
    if (typeof change.before !== "number" || typeof change.after !== "number") continue;
    const count = change.after - change.before;
    if (count <= 0) continue;
    if (/prepared spells?/i.test(change.label)) {
      choices.push({
        id: `${classId}:level-${nextClassLevel}:prepared-spells`,
        label: count === 1 ? "Choose 1 prepared spell" : `Choose ${count} prepared spells`,
        count,
        options: ["Eligible class spell"],
      });
    } else if (/cantrips?/i.test(change.label)) {
      choices.push({
        id: `${classId}:level-${nextClassLevel}:cantrips`,
        label: count === 1 ? "Choose 1 cantrip" : `Choose ${count} cantrips`,
        count,
        options: ["Eligible class cantrip"],
      });
    }
  }
  return choices;
}

export function createNextLevelPreview(
  build: CharacterBuild,
  reconciliation: CharacterReconciliationReport,
  classes: ClassCatalogRecord[],
  features: FeatureCatalogRecord[],
): NextLevelPreview {
  const currentCharacterLevel = build.levels.length;
  const currentLevel = build.levels.at(-1);
  if (!currentLevel) throw new Error("Cannot preview a level for a character with no levels");

  const classEntry = reconciliation.entries.find(
    (entry) => entry.imported.kind === "class" && entry.imported.id === currentLevel.classRef.id,
  );
  const canonicalClassId = classEntry?.canonical?.id;
  const canonicalClass = classes.find((record) => record.id === canonicalClassId);
  if (!canonicalClass) {
    return {
      characterLevel: { before: currentCharacterLevel, after: currentCharacterLevel + 1 },
      classLevel: { before: currentLevel.classLevel, after: currentLevel.classLevel + 1 },
      classRef: currentLevel.classRef,
      hp: { hitDie: 0, fixed: 0 },
      automaticFeatures: [],
      requiredChoices: [],
      progressionChanges: [],
      warnings: ["Current class has not been reconciled to the canonical catalog."],
      readyToPreview: false,
    };
  }

  const canonicalSubclassIds = new Set(
    reconciliation.entries
      .filter((entry) => entry.imported.kind === "subclass" && entry.canonical)
      .map((entry) => entry.canonical!.id),
  );
  const nextClassLevel = currentLevel.classLevel + 1;
  const nextFeatures = features.filter(
    (feature) =>
      feature.levelRequired === nextClassLevel &&
      (feature.classId === canonicalClass.id ||
        (feature.subclassId !== null && canonicalSubclassIds.has(feature.subclassId))),
  );
  const featureChoices = nextFeatures.flatMap(parseFeatureOptions);
  const choiceOptionNames = new Set(
    featureChoices.flatMap((choice) => choice.options.map((option) => option.toLowerCase())),
  );
  const changes = progressionChanges(
    canonicalClass.progressionJson,
    currentLevel.classLevel,
    nextClassLevel,
  );
  const requiredChoices = [
    ...featureChoices,
    ...progressionChoices(canonicalClass.id, nextClassLevel, changes),
  ];
  if (nextFeatures.some((feature) => feature.name === "Ability Score Improvement")) {
    requiredChoices.push({
      id: `${canonicalClass.id}:level-${nextClassLevel}:asi-or-feat`,
      label: "Ability Score Improvement or eligible feat",
      count: 1,
      options: ["Ability Score Improvement", "Eligible General Feat"],
    });
  }

  const automaticFeatures = nextFeatures
    .filter((feature) => !choiceOptionNames.has(feature.name.toLowerCase()))
    .map((feature) => ({ id: feature.id, name: feature.name, sourceId: feature.sourceId }));
  const warnings = reconciliation.decisionEntries.map(
    (entry) =>
      `${entry.imported.name} requires a 2024 compatibility decision (${entry.compatibility ?? entry.status}).`,
  );

  return {
    characterLevel: { before: currentCharacterLevel, after: currentCharacterLevel + 1 },
    classLevel: { before: currentLevel.classLevel, after: nextClassLevel },
    classRef: {
      kind: "class",
      id: canonicalClass.id,
      name: canonicalClass.name,
      ruleset: "2024",
      sourceId: canonicalClass.sourceId,
      verification: classEntry?.acceptedByCurrentRulesPolicy ? "verified" : "imported-unverified",
    },
    hp: { hitDie: canonicalClass.hitDie, fixed: canonicalClass.fixedHp },
    automaticFeatures,
    requiredChoices,
    progressionChanges: changes,
    warnings,
    readyToPreview: reconciliation.classProgressionReady,
  };
}
