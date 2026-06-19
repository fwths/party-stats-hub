import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import {
  DAMAGE_TYPE_MAP,
  SCHOOL_MAP,
  formatCastingTime,
  formatDuration,
  formatRange,
  renderEntries,
  slugify,
  titleCase,
} from "../5etools-utils";
import { getSourcePriority, isSourceAllowed } from "../source-config";

type Spell = {
  name: string;
  source: string;
  edition?: string;
  page?: number;
  level?: number;
  school?: string;
  time?: unknown[];
  range?: unknown;
  duration?: Array<{ concentration?: boolean }>;
  components?: {
    v?: boolean;
    s?: boolean;
    m?: string | boolean | { text?: string; cost?: number; consume?: boolean | string };
  };
  meta?: { ritual?: boolean };
  entries?: unknown;
  entriesHigherLevel?: unknown;
  damageInflict?: string[];
  savingThrow?: string[];
  areaTags?: string[];
  spellAttack?: string[];
};

function readSpellFiles(): Spell[] {
  const spellsDir = path.join(process.cwd(), "new data/spells");
  return fs
    .readdirSync(spellsDir)
    .filter((file) => /^spells-.*\.json$/i.test(file))
    .flatMap((file) => {
      const data = JSON.parse(fs.readFileSync(path.join(spellsDir, file), "utf-8"));
      return Array.isArray(data.spell) ? data.spell : [];
    });
}

function getMaterialComponent(component: Spell["components"] extends infer C ? C : never) {
  const material = component?.m;
  if (!material) return {};
  if (typeof material === "string") return { m: true, materialDescription: material };
  if (typeof material === "boolean") return { m: material };
  return {
    m: true,
    materialDescription: material.text,
    materialCost: material.cost,
    consumed: !!material.consume,
  };
}

function selectAllowedSpells(spells: Spell[]): Spell[] {
  const selected = new Map<string, Spell>();

  for (const spell of spells) {
    if (!isSourceAllowed(spell.source)) continue;
    const key = spell.name.toLowerCase();
    const existing = selected.get(key);
    const existingPriority = existing ? getSourcePriority(existing.source, existing.edition) : -1;
    const priority = getSourcePriority(spell.source, spell.edition);
    if (!existing || priority > existingPriority) selected.set(key, spell);
  }

  return [...selected.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function mapSpell(spell: Spell) {
  const material = getMaterialComponent(spell.components);
  const description = [renderEntries(spell.entries), renderEntries(spell.entriesHigherLevel)]
    .filter(Boolean)
    .join("\n\n");

  return {
    id: slugify(spell.name),
    name: spell.name,
    level: spell.level || 0,
    school: SCHOOL_MAP[spell.school || ""] || spell.school || "Unknown",
    castingTime: formatCastingTime(spell.time as any),
    range: formatRange(spell.range as any),
    duration: formatDuration(spell.duration as any),
    concentration: !!spell.duration?.some((duration) => duration.concentration),
    ritual: !!spell.meta?.ritual,
    description,
    components: {
      v: !!spell.components?.v,
      s: !!spell.components?.s,
      m: !!material.m,
      materialDescription: material.materialDescription,
      materialCost: material.materialCost,
      consumed: material.consumed,
    },
    damage: (spell.damageInflict || []).map((damageType) => ({
      type: DAMAGE_TYPE_MAP[damageType.toUpperCase()] || titleCase(damageType),
    })),
    savingThrow: (spell.savingThrow || []).map(titleCase),
    areaOfEffect: spell.areaTags || [],
    attackRoll: !!spell.spellAttack?.length,
    source: spell.source,
    page: spell.page,
  };
}

async function seedClassSpellLinks(db: any, spellIdsByName: Map<string, string>) {
  const sourcesFile = path.join(process.cwd(), "new data/spells/sources.json");
  if (!fs.existsSync(sourcesFile)) return;

  const sources = JSON.parse(fs.readFileSync(sourcesFile, "utf-8"));
  const seen = new Set<string>();
  let count = 0;

  for (const spellSource of Object.values(sources) as any[]) {
    for (const [spellName, metadata] of Object.entries(spellSource) as any[]) {
      const spellId = spellIdsByName.get(spellName.toLowerCase());
      if (!spellId || !metadata.class) continue;

      for (const classRef of metadata.class) {
        if (!isSourceAllowed(classRef.source)) continue;
        const classId = slugify(classRef.name);
        const linkId = `${classId}:${spellId}`;
        if (seen.has(linkId)) continue;
        seen.add(linkId);

        await db.insert(schema.classSpells).values({ classId, spellId }).onConflictDoNothing();
        count++;
      }
    }
  }

  console.log(`Seeded ${count} class spell links.`);
}

export async function seedSpells(db: any) {
  console.log("Seeding spells from 5etools data...");

  try {
    const fluffMap = loadSpellFluffMap();
    const foundryMap = loadSpellFoundryMap();

    const spells = selectAllowedSpells(readSpellFiles()).map(mapSpell);
    const spellIdsByName = new Map<string, string>();

    for (const spell of spells) {
      spellIdsByName.set(spell.name.toLowerCase(), spell.id);
      const key = `${spell.name.toLowerCase()}|${spell.source.toLowerCase()}`;
      const fluff = fluffMap.get(key);
      const foundry = foundryMap.get(key);

      await db
        .insert(schema.spells)
        .values({
          id: spell.id,
          name: spell.name,
          level: spell.level,
          school: spell.school,
          castingTime: spell.castingTime,
          range: spell.range,
          duration: spell.duration,
          concentration: spell.concentration,
          ritual: spell.ritual,
          description: spell.description,
          componentsJson: JSON.stringify(spell.components),
          damageJson: JSON.stringify(spell.damage),
          healingJson: JSON.stringify({}),
          savingThrowJson: JSON.stringify(spell.savingThrow),
          areaOfEffectJson: JSON.stringify(spell.areaOfEffect),
          attackRoll: spell.attackRoll,
          summonsStatBlockIds: JSON.stringify([]),
          source: spell.source,
          fluffJson: fluff ? JSON.stringify(fluff) : null,
          foundryJson: foundry ? JSON.stringify(foundry) : null,
        })
        .onConflictDoUpdate({
          target: schema.spells.id,
          set: {
            name: spell.name,
            level: spell.level,
            school: spell.school,
            castingTime: spell.castingTime,
            range: spell.range,
            duration: spell.duration,
            concentration: spell.concentration,
            ritual: spell.ritual,
            description: spell.description,
            componentsJson: JSON.stringify(spell.components),
            damageJson: JSON.stringify(spell.damage),
            healingJson: JSON.stringify({}),
            savingThrowJson: JSON.stringify(spell.savingThrow),
            areaOfEffectJson: JSON.stringify(spell.areaOfEffect),
            attackRoll: spell.attackRoll,
            summonsStatBlockIds: JSON.stringify([]),
            source: spell.source,
            fluffJson: fluff ? JSON.stringify(fluff) : null,
            foundryJson: foundry ? JSON.stringify(foundry) : null,
          },
        });
    }

    await seedClassSpellLinks(db, spellIdsByName);
    console.log(`Seeded ${spells.length} spells from 5etools.`);
  } catch (e) {
    console.error("Error seeding spells:", e);
    throw e;
  }
}

function loadSpellFluffMap(): Map<string, any> {
  const map = new Map<string, any>();
  const dir = path.join(process.cwd(), "new data/spells");
  if (!fs.existsSync(dir)) return map;
  const files = fs.readdirSync(dir).filter((f) => /^fluff-spells-.*\.json$/i.test(f));
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
    const fluffList = data.spellFluff || [];
    for (const fluff of fluffList) {
      const key = `${fluff.name.toLowerCase()}|${fluff.source.toLowerCase()}`;
      map.set(key, fluff);
    }
  }
  return map;
}

function loadSpellFoundryMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/spells/foundry.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const spells = data.spell || [];
    for (const spell of spells) {
      const key = `${spell.name.toLowerCase()}|${spell.source.toLowerCase()}`;
      map.set(key, spell);
    }
  }
  return map;
}

