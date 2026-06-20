import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

type CoverageStatus = "missing" | "partial" | "complete" | "excluded";

type CoverageRow = {
  table: string;
  routeKeys: string[];
  uiPatterns: string[];
  validationPatterns: string[];
  savePatterns: string[];
  recomputePatterns: string[];
  ddbPatterns: string[];
  sourcePatterns: string[];
  testPatterns: string[];
  excluded?: boolean;
  notApplicable?: Array<keyof CoverageChecks>;
};

type CoverageChecks = {
  loaded: boolean;
  ui: boolean;
  validation: boolean;
  saved: boolean;
  recomputed: boolean;
  ddbImport: boolean;
  sourceFilter: boolean;
  tests: boolean;
};

type CoverageResult = CoverageChecks & {
  row: CoverageRow;
  status: CoverageStatus;
};

const ROOT = process.cwd();
const FILES = {
  route: "src/routes/builder.tsx",
  lazy: "src/routes/builder.lazy.tsx",
  wizard: "src/components/builder/WizardSteps.tsx",
  picker: "src/components/builder/RuleChoiceGroupPicker.tsx",
  utils: "src/components/builder/BuilderUtils.ts",
  native: "src/lib/native-engine.ts",
  validation: "src/lib/rules/validate-character.ts",
  sourcePolicy: "src/lib/forge/source-policy.ts",
  sourceConstants: "src/lib/forge/source-constants.ts",
  ddbFunctions: "src/lib/dndbeyond.functions.ts",
  ddbServer: "src/lib/dndbeyond.server.ts",
  ddbParser: "src/lib/parser/index.ts",
  ddbGrants: "src/lib/parser/grants-mapper.ts",
  tests: [
    "src/components/builder/BuilderUtils.test.ts",
    "src/lib/native-engine.test.ts",
    "src/lib/forge/integration.test.ts",
    "src/lib/forge/regression.test.ts",
    "src/lib/forge/source-policy.test.ts",
    "src/lib/forge/validation.test.ts",
    "src/test/fixtures/characters/native-builds.test.ts",
  ],
};

const COVERAGE_ROWS: CoverageRow[] = [
  row(
    "species",
    ["species"],
    ["species", "speciesToRuleChoicesAndGrants", "raceId"],
    ["MISSING_SPECIES", "speciesToRuleChoicesAndGrants"],
    ["speciesId", "raceData"],
    ["raceData", "speciesVariantData"],
    ["species", "race"],
    ["sourcePolicy", "SourceFiltersPanel"],
    ["species", "race"],
  ),
  row(
    "species_variants",
    ["speciesVariants"],
    ["speciesVariants", "speciesVariantId"],
    ["MISSING_SUBRACE", "speciesVariants"],
    ["speciesVariantId"],
    ["speciesVariantData"],
    ["subrace", "speciesVariant", "baseName"],
    ["sourcePolicy"],
    ["subrace", "speciesVariant"],
  ),
  row(
    "backgrounds",
    ["backgrounds"],
    ["backgroundToRuleChoicesAndGrants", "backgroundId"],
    ["MISSING_BACKGROUND", "backgroundToRuleChoicesAndGrants"],
    ["backgroundId", "backgroundData"],
    ["backgroundData"],
    ["background"],
    ["sourcePolicy"],
    ["background"],
  ),
  row(
    "classes",
    ["classes"],
    ["classToRuleChoicesAndGrants", "classId", "multiClasses"],
    ["MISSING_CLASS", "classToRuleChoicesAndGrants", "INVALID_MULTICLASS"],
    ["classId", "classes"],
    ["classData"],
    ["class"],
    ["sourcePolicy"],
    ["class", "multiclass"],
  ),
  row(
    "subclasses",
    ["subclasses"],
    ["subclassId", "availableSubclasses"],
    ["MISSING_SUBCLASS", "MISSING_MULTICLASS_SUBCLASS"],
    ["subclassId"],
    ["subclassData"],
    ["subclass"],
    ["sourcePolicy"],
    ["subclass"],
  ),
  row(
    "class_features",
    ["classFeatures"],
    ["classFeatureToRuleChoicesAndGrants", "featureChoices"],
    ["classFeatureToRuleChoicesAndGrants", "INVALID_CLASS_CHOICE"],
    ["featureChoices", "classFeatures"],
    ["classFeatures"],
    ["feature"],
    ["sourcePolicy"],
    ["feature"],
  ),
  row(
    "feats",
    ["feats"],
    ["featToRuleChoicesAndGrants", "highLevelFeatChoices", "originFeat"],
    ["MISSING_FEAT", "INVALID_FEAT"],
    ["highLevelFeatChoices", "originFeat"],
    ["originFeat"],
    ["feat"],
    ["sourcePolicy"],
    ["feat"],
  ),
  row(
    "spells",
    ["spells"],
    ["spellcastingToRuleChoicesAndGrants", "SpellChoiceList", "preparedSpellChoices"],
    ["INVALID_CANTRIP_COUNT", "INVALID_PREPARED_COUNT"],
    ["selectedSpells", "characterSpells"],
    ["selectedSpells"],
    ["spell"],
    ["sourcePolicy"],
    ["spell"],
  ),
  row(
    "class_spells",
    ["classSpells"],
    ["classSpells", "getClassSpellOptions"],
    ["getSpellcasters"],
    [],
    [],
    [],
    ["sourcePolicy"],
    ["classSpells"],
    false,
    ["saved", "recomputed", "ddbImport"],
  ),
  row(
    "skills",
    ["skills"],
    ["getSkillOptionsFromDb", "skillOptions"],
    ["selectedSkillNames", "skills"],
    ["skills", "skillDefinitionsFromData"],
    ["skills"],
    ["skills"],
    ["sourcePolicy"],
    ["getSkillOptionsFromDb", "skills"],
  ),
  row(
    "languages",
    ["languages"],
    ["getLanguageOptions", "languages"],
    ["languages"],
    ["selectedLanguages", "languages"],
    ["languages"],
    ["languages"],
    ["sourcePolicy"],
    ["languages"],
  ),
  row(
    "senses",
    ["senses"],
    ["senses"],
    ["senses"],
    ["senses"],
    ["senses"],
    ["senses"],
    ["sourcePolicy"],
    ["senses"],
  ),
  row(
    "conditions",
    ["conditions"],
    ["conditions"],
    ["conditions"],
    ["conditions", "defenses"],
    ["conditions"],
    ["conditions"],
    ["sourcePolicy"],
    ["conditions"],
  ),
  row(
    "rules_actions",
    ["rulesActions"],
    ["rulesActions", "actions"],
    ["actions"],
    ["actions"],
    ["actions"],
    ["actions"],
    ["sourcePolicy"],
    ["rulesActions", "Action"],
  ),
  row(
    "optional_features",
    ["optionalFeatures"],
    ["optionalFeatures"],
    ["optionalFeatures"],
    ["optionalFeatures"],
    ["optionalFeatures"],
    ["data.options", "features"],
    ["sourcePolicy"],
    ["optionalFeatures"],
  ),
  row(
    "char_options",
    ["charOptions"],
    ["charOptions"],
    ["charOptions"],
    ["charOptions"],
    ["charOptions"],
    ["data.options", "features"],
    ["sourcePolicy"],
    ["charOptions"],
  ),
  row(
    "weapons",
    ["weapons"],
    ["weapons", "catalogWeapons"],
    ["weapons"],
    ["weapons"],
    ["weapons"],
    ["computeInventory", "inventory"],
    ["sourcePolicy"],
    ["weapons"],
  ),
  row(
    "armor",
    ["armor"],
    ["armor", "catalogArmor"],
    ["armor"],
    ["armor"],
    ["armor"],
    ["armor"],
    ["sourcePolicy"],
    ["armor"],
  ),
  row(
    "mundane_gear",
    ["mundaneGear"],
    ["mundaneGear", "getToolOptionsFromDb"],
    ["mundaneGear"],
    ["mundaneGear"],
    ["mundaneGear"],
    ["computeInventory", "inventory"],
    ["sourcePolicy"],
    ["mundaneGear"],
  ),
  row(
    "magic_items",
    ["magicItems"],
    ["magicItems", "catalogMagicItems"],
    ["magicItems"],
    ["magicItems"],
    ["magicItems"],
    ["computeInventory", "inventory"],
    ["sourcePolicy"],
    ["magicItems"],
  ),
  row(
    "weapon_masteries",
    ["weaponMasteries"],
    ["weaponMasteries", "WEAPON_MASTERY"],
    ["weaponMasteries"],
    ["weaponMasteries"],
    ["weaponMasteries"],
    ["weaponMasteries"],
    ["sourcePolicy"],
    ["weaponMasteries"],
  ),
  row(
    "item_properties",
    ["itemProperties"],
    ["itemProperties"],
    ["itemProperties"],
    ["itemProperties"],
    ["itemProperties"],
    [],
    ["sourcePolicy"],
    ["itemProperties"],
    false,
    ["ddbImport"],
  ),
  row(
    "item_types",
    ["itemTypes"],
    ["itemTypes", "getToolOptionsFromDb"],
    ["itemTypes"],
    ["itemTypes"],
    ["itemTypes"],
    [],
    ["sourcePolicy"],
    ["itemTypes"],
    false,
    ["ddbImport"],
  ),
  row(
    "item_groups",
    ["itemGroups"],
    ["itemGroups"],
    ["itemGroups"],
    ["itemGroups"],
    ["itemGroups"],
    [],
    ["sourcePolicy"],
    ["itemGroups"],
    false,
    ["ddbImport"],
  ),
  row(
    "magic_variants",
    ["magicVariants"],
    ["magicVariants"],
    ["magicVariants"],
    ["magicVariants"],
    ["magicVariants"],
    [],
    ["sourcePolicy"],
    ["magicVariants"],
    false,
    ["ddbImport"],
  ),
  row(
    "item_card_references",
    ["itemCardReferences"],
    ["itemCardReferences"],
    ["itemCardReferences"],
    ["itemCardReferences"],
    ["itemCardReferences"],
    [],
    ["sourcePolicy"],
    ["itemCardReferences"],
    false,
    ["ddbImport"],
  ),
  row(
    "active_effects",
    ["activeEffects"],
    ["activeEffects"],
    ["activeEffects"],
    ["activeEffectIds"],
    ["activeEffects"],
    [],
    ["sourcePolicy"],
    ["activeEffects"],
    false,
    ["ddbImport"],
  ),
  row(
    "feature_active_effects",
    ["featureActiveEffects"],
    ["featureActiveEffects"],
    ["featureActiveEffects"],
    ["featureActiveEffects"],
    ["featureActiveEffects"],
    [],
    ["sourcePolicy"],
    ["featureActiveEffects"],
    false,
    ["ddbImport"],
  ),
  row(
    "item_active_effects",
    ["itemActiveEffects"],
    ["itemActiveEffects"],
    ["itemActiveEffects"],
    ["itemActiveEffects"],
    ["itemActiveEffects"],
    [],
    ["sourcePolicy"],
    ["itemActiveEffects"],
    false,
    ["ddbImport"],
  ),
  row(
    "spell_active_effects",
    ["spellActiveEffects"],
    ["spellActiveEffects"],
    ["spellActiveEffects"],
    ["spellActiveEffects"],
    ["spellActiveEffects"],
    [],
    ["sourcePolicy"],
    ["spellActiveEffects"],
    false,
    ["ddbImport"],
  ),
  row("compendium_entries", [], [], [], [], [], [], [], [], true),
];

function row(
  table: string,
  routeKeys: string[],
  uiPatterns: string[],
  validationPatterns: string[],
  savePatterns: string[],
  recomputePatterns: string[],
  ddbPatterns: string[],
  sourcePatterns: string[],
  testPatterns: string[],
  excluded = false,
  notApplicable: Array<keyof CoverageChecks> = [],
): CoverageRow {
  return {
    table,
    routeKeys,
    uiPatterns,
    validationPatterns,
    savePatterns,
    recomputePatterns,
    ddbPatterns,
    sourcePatterns,
    testPatterns,
    excluded,
    notApplicable,
  };
}

function read(relativePath: string): string {
  const absolutePath = join(ROOT, relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function includesAny(haystack: string, patterns: string[]): boolean {
  return patterns.length > 0 && patterns.some((pattern) => haystack.includes(pattern));
}

const CHECK_KEYS: Array<keyof CoverageChecks> = [
  "loaded",
  "ui",
  "validation",
  "saved",
  "recomputed",
  "ddbImport",
  "sourceFilter",
  "tests",
];

function statusFor(result: Omit<CoverageResult, "status">): CoverageStatus {
  if (result.row.excluded) return "excluded";
  const checks = CHECK_KEYS.filter((key) => !result.row.notApplicable?.includes(key)).map(
    (key) => result[key],
  );
  const hits = checks.filter(Boolean).length;
  if (hits === 0) return "missing";
  if (hits === checks.length) return "complete";
  return "partial";
}

export function auditForgeCoverage(): CoverageResult[] {
  const route = read(FILES.route);
  const ui = [read(FILES.lazy), read(FILES.wizard), read(FILES.picker)].join("\n");
  const validation = [read(FILES.validation), read(FILES.utils)].join("\n");
  const native = read(FILES.native);
  const ddb = [
    read(FILES.ddbFunctions),
    read(FILES.ddbServer),
    read(FILES.ddbParser),
    read(FILES.ddbGrants),
  ].join("\n");
  const source = [read(FILES.sourcePolicy), read(FILES.sourceConstants), ui].join("\n");
  const tests = FILES.tests.map(read).join("\n");

  return COVERAGE_ROWS.map((coverageRow) => {
    const result = {
      row: coverageRow,
      loaded: includesAny(route, coverageRow.routeKeys),
      ui: includesAny(ui, coverageRow.uiPatterns),
      validation: includesAny(validation, coverageRow.validationPatterns),
      saved: includesAny(native, coverageRow.savePatterns),
      recomputed: includesAny(native, coverageRow.recomputePatterns),
      ddbImport: includesAny(ddb, coverageRow.ddbPatterns),
      sourceFilter: includesAny(source, coverageRow.sourcePatterns),
      tests: includesAny(tests, coverageRow.testPatterns),
    };
    return { ...result, status: statusFor(result) };
  });
}

function mark(result: CoverageResult, key: keyof CoverageChecks): string {
  if (result.row.notApplicable?.includes(key)) return "n/a";
  return result[key] ? "yes" : "no";
}

function renderMarkdown(results: CoverageResult[]): string {
  const counts = results.reduce<Record<CoverageStatus, number>>(
    (acc, result) => {
      acc[result.status] += 1;
      return acc;
    },
    { missing: 0, partial: 0, complete: 0, excluded: 0 },
  );

  let md = "# Forge Coverage Matrix\n\n";
  md += "Generated by `npx tsx src/pipeline/audit-forge-coverage.ts`.\n\n";
  md += `Summary: ${counts.complete} complete, ${counts.partial} partial, ${counts.missing} missing, ${counts.excluded} excluded.\n\n`;
  md +=
    "| Table | Loaded | UI | Validation | Saved | Recomputed | DDB Import | Source Filter | Tests | Status |\n";
  md += "|---|---:|---:|---:|---:|---:|---:|---:|---:|---|\n";
  for (const result of results) {
    md += [
      `| \`${result.row.table}\``,
      mark(result, "loaded"),
      mark(result, "ui"),
      mark(result, "validation"),
      mark(result, "saved"),
      mark(result, "recomputed"),
      mark(result, "ddbImport"),
      mark(result, "sourceFilter"),
      mark(result, "tests"),
      result.status,
    ].join(" | ");
    md += " |\n";
  }
  return md;
}

export function runAudit() {
  const results = auditForgeCoverage();
  const docsDir = join(ROOT, "docs");
  if (!existsSync(docsDir)) mkdirSync(docsDir);
  const outputPath = join(docsDir, "forge-coverage-matrix.md");
  writeFileSync(outputPath, renderMarkdown(results), "utf8");

  const incomplete = results.filter(
    (result) => result.status === "missing" || result.status === "partial",
  );
  console.log(`Forge coverage matrix written to ${outputPath}`);
  console.log(`${incomplete.length} rows are not complete.`);
}

const invokedPath = process.argv[1]?.replace(/\\/g, "/") || "";
if (
  import.meta.url === pathToFileURL(process.argv[1] || "").href ||
  invokedPath.endsWith("audit-forge-coverage.ts")
) {
  runAudit();
}
