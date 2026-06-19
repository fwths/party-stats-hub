import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import { formatCastingTime, renderEntries, slugify } from "../5etools-utils";
import { getSourcePriority, isSourceAllowed } from "../source-config";

type SourceItem = {
  name: string;
  source: string;
  edition?: string;
  page?: number;
  entries?: unknown;
  [key: string]: unknown;
};

function readArray<T>(fileName: string, key: string): T[] {
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), "new data", fileName), "utf-8"));
  return data[key] || [];
}

function selectAllowed<T extends SourceItem>(items: T[]): T[] {
  const selected = new Map<string, T>();

  for (const item of items) {
    if (!item.name || !isSourceAllowed(item.source)) continue;
    const key = item.name.toLowerCase();
    const existing = selected.get(key);
    const existingPriority = existing ? getSourcePriority(existing.source, existing.edition) : -1;
    const priority = getSourcePriority(item.source, item.edition);
    if (!existing || priority > existingPriority) selected.set(key, item);
  }

  return [...selected.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function actionActivation(time: unknown) {
  const formatted = formatCastingTime(time as any);
  if (/bonus/i.test(formatted)) return "bonus_action";
  if (/reaction/i.test(formatted)) return "reaction";
  if (/minute|hour|day/i.test(formatted)) return formatted;
  if (/action/i.test(formatted)) return "action";
  return formatted || null;
}

async function upsert(db: any, table: any, target: any, values: any) {
  await db.insert(table).values(values).onConflictDoUpdate({ target, set: values });
}

export async function seedRulesReferences(db: any) {
  console.log("Seeding typed rules references from 5etools data...");

  const actions = selectAllowed(readArray<SourceItem>("actions.json", "action"));
  const conditions = selectAllowed(readArray<SourceItem>("conditionsdiseases.json", "condition"));
  const diseases = selectAllowed(readArray<SourceItem>("conditionsdiseases.json", "disease"));
  const statuses = selectAllowed(readArray<SourceItem>("conditionsdiseases.json", "status"));
  const languages = selectAllowed(readArray<SourceItem>("languages.json", "language"));
  const languageScripts = selectAllowed(readArray<SourceItem>("languages.json", "languageScript"));
  const skills = selectAllowed(readArray<SourceItem>("skills.json", "skill"));
  const senses = selectAllowed(readArray<SourceItem>("senses.json", "sense"));

  for (const action of actions) {
    await upsert(db, schema.rulesActions, schema.rulesActions.id, {
      id: slugify(action.name),
      name: action.name,
      source: action.source,
      page: action.page || null,
      timeJson: JSON.stringify(action.time || []),
      activation: actionActivation(action.time),
      description: renderEntries(action.entries),
      rawJson: JSON.stringify(action),
    });
  }

  for (const [kind, rows] of [
    ["condition", conditions],
    ["disease", diseases],
    ["status", statuses],
  ] as const) {
    for (const item of rows) {
      await upsert(db, schema.conditions, schema.conditions.id, {
        id: slugify(`${kind}-${item.name}`),
        name: item.name,
        source: item.source,
        page: item.page || null,
        kind,
        description: renderEntries(item.entries),
        rawJson: JSON.stringify(item),
      });
    }
  }

  for (const language of languages) {
    await upsert(db, schema.languages, schema.languages.id, {
      id: slugify(language.name),
      name: language.name,
      source: language.source,
      page: language.page || null,
      type: typeof language.type === "string" ? language.type : null,
      script: typeof language.script === "string" ? language.script : null,
      typicalSpeakersJson: JSON.stringify(language.typicalSpeakers || []),
      description: renderEntries(language.entries),
      rawJson: JSON.stringify(language),
    });
  }

  for (const script of languageScripts) {
    await upsert(db, schema.languageScripts, schema.languageScripts.id, {
      id: slugify(script.name),
      name: script.name,
      source: script.source,
      fontsJson: JSON.stringify(script.fonts || []),
      rawJson: JSON.stringify(script),
    });
  }

  for (const skill of skills) {
    await upsert(db, schema.skills, schema.skills.id, {
      id: slugify(skill.name),
      name: skill.name,
      source: skill.source,
      page: skill.page || null,
      ability: String(skill.ability || "")
        .slice(0, 3)
        .toUpperCase(),
      description: renderEntries(skill.entries),
      rawJson: JSON.stringify(skill),
    });
  }

  for (const sense of senses) {
    await upsert(db, schema.senses, schema.senses.id, {
      id: slugify(sense.name),
      name: sense.name,
      source: sense.source,
      page: sense.page || null,
      description: renderEntries(sense.entries),
      rawJson: JSON.stringify(sense),
    });
  }

  console.log(`Seeded ${actions.length} actions.`);
  console.log(
    `Seeded ${conditions.length + diseases.length + statuses.length} condition/disease/status rows.`,
  );
  console.log(`Seeded ${languages.length} languages and ${languageScripts.length} scripts.`);
  console.log(`Seeded ${skills.length} skills.`);
  console.log(`Seeded ${senses.length} senses.`);
}
