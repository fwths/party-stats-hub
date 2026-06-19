import * as fs from "fs";
import * as path from "path";

type CoverageStatus = "typed" | "generic" | "raw" | "metadata" | "excluded";

type CoverageRule = {
  status: CoverageStatus;
  table?: string;
  note: string;
};

const COVERAGE: Record<string, CoverageRule> = {
  "actions.json:action": {
    status: "typed",
    table: "rules_actions",
    note: "Typed rule action table exists.",
  },
  "backgrounds.json:background": {
    status: "typed",
    table: "backgrounds",
    note: "Core builder table.",
  },
  "bastions.json:facility": { status: "typed", table: "bastions", note: "Facility table exists." },
  "books.json:book": { status: "typed", table: "content_sources", note: "Source metadata." },
  "adventures.json:adventure": {
    status: "typed",
    table: "content_sources",
    note: "Source metadata; adventure body remains raw.",
  },
  "charcreationoptions.json:charoption": {
    status: "generic",
    table: "reference_entries",
    note: "Needs typed character option table and builder integration.",
  },
  "conditionsdiseases.json:condition": {
    status: "typed",
    table: "conditions",
    note: "Typed with kind=condition.",
  },
  "conditionsdiseases.json:disease": {
    status: "typed",
    table: "conditions",
    note: "Typed with kind=disease.",
  },
  "conditionsdiseases.json:status": {
    status: "typed",
    table: "conditions",
    note: "Typed with kind=status.",
  },
  "cultsboons.json:cult": {
    status: "generic",
    table: "reference_entries",
    note: "Needs typed cult table.",
  },
  "cultsboons.json:boon": {
    status: "generic",
    table: "reference_entries",
    note: "Needs typed boon table.",
  },
  "decks.json:deck": {
    status: "generic",
    table: "reference_entries",
    note: "Needs typed deck/card tables.",
  },
  "decks.json:card": { status: "raw", note: "Cards are not normalized yet." },
  "deities.json:deity": {
    status: "generic",
    table: "reference_entries",
    note: "Needs typed deity table.",
  },
  "feats.json:feat": { status: "typed", table: "feats", note: "Core builder table." },
  "items-base.json:baseitem": {
    status: "typed",
    table: "weapons/armor",
    note: "Weapons and armor typed; gear remains partial.",
  },
  "items-base.json:itemProperty": { status: "raw", note: "Needs item_properties table." },
  "items-base.json:itemType": { status: "raw", note: "Needs item_types table." },
  "items-base.json:itemTypeAdditionalEntries": {
    status: "raw",
    note: "Needs item type reference table.",
  },
  "items-base.json:itemEntry": { status: "raw", note: "Needs mundane gear/items table." },
  "items-base.json:itemMastery": { status: "raw", note: "Needs weapon_masteries table." },
  "items.json:item": {
    status: "typed",
    table: "magic_items",
    note: "Magic items typed; mundane item groups still incomplete.",
  },
  "items.json:itemGroup": { status: "raw", note: "Needs item_groups table." },
  "languages.json:language": {
    status: "typed",
    table: "languages",
    note: "Typed and used by builder language choices.",
  },
  "languages.json:languageScript": {
    status: "typed",
    table: "language_scripts",
    note: "Typed script/font metadata.",
  },
  "loot.json:individual": { status: "raw", note: "Needs loot table schema." },
  "loot.json:hoard": { status: "raw", note: "Needs loot table schema." },
  "loot.json:dragon": { status: "raw", note: "Needs loot table schema." },
  "loot.json:gems": { status: "raw", note: "Needs treasure table schema." },
  "loot.json:artObjects": { status: "raw", note: "Needs treasure table schema." },
  "loot.json:magicItems": { status: "raw", note: "Needs loot-to-item relations." },
  "magicvariants.json:magicvariant": {
    status: "raw",
    note: "Needs magic variant table and item generation.",
  },
  "monsterfeatures.json:monsterfeatures": {
    status: "raw",
    note: "Needs monster feature reference table.",
  },
  monsters: {
    status: "typed",
    table: "monsters",
    note: "Bestiary files are seeded from subdirectory.",
  },
  "objects.json:object": {
    status: "generic",
    table: "reference_entries",
    note: "Needs typed objects table.",
  },
  "optionalfeatures.json:optionalfeature": {
    status: "generic",
    table: "reference_entries",
    note: "Needs typed optional features table and class option relations.",
  },
  "psionics.json:psionic": {
    status: "raw",
    note: "Currently excluded by source filter; schema still needed if official sources are enabled.",
  },
  "races.json:race": { status: "typed", table: "species", note: "Core builder table." },
  "races.json:subrace": {
    status: "raw",
    note: "Folded into species selection inconsistently; needs typed species variants.",
  },
  "recipes.json:recipe": {
    status: "generic",
    table: "reference_entries",
    note: "Needs typed recipes/crafting table.",
  },
  "rewards.json:reward": {
    status: "generic",
    table: "reference_entries",
    note: "Needs typed rewards table.",
  },
  "senses.json:sense": {
    status: "typed",
    table: "senses",
    note: "Typed sense reference table exists.",
  },
  "skills.json:skill": { status: "typed", table: "skills", note: "Typed skill table exists." },
  spells: { status: "typed", table: "spells", note: "Spell files are seeded from subdirectory." },
  "tables.json:table": {
    status: "generic",
    table: "reference_entries",
    note: "Needs typed roll table schema.",
  },
  "trapshazards.json:trap": { status: "typed", table: "hazards", note: "Stored with kind=trap." },
  "trapshazards.json:hazard": {
    status: "typed",
    table: "hazards",
    note: "Stored with kind=hazard.",
  },
  "variantrules.json:variantrule": {
    status: "generic",
    table: "reference_entries",
    note: "Needs typed rules reference table with rule tags/links.",
  },
  "vehicles.json:vehicle": { status: "typed", table: "vehicles", note: "Vehicle table exists." },
  "vehicles.json:vehicleUpgrade": { status: "raw", note: "Needs vehicle upgrades table." },
};

const META_PREFIXES = ["fluff-", "foundry-", "makebrew", "makecards", "converter", "renderdemo"];
const EXCLUDED_KEYS = new Set([
  "homecrafts.json:crochetPattern",
  "fluff-homecrafts.json:crochetPatternFluff",
]);

function classify(fileName: string, key: string): CoverageRule {
  const id = `${fileName}:${key}`;
  if (EXCLUDED_KEYS.has(id)) return { status: "excluded", note: "Homebrew/non-D&D app content." };
  if (META_PREFIXES.some((prefix) => fileName.startsWith(prefix))) {
    return {
      status: "metadata",
      note: "Metadata/fluff/foundry support file; should be linked to typed rows where relevant.",
    };
  }
  return COVERAGE[id] || { status: "raw", note: "No typed coverage rule yet." };
}

function arraysInFile(filePath: string) {
  const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return Object.entries(json)
    .filter(([, value]) => Array.isArray(value))
    .map(([key, value]) => ({ key, count: (value as unknown[]).length }));
}

function main() {
  const dataDir = path.join(process.cwd(), "new data");
  const rows = fs
    .readdirSync(dataDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .flatMap((fileName) =>
      arraysInFile(path.join(dataDir, fileName)).map((entry) => ({
        fileName,
        ...entry,
        ...classify(fileName, entry.key),
      })),
    );

  const summary = rows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    {} as Record<CoverageStatus, number>,
  );

  console.log("5etools top-level array coverage");
  console.log(JSON.stringify(summary, null, 2));
  console.log("");
  for (const row of rows.sort(
    (a, b) => a.status.localeCompare(b.status) || a.fileName.localeCompare(b.fileName),
  )) {
    console.log(
      `${row.status.padEnd(8)} ${row.fileName}:${row.key} (${row.count})${row.table ? ` -> ${row.table}` : ""} - ${row.note}`,
    );
  }
}

main();
