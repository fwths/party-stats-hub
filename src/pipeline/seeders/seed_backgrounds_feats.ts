import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import { renderEntries, slugify, titleCase } from "../5etools-utils";
import { getSourcePriority, isSourceAllowed } from "../source-config";

type Feat = {
  name: string;
  source: string;
  edition?: string;
  page?: number;
  category?: string;
  entries?: unknown;
  prerequisite?: unknown[];
  repeatable?: boolean;
  ability?: unknown;
};

type Background = {
  name: string;
  source: string;
  edition?: string;
  page?: number;
  ability?: unknown;
  feats?: Array<Record<string, boolean>>;
  skillProficiencies?: Array<Record<string, boolean>>;
  toolProficiencies?: Array<Record<string, boolean>>;
  startingEquipment?: unknown[];
  entries?: unknown;
};

const FEAT_CATEGORY_MAP: Record<string, string> = {
  G: "General",
  O: "Origin",
  FS: "Fighting Style",
  EB: "Epic Boon",
};

function readFeats(): Feat[] {
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/feats.json"), "utf-8"),
  );
  return data.feat || [];
}

function readBackgrounds(): Background[] {
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/backgrounds.json"), "utf-8"),
  );
  return data.background || [];
}

function selectAllowed<T extends { name: string; source: string }>(items: T[]): T[] {
  const selected = new Map<string, T>();

  for (const item of items) {
    if (!isSourceAllowed(item.source)) continue;
    const key = item.name.toLowerCase();
    const existing = selected.get(key);
    const existingPriority = existing
      ? getSourcePriority(existing.source, (existing as { edition?: string }).edition)
      : -1;
    const priority = getSourcePriority(item.source, (item as { edition?: string }).edition);
    if (!existing || priority > existingPriority) selected.set(key, item);
  }

  return [...selected.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function mapFeatCategory(category: string | undefined): string {
  return category ? FEAT_CATEGORY_MAP[category] || titleCase(category) : "General";
}

function extractLevelRequirement(prerequisite: unknown[] | undefined): number | null {
  for (const item of prerequisite || []) {
    if (item && typeof item === "object" && "level" in item) {
      const level = (item as { level?: number }).level;
      return typeof level === "number" ? level : null;
    }
  }
  return null;
}

function extractProficiencies(values: Array<Record<string, boolean>> | undefined): string[] {
  return (values || []).flatMap((value) =>
    Object.entries(value)
      .filter(([, enabled]) => enabled)
      .map(([name]) => titleCase(name)),
  );
}

function extractOriginFeat(feats: Array<Record<string, boolean>> | undefined): string | null {
  const featKey = feats?.flatMap((feat) => Object.keys(feat)).find(Boolean);
  if (!featKey) return null;
  return slugify(featKey.split("|")[0].split(";")[0]);
}

export async function seedBackgroundsFeats(db: any) {
  console.log("Seeding backgrounds and feats from 5etools data...");

  try {
    const feats = selectAllowed(readFeats());
    const backgrounds = selectAllowed(readBackgrounds());

    for (const feat of feats) {
      await db
        .insert(schema.feats)
        .values({
          id: slugify(feat.name),
          name: feat.name,
          category: mapFeatCategory(feat.category),
          description: renderEntries(feat.entries),
          prerequisite: feat.prerequisite ? renderEntries(feat.prerequisite) : null,
          levelRequirement: extractLevelRequirement(feat.prerequisite),
          repeatable: !!feat.repeatable,
          abilityScoreImprovementJson: JSON.stringify(feat.ability || {}),
          source: feat.source,
          page: feat.page || null,
        })
        .onConflictDoUpdate({
          target: schema.feats.id,
          set: {
            name: feat.name,
            category: mapFeatCategory(feat.category),
            description: renderEntries(feat.entries),
            prerequisite: feat.prerequisite ? renderEntries(feat.prerequisite) : null,
            levelRequirement: extractLevelRequirement(feat.prerequisite),
            repeatable: !!feat.repeatable,
            abilityScoreImprovementJson: JSON.stringify(feat.ability || {}),
            source: feat.source,
            page: feat.page || null,
          },
        });
    }

    for (const background of backgrounds) {
      await db
        .insert(schema.backgrounds)
        .values({
          id: slugify(background.name),
          name: background.name,
          description: renderEntries(background.entries),
          abilityScoreIncreasesJson: JSON.stringify(background.ability || []),
          skillProficienciesJson: JSON.stringify(
            extractProficiencies(background.skillProficiencies),
          ),
          toolProficienciesJson: JSON.stringify(extractProficiencies(background.toolProficiencies)),
          startingEquipmentJson: JSON.stringify(background.startingEquipment || []),
          originFeatId: extractOriginFeat(background.feats),
          source: background.source,
          page: background.page || null,
        })
        .onConflictDoUpdate({
          target: schema.backgrounds.id,
          set: {
            name: background.name,
            description: renderEntries(background.entries),
            abilityScoreIncreasesJson: JSON.stringify(background.ability || []),
            skillProficienciesJson: JSON.stringify(
              extractProficiencies(background.skillProficiencies),
            ),
            toolProficienciesJson: JSON.stringify(
              extractProficiencies(background.toolProficiencies),
            ),
            startingEquipmentJson: JSON.stringify(background.startingEquipment || []),
            originFeatId: extractOriginFeat(background.feats),
            source: background.source,
            page: background.page || null,
          },
        });
    }

    console.log(`Seeded ${feats.length} feats.`);
    console.log(`Seeded ${backgrounds.length} backgrounds from 5etools.`);
  } catch (e) {
    console.error("Error seeding backgrounds/feats:", e);
    throw e;
  }
}
