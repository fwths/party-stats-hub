import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import { renderEntries, slugify } from "../5etools-utils";
import { getSourcePriority, isSourceAllowed } from "../source-config";

type ClassEntry = {
  name: string;
  source: string;
  edition?: string;
  hd?: { faces?: number };
  primaryAbility?: unknown;
  proficiency?: string[];
  startingProficiencies?: unknown;
  startingEquipment?: unknown;
  subclassTitle?: string;
  spellcastingAbility?: string;
  casterProgression?: string;
  preparedSpells?: unknown;
  cantripProgression?: unknown;
  spellsKnownProgression?: unknown;
  classTableGroups?: unknown;
  featProgression?: unknown;
  optionalfeatureProgression?: unknown;
};

type SubclassEntry = {
  name: string;
  shortName?: string;
  source: string;
  edition?: string;
  className: string;
  classSource: string;
  subclassFeatures?: string[];
  spellcastingAbility?: string;
};

type FeatureEntry = {
  name: string;
  source: string;
  edition?: string;
  className: string;
  classSource: string;
  subclassShortName?: string;
  subclassSource?: string;
  level?: number;
  entries?: unknown;
};

type ClassFile = {
  class?: ClassEntry[];
  subclass?: SubclassEntry[];
  classFeature?: FeatureEntry[];
  subclassFeature?: FeatureEntry[];
};

type FluffFile = {
  classFluff?: Array<{
    name: string;
    entries?: unknown;
  }>;
  subclassFluff?: Array<{
    name: string;
    shortName?: string;
    className?: string;
    entries?: unknown;
  }>;
};

function readClassFiles(): ClassFile[] {
  const classesDir = path.join(process.cwd(), "new data/class");
  return fs
    .readdirSync(classesDir)
    .filter((file) => /^class-.*\.json$/i.test(file))
    .map((file) => JSON.parse(fs.readFileSync(path.join(classesDir, file), "utf-8")));
}

function readFluffDescriptions() {
  const classesDir = path.join(process.cwd(), "new data/class");
  const classDescriptions = new Map<string, string>();
  const subclassDescriptions = new Map<string, string>();

  for (const file of fs
    .readdirSync(classesDir)
    .filter((name) => /^fluff-class-.*\.json$/i.test(name))) {
    const data = JSON.parse(fs.readFileSync(path.join(classesDir, file), "utf-8")) as FluffFile;
    for (const fluff of data.classFluff || []) {
      if (fluff.entries && !classDescriptions.has(fluff.name)) {
        classDescriptions.set(fluff.name, renderEntries(fluff.entries));
      }
    }
    for (const fluff of data.subclassFluff || []) {
      const subclassName = fluff.shortName || fluff.name;
      if (fluff.className && fluff.entries) {
        subclassDescriptions.set(
          `${fluff.className}:${subclassName}`,
          renderEntries(fluff.entries),
        );
      }
    }
  }

  return { classDescriptions, subclassDescriptions };
}

function selectAllowedClasses(files: ClassFile[]): ClassEntry[] {
  const selected = new Map<string, ClassEntry>();

  for (const file of files) {
    for (const classEntry of file.class || []) {
      if (!isSourceAllowed(classEntry.source)) continue;
      if (classEntry.name.toLowerCase().includes("sidekick")) continue;
      if (classEntry.name.toLowerCase() === "mystic") continue;
      const key = classEntry.name.toLowerCase();
      const existing = selected.get(key);
      const existingPriority = existing ? getSourcePriority(existing.source, existing.edition) : -1;
      const priority = getSourcePriority(classEntry.source, classEntry.edition);
      if (!existing || priority > existingPriority) selected.set(key, classEntry);
    }
  }

  return [...selected.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function selectAllowedSubclasses(
  files: ClassFile[],
  allowedClassSources: Map<string, string>,
): SubclassEntry[] {
  const selected = new Map<string, SubclassEntry>();

  for (const subclass of files.flatMap((file) => file.subclass || [])) {
    if (!isSourceAllowed(subclass.source)) continue;
    if (allowedClassSources.get(subclass.className) !== subclass.classSource) continue;

    const key = `${subclass.className}:${subclass.shortName || subclass.name}`.toLowerCase();
    const existing = selected.get(key);
    const existingPriority = existing ? getSourcePriority(existing.source, existing.edition) : -1;
    const priority = getSourcePriority(subclass.source, subclass.edition);
    if (!existing || priority > existingPriority) selected.set(key, subclass);
  }

  return [...selected.values()].sort((a, b) =>
    `${a.className}:${a.name}`.localeCompare(`${b.className}:${b.name}`),
  );
}

function selectAllowedClassFeatures(
  files: ClassFile[],
  allowedClassSources: Map<string, string>,
): FeatureEntry[] {
  const selected = new Map<string, FeatureEntry>();

  for (const feature of files.flatMap((file) => file.classFeature || [])) {
    if (!isSourceAllowed(feature.source)) continue;
    if (allowedClassSources.get(feature.className) !== feature.classSource) continue;

    const key = `${feature.className}:${feature.name}:${feature.level || 0}`.toLowerCase();
    const existing = selected.get(key);
    const existingPriority = existing ? getSourcePriority(existing.source, existing.edition) : -1;
    const priority = getSourcePriority(feature.source, feature.edition);
    if (!existing || priority > existingPriority) selected.set(key, feature);
  }

  return [...selected.values()];
}

function selectAllowedSubclassFeatures(
  files: ClassFile[],
  allowedClassSources: Map<string, string>,
  selectedSubclasses: Map<string, SubclassEntry>,
): FeatureEntry[] {
  const selected = new Map<string, FeatureEntry>();

  for (const feature of files.flatMap((file) => file.subclassFeature || [])) {
    if (!isSourceAllowed(feature.source)) continue;
    if (!feature.subclassShortName || !feature.subclassSource) continue;
    if (!isSourceAllowed(feature.subclassSource)) continue;
    if (allowedClassSources.get(feature.className) !== feature.classSource) continue;

    const subclassKey = `${feature.className}:${feature.subclassShortName}`.toLowerCase();
    const selectedSubclass = selectedSubclasses.get(subclassKey);
    if (!selectedSubclass || selectedSubclass.source !== feature.subclassSource) continue;

    const key =
      `${feature.className}:${feature.subclassShortName}:${feature.name}:${feature.level || 0}`.toLowerCase();
    const existing = selected.get(key);
    const existingPriority = existing ? getSourcePriority(existing.source, existing.edition) : -1;
    const priority = getSourcePriority(feature.source, feature.edition);
    if (!existing || priority > existingPriority) selected.set(key, feature);
  }

  return [...selected.values()];
}

function hpAverage(hitDie: number): number {
  return Math.floor(hitDie / 2) + 1;
}

function spellcastingJson(classEntry: ClassEntry) {
  return {
    ability: classEntry.spellcastingAbility,
    progression: classEntry.casterProgression,
    preparedSpells: classEntry.preparedSpells,
    cantrips: classEntry.cantripProgression,
    spellsKnown: classEntry.spellsKnownProgression,
  };
}

function getSubclassId(subclass: SubclassEntry): string {
  return slugify(`${subclass.className}-${subclass.shortName || subclass.name}`);
}

function getSubclassLevel(subclass: SubclassEntry): number {
  const featureRef = subclass.subclassFeatures?.[0];
  const level = Number(featureRef?.split("|").at(-1));
  return Number.isFinite(level) && level > 0 ? level : 3;
}

function getSubclassDescription(
  subclass: SubclassEntry,
  subclassDescriptions: Map<string, string>,
  subclassFeatures: FeatureEntry[],
): string {
  const subclassName = subclass.shortName || subclass.name;
  const fluffDescription = subclassDescriptions.get(`${subclass.className}:${subclassName}`);
  if (fluffDescription) return fluffDescription;

  const feature = subclassFeatures.find(
    (candidate) =>
      candidate.className === subclass.className &&
      candidate.subclassShortName === subclassName &&
      candidate.subclassSource === subclass.source,
  );

  return feature ? renderEntries(feature.entries) : "";
}

function featureId(feature: FeatureEntry): string {
  const parts = [feature.className, feature.subclassShortName, feature.name, feature.level]
    .filter(Boolean)
    .join("-");
  return slugify(parts);
}

function optionName(entry: any): string | null {
  const ref = entry?.subclassFeature || entry?.classFeature || entry?.optionalfeature;
  if (typeof ref === "string") return ref.split("|")[0];
  if (typeof entry?.name === "string") return entry.name;
  if (typeof entry === "string") return entry;
  return null;
}

function extractFeatureOptions(entries: unknown): Array<{ count: number; options: string[] }> {
  const groups: Array<{ count: number; options: string[] }> = [];
  const visit = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "object") return;
    if (value.type === "options" && Array.isArray(value.entries)) {
      const options = value.entries.map(optionName).filter(Boolean);
      if (options.length > 0) groups.push({ count: value.count || 1, options });
    }
    if (value.entries) visit(value.entries);
    if (value.items) visit(value.items);
  };

  visit(entries);
  return groups;
}

export async function seedClasses(db: any) {
  console.log("Seeding classes, subclasses, and features from 5etools data...");

  try {
    const files = readClassFiles();
    const { classDescriptions, subclassDescriptions } = readFluffDescriptions();
    const classes = selectAllowedClasses(files);
    const allowedClassSources = new Map(
      classes.map((classEntry) => [classEntry.name, classEntry.source]),
    );

    const classFluffMap = loadClassFluffMap();
    const subclassFluffMap = loadSubclassFluffMap();
    const classFoundryMap = loadClassFoundryMap();
    const subclassFoundryMap = loadSubclassFoundryMap();
    const classFeatureFoundryMap = loadClassFeatureFoundryMap();
    const subclassFeatureFoundryMap = loadSubclassFeatureFoundryMap();

    for (const classEntry of classes) {
      const hitDie = classEntry.hd?.faces || 8;
      const key = `${classEntry.name.toLowerCase()}|${classEntry.source.toLowerCase()}`;
      const fluff = classFluffMap.get(key);
      const foundry = classFoundryMap.get(key);

      await db
        .insert(schema.classes)
        .values({
          id: slugify(classEntry.name),
          name: classEntry.name,
          description: classDescriptions.get(classEntry.name) || "",
          hitDice: hitDie,
          hitDiceType: `d${hitDie}`,
          hpFirstLevel: hitDie,
          hpHigherLevels: hpAverage(hitDie),
          subclassTitle: classEntry.subclassTitle || null,
          primaryAbilityJson: JSON.stringify(classEntry.primaryAbility || []),
          proficienciesJson: JSON.stringify({
            savingThrows: classEntry.proficiency || [],
            starting: classEntry.startingProficiencies || {},
          }),
          startingEquipmentJson: JSON.stringify(classEntry.startingEquipment || {}),
          acCalculationJson: JSON.stringify({}),
          speedJson: JSON.stringify({}),
          sensesJson: JSON.stringify({}),
          spellcastingJson: JSON.stringify(spellcastingJson(classEntry)),
          infusionsJson: JSON.stringify({}),
          wildShapeJson: JSON.stringify({}),
          optionsProgressionJson: JSON.stringify({
            tableGroups: classEntry.classTableGroups || [],
            feats: classEntry.featProgression || [],
            optionalFeatures: classEntry.optionalfeatureProgression || [],
          }),
          fluffJson: fluff ? JSON.stringify(fluff) : null,
          foundryJson: foundry ? JSON.stringify(foundry) : null,
        })
        .onConflictDoUpdate({
          target: schema.classes.id,
          set: {
            name: classEntry.name,
            description: classDescriptions.get(classEntry.name) || "",
            hitDice: hitDie,
            hitDiceType: `d${hitDie}`,
            hpFirstLevel: hitDie,
            hpHigherLevels: hpAverage(hitDie),
            subclassTitle: classEntry.subclassTitle || null,
            primaryAbilityJson: JSON.stringify(classEntry.primaryAbility || []),
            proficienciesJson: JSON.stringify({
              savingThrows: classEntry.proficiency || [],
              starting: classEntry.startingProficiencies || {},
            }),
            startingEquipmentJson: JSON.stringify(classEntry.startingEquipment || {}),
            acCalculationJson: JSON.stringify({}),
            speedJson: JSON.stringify({}),
            sensesJson: JSON.stringify({}),
            spellcastingJson: JSON.stringify(spellcastingJson(classEntry)),
            infusionsJson: JSON.stringify({}),
            wildShapeJson: JSON.stringify({}),
            optionsProgressionJson: JSON.stringify({
              tableGroups: classEntry.classTableGroups || [],
              feats: classEntry.featProgression || [],
              optionalFeatures: classEntry.optionalfeatureProgression || [],
            }),
            fluffJson: fluff ? JSON.stringify(fluff) : null,
            foundryJson: foundry ? JSON.stringify(foundry) : null,
          },
        });
    }

    const subclasses = selectAllowedSubclasses(files, allowedClassSources);
    const selectedSubclasses = new Map(
      subclasses.map((subclass) => [
        `${subclass.className}:${subclass.shortName || subclass.name}`.toLowerCase(),
        subclass,
      ]),
    );
    const classFeatures = selectAllowedClassFeatures(files, allowedClassSources);
    const subclassFeatures = selectAllowedSubclassFeatures(
      files,
      allowedClassSources,
      selectedSubclasses,
    );

    for (const subclass of subclasses) {
      const description = getSubclassDescription(subclass, subclassDescriptions, subclassFeatures);
      const key = `${subclass.className.toLowerCase()}|${(subclass.shortName || subclass.name).toLowerCase()}|${subclass.source.toLowerCase()}`;
      const fluff = subclassFluffMap.get(key);
      const foundry = subclassFoundryMap.get(key);

      await db
        .insert(schema.subclasses)
        .values({
          id: getSubclassId(subclass),
          classId: slugify(subclass.className),
          name: subclass.name,
          description,
          levelChosen: getSubclassLevel(subclass),
          alwaysPreparedSpellsJson: JSON.stringify([]),
          expandedSpellListJson: JSON.stringify([]),
          spellcastingJson: JSON.stringify({ ability: subclass.spellcastingAbility }),
          fluffJson: fluff ? JSON.stringify(fluff) : null,
          foundryJson: foundry ? JSON.stringify(foundry) : null,
        })
        .onConflictDoUpdate({
          target: schema.subclasses.id,
          set: {
            classId: slugify(subclass.className),
            name: subclass.name,
            description,
            levelChosen: getSubclassLevel(subclass),
            alwaysPreparedSpellsJson: JSON.stringify([]),
            expandedSpellListJson: JSON.stringify([]),
            spellcastingJson: JSON.stringify({ ability: subclass.spellcastingAbility }),
            fluffJson: fluff ? JSON.stringify(fluff) : null,
            foundryJson: foundry ? JSON.stringify(foundry) : null,
          },
        });
    }

    for (const feature of classFeatures) {
      const key = `${feature.className.toLowerCase()}|${feature.name.toLowerCase()}|${feature.level || 0}|${feature.source.toLowerCase()}`;
      const foundry = classFeatureFoundryMap.get(key);

      await db
        .insert(schema.classFeatures)
        .values({
          id: featureId(feature),
          classId: slugify(feature.className),
          subclassId: null,
          name: feature.name,
          description: renderEntries(feature.entries),
          levelRequired: feature.level || null,
          actionType: null,
          mathematicalRecoveryJson: JSON.stringify({}),
          usesJson: JSON.stringify({}),
          numericalModifiersJson: JSON.stringify({}),
          optionsJson: JSON.stringify(extractFeatureOptions(feature.entries)),
          fluffJson: null,
          foundryJson: foundry ? JSON.stringify(foundry) : null,
        })
        .onConflictDoUpdate({
          target: schema.classFeatures.id,
          set: {
            classId: slugify(feature.className),
            subclassId: null,
            name: feature.name,
            description: renderEntries(feature.entries),
            levelRequired: feature.level || null,
            actionType: null,
            mathematicalRecoveryJson: JSON.stringify({}),
            usesJson: JSON.stringify({}),
            numericalModifiersJson: JSON.stringify({}),
            optionsJson: JSON.stringify(extractFeatureOptions(feature.entries)),
            fluffJson: null,
            foundryJson: foundry ? JSON.stringify(foundry) : null,
          },
        });
    }

    for (const feature of subclassFeatures) {
      const key = `${feature.className.toLowerCase()}|${(feature.subclassShortName || "").toLowerCase()}|${feature.name.toLowerCase()}|${feature.level || 0}|${feature.source.toLowerCase()}`;
      const foundry = subclassFeatureFoundryMap.get(key);

      await db
        .insert(schema.classFeatures)
        .values({
          id: featureId(feature),
          classId: slugify(feature.className),
          subclassId: slugify(`${feature.className}-${feature.subclassShortName}`),
          name: feature.name,
          description: renderEntries(feature.entries),
          levelRequired: feature.level || null,
          actionType: null,
          mathematicalRecoveryJson: JSON.stringify({}),
          usesJson: JSON.stringify({}),
          numericalModifiersJson: JSON.stringify({}),
          optionsJson: JSON.stringify(extractFeatureOptions(feature.entries)),
          fluffJson: null,
          foundryJson: foundry ? JSON.stringify(foundry) : null,
        })
        .onConflictDoUpdate({
          target: schema.classFeatures.id,
          set: {
            classId: slugify(feature.className),
            subclassId: slugify(`${feature.className}-${feature.subclassShortName}`),
            name: feature.name,
            description: renderEntries(feature.entries),
            levelRequired: feature.level || null,
            actionType: null,
            mathematicalRecoveryJson: JSON.stringify({}),
            usesJson: JSON.stringify({}),
            numericalModifiersJson: JSON.stringify({}),
            optionsJson: JSON.stringify(extractFeatureOptions(feature.entries)),
            fluffJson: null,
            foundryJson: foundry ? JSON.stringify(foundry) : null,
          },
        });
    }

    console.log(`Seeded ${classes.length} classes.`);
    console.log(`Seeded ${subclasses.length} subclasses.`);
    console.log(`Seeded ${classFeatures.length + subclassFeatures.length} class features.`);
  } catch (e) {
    console.error("Error seeding classes:", e);
    throw e;
  }
}

function loadClassFluffMap(): Map<string, any> {
  const map = new Map<string, any>();
  const dir = path.join(process.cwd(), "new data/class");
  if (!fs.existsSync(dir)) return map;
  const files = fs.readdirSync(dir).filter((f) => /^fluff-class-.*\.json$/i.test(f));
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
    const list = data.classFluff || [];
    for (const item of list) {
      const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}

function loadSubclassFluffMap(): Map<string, any> {
  const map = new Map<string, any>();
  const dir = path.join(process.cwd(), "new data/class");
  if (!fs.existsSync(dir)) return map;
  const files = fs.readdirSync(dir).filter((f) => /^fluff-class-.*\.json$/i.test(f));
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
    const list = data.subclassFluff || [];
    for (const item of list) {
      const key = `${item.className.toLowerCase()}|${(item.shortName || item.name).toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}

function loadClassFoundryMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/class/foundry.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const list = data.class || [];
    for (const item of list) {
      const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}

function loadSubclassFoundryMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/class/foundry.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const list = data.subclass || [];
    for (const item of list) {
      const key = `${item.className.toLowerCase()}|${(item.shortName || item.name).toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}

function loadClassFeatureFoundryMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/class/foundry.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const list = data.classFeature || [];
    for (const item of list) {
      const key = `${item.className.toLowerCase()}|${item.name.toLowerCase()}|${item.level || 0}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}

function loadSubclassFeatureFoundryMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/class/foundry.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const list = data.subclassFeature || [];
    for (const item of list) {
      const key = `${item.className.toLowerCase()}|${(item.subclassShortName || "").toLowerCase()}|${item.name.toLowerCase()}|${item.level || 0}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}
