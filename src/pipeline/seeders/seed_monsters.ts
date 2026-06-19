import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import { SIZE_MAP, parseCr, renderEntries, slugify, titleCase } from "../5etools-utils";
import { getSourcePriority, isSourceAllowed } from "../source-config";

type Monster = {
  name: string;
  source: string;
  edition?: string;
  size?: string[];
  type?: string | { type?: string; tags?: unknown[] };
  alignment?: string[];
  ac?: unknown[];
  hp?: unknown;
  speed?: unknown;
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  save?: Record<string, string>;
  skill?: Record<string, string>;
  resist?: unknown[];
  immune?: unknown[];
  vulnerable?: unknown[];
  conditionImmune?: unknown[];
  senses?: string[];
  passive?: number;
  languages?: string[];
  cr?: unknown;
  trait?: unknown[];
  action?: unknown[];
  bonus?: unknown[];
  reaction?: unknown[];
  legendary?: unknown[];
  mythic?: unknown[];
};

const ALIGNMENT_MAP: Record<string, string> = {
  A: "Any",
  C: "Chaotic",
  E: "Evil",
  G: "Good",
  L: "Lawful",
  N: "Neutral",
  U: "Unaligned",
};

function getProficiencyBonus(cr: number): number {
  if (cr <= 4) return 2;
  if (cr <= 8) return 3;
  if (cr <= 12) return 4;
  if (cr <= 16) return 5;
  if (cr <= 20) return 6;
  if (cr <= 24) return 7;
  if (cr <= 28) return 8;
  return 9;
}

function readMonsterFiles(): Monster[] {
  const bestiaryDir = path.join(process.cwd(), "new data/bestiary");
  return fs
    .readdirSync(bestiaryDir)
    .filter((file) => /^bestiary-.*\.json$/i.test(file))
    .flatMap((file) => {
      const data = JSON.parse(fs.readFileSync(path.join(bestiaryDir, file), "utf-8"));
      return Array.isArray(data.monster) ? data.monster : [];
    });
}

function selectAllowedMonsters(monsters: Monster[]): Monster[] {
  const selected = new Map<string, Monster>();

  for (const monster of monsters) {
    if (!isSourceAllowed(monster.source)) continue;
    const key = monster.name.toLowerCase();
    const existing = selected.get(key);
    const existingPriority = existing ? getSourcePriority(existing.source, existing.edition) : -1;
    const priority = getSourcePriority(monster.source, monster.edition);
    if (!existing || priority > existingPriority) selected.set(key, monster);
  }

  return [...selected.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function formatSize(size: string[] | undefined): string {
  if (!size?.length) return "Medium";
  return size.map((part) => SIZE_MAP[part] || part).join(", ");
}

function formatType(type: Monster["type"]): string {
  if (!type) return "Humanoid";
  if (typeof type === "string") return titleCase(type);
  return titleCase(type.type || "Humanoid");
}

function formatAlignment(alignment: string[] | undefined): string {
  if (!alignment?.length) return "Unaligned";
  return alignment.map((part) => ALIGNMENT_MAP[part] || part).join(" ");
}

function renderActionList(actions: unknown[] | undefined) {
  return (actions || []).map((action: any) => ({
    name: action.name || "",
    entries: renderEntries(action.entries || action.entry || action),
  }));
}

function stringifyUnknownList(value: unknown[] | undefined): string {
  return JSON.stringify(value || []);
}

export async function seedMonsters(db: any) {
  console.log("Seeding monsters from 5etools data...");

  try {
    const monsters = selectAllowedMonsters(readMonsterFiles());

    for (const monster of monsters) {
      const challengeRating = parseCr(monster.cr);
      const senses = [...(monster.senses || [])];
      if (monster.passive) senses.push(`passive Perception ${monster.passive}`);

      await db
        .insert(schema.monsters)
        .values({
          id: slugify(monster.name),
          name: monster.name,
          size: formatSize(monster.size),
          type: formatType(monster.type),
          alignment: formatAlignment(monster.alignment),
          acJson: JSON.stringify(monster.ac || []),
          hpJson: JSON.stringify(monster.hp || {}),
          speedJson: JSON.stringify(monster.speed || { walk: 30 }),
          statsJson: JSON.stringify({
            str: monster.str || 10,
            dex: monster.dex || 10,
            con: monster.con || 10,
            int: monster.int || 10,
            wis: monster.wis || 10,
            cha: monster.cha || 10,
          }),
          savesJson: JSON.stringify(monster.save || {}),
          skillsJson: JSON.stringify(monster.skill || {}),
          resistancesJson: stringifyUnknownList(monster.resist),
          immunitiesJson: stringifyUnknownList(monster.immune),
          vulnerabilitiesJson: stringifyUnknownList(monster.vulnerable),
          conditionImmunitiesJson: stringifyUnknownList(monster.conditionImmune),
          sensesJson: JSON.stringify(senses),
          languagesJson: JSON.stringify(monster.languages || []),
          challengeRating,
          proficiencyBonus: getProficiencyBonus(challengeRating),
          traitsJson: JSON.stringify(renderActionList(monster.trait)),
          actionsJson: JSON.stringify(renderActionList(monster.action)),
          bonusActionsJson: JSON.stringify(renderActionList(monster.bonus)),
          reactionsJson: JSON.stringify(renderActionList(monster.reaction)),
          legendaryActionsJson: JSON.stringify(renderActionList(monster.legendary)),
          mythicActionsJson: JSON.stringify(renderActionList(monster.mythic)),
          lairActionsJson: JSON.stringify([]),
        })
        .onConflictDoUpdate({
          target: schema.monsters.id,
          set: {
            name: monster.name,
            size: formatSize(monster.size),
            type: formatType(monster.type),
            alignment: formatAlignment(monster.alignment),
            acJson: JSON.stringify(monster.ac || []),
            hpJson: JSON.stringify(monster.hp || {}),
            speedJson: JSON.stringify(monster.speed || { walk: 30 }),
            statsJson: JSON.stringify({
              str: monster.str || 10,
              dex: monster.dex || 10,
              con: monster.con || 10,
              int: monster.int || 10,
              wis: monster.wis || 10,
              cha: monster.cha || 10,
            }),
            savesJson: JSON.stringify(monster.save || {}),
            skillsJson: JSON.stringify(monster.skill || {}),
            resistancesJson: stringifyUnknownList(monster.resist),
            immunitiesJson: stringifyUnknownList(monster.immune),
            vulnerabilitiesJson: stringifyUnknownList(monster.vulnerable),
            conditionImmunitiesJson: stringifyUnknownList(monster.conditionImmune),
            sensesJson: JSON.stringify(senses),
            languagesJson: JSON.stringify(monster.languages || []),
            challengeRating,
            proficiencyBonus: getProficiencyBonus(challengeRating),
            traitsJson: JSON.stringify(renderActionList(monster.trait)),
            actionsJson: JSON.stringify(renderActionList(monster.action)),
            bonusActionsJson: JSON.stringify(renderActionList(monster.bonus)),
            reactionsJson: JSON.stringify(renderActionList(monster.reaction)),
            legendaryActionsJson: JSON.stringify(renderActionList(monster.legendary)),
            mythicActionsJson: JSON.stringify(renderActionList(monster.mythic)),
            lairActionsJson: JSON.stringify([]),
          },
        });
    }

    console.log(`Seeded ${monsters.length} monsters from 5etools.`);
  } catch (e) {
    console.error("Error seeding monsters:", e);
    throw e;
  }
}
