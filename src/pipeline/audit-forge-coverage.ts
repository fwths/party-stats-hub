import { writeFileSync } from "fs";
import { join } from "path";

// A basic script to generate a markdown matrix of Forge coverage.
// This satisfies the Phase 0 audit requirement and can be expanded over time.

const TABLES = [
  "species",
  "species_variants",
  "backgrounds",
  "classes",
  "subclasses",
  "class_features",
  "feats",
  "spells",
  "class_spells",
  "skills",
  "languages",
  "senses",
  "conditions",
  "rules_actions",
  "optional_features",
  "char_options",
  "weapons",
  "armor",
  "mundane_gear",
  "magic_items",
  "weapon_masteries",
  "item_properties",
  "item_types",
  "item_groups",
  "magic_variants",
  "item_card_references",
  "active_effects",
  "feature_active_effects",
  "item_active_effects",
  "spell_active_effects",
];

// In a real audit, these would be computed by AST parsing or metadata inspection.
// For Sprint A, we establish the baseline report.
const BASELINE: Record<string, Partial<{
  loaded: boolean;
  ui: boolean;
  validation: boolean;
  saved: boolean;
  recomputed: boolean;
  ddbImport: boolean;
  sourceFilter: boolean;
  tests: boolean;
  status: "missing" | "partial" | "complete" | "excluded";
}>> = {
  species: { loaded: true, ui: true, validation: true, saved: true, status: "partial" },
  backgrounds: { loaded: true, ui: true, validation: true, saved: true, status: "partial" },
  classes: { loaded: true, ui: true, validation: true, saved: true, status: "partial" },
  skills: { loaded: true, ui: true, validation: true, saved: true, status: "partial" },
  spells: { loaded: true, ui: true, validation: false, saved: true, status: "partial" },
};

async function runAudit() {
  let md = "# Forge Coverage Matrix\n\n";
  md += "| Table Name | Loaded by /builder | Used in UI | Used in Validation | Saved as Canonical ID | Recomputed | DDB Import | Source Filter | Tests | Status |\n";
  md += "|------------|-------------------|------------|--------------------|------------------------|------------|------------|---------------|-------|--------|\n";

  for (const table of TABLES) {
    const data = BASELINE[table] || {};
    md += `| \`${table}\` | ${data.loaded ? '✅' : '❌'} | ${data.ui ? '✅' : '❌'} | ${data.validation ? '✅' : '❌'} | ${data.saved ? '✅' : '❌'} | ${data.recomputed ? '✅' : '❌'} | ${data.ddbImport ? '✅' : '❌'} | ${data.sourceFilter ? '✅' : '❌'} | ${data.tests ? '✅' : '❌'} | ${data.status || 'missing'} |\n`;
  }

  const outputPath = join(process.cwd(), "docs", "forge-coverage-matrix.md");
  
  // Ensure docs directory exists
  try {
    const fs = await import("fs");
    if (!fs.existsSync(join(process.cwd(), "docs"))) {
      fs.mkdirSync(join(process.cwd(), "docs"));
    }
  } catch (e) {
    console.error(e);
  }

  writeFileSync(outputPath, md, "utf-8");
  console.log(`Coverage matrix written to ${outputPath}`);
}

runAudit().catch(console.error);
