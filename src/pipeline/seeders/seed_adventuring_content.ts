import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import { renderEntries, slugify, titleCase } from "../5etools-utils";
import { getSourcePriority, isSourceAllowed } from "../source-config";

type SourceItem = {
  name: string;
  source: string;
  edition?: string;
  page?: number;
  entries?: unknown;
};

type Vehicle = SourceItem & {
  vehicleType?: string;
  terrain?: string[];
  capCrew?: number;
  capPassenger?: number;
  capCargo?: number;
  ac?: number | { ac?: number };
  hp?: number | { hp?: number };
  speed?: unknown;
  value?: number;
  hasRefs?: boolean;
  action?: unknown[];
  weapon?: unknown[];
  other?: unknown[];
  trait?: unknown[];
};

type BastionFacility = SourceItem & {
  facilityType?: string;
  level?: number;
  prerequisite?: unknown;
  orders?: string[];
  space?: string[];
  hirelings?: unknown;
  cost?: number;
  buildTime?: number;
};

type TrapHazard = SourceItem & {
  trapHazType?: string;
  rating?: unknown;
};

function readArray<T>(fileName: string, key: string): T[] {
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), "new data", fileName), "utf-8"));
  return data[key] || [];
}

function selectAllowed<T extends SourceItem>(items: T[]): T[] {
  const selected = new Map<string, T>();

  for (const item of items) {
    if (!isSourceAllowed(item.source)) continue;
    const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
    const existing = selected.get(key);
    const existingPriority = existing ? getSourcePriority(existing.source, existing.edition) : -1;
    const priority = getSourcePriority(item.source, item.edition);
    if (!existing || priority > existingPriority) selected.set(key, item);
  }

  return [...selected.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function firstNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstNumber(item);
      if (found !== null) return found;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const found = firstNumber(item);
      if (found !== null) return found;
    }
  }
  return null;
}

function acValue(ac: Vehicle["ac"]): number {
  if (typeof ac === "number") return ac;
  if (ac && typeof ac === "object" && typeof ac.ac === "number") return ac.ac;
  return 10;
}

function hpValue(hp: Vehicle["hp"]): number {
  if (typeof hp === "number") return hp;
  if (hp && typeof hp === "object" && typeof hp.hp === "number") return hp.hp;
  return 1;
}

function extractDc(description: string, label: RegExp): number | null {
  const nearby = description.match(label);
  if (nearby?.[1]) return Number(nearby[1]);
  const generic = description.match(/\bDC\s+(\d{2})\b/i);
  return generic ? Number(generic[1]) : null;
}

function extractSaves(description: string): string[] {
  const saves = new Set<string>();
  for (const match of description.matchAll(
    /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw/gi,
  )) {
    saves.add(titleCase(match[1]));
  }
  return [...saves];
}

function extractDamage(description: string): string[] {
  const damage = new Set<string>();
  for (const match of description.matchAll(
    /\b(Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder)\s+damage\b/gi,
  )) {
    damage.add(titleCase(match[1]));
  }
  return [...damage];
}

function capacityJson(vehicle: Vehicle) {
  return JSON.stringify({
    crew: vehicle.capCrew || 0,
    passengers: vehicle.capPassenger || 0,
    cargo: vehicle.capCargo || 0,
    terrain: vehicle.terrain || [],
  });
}

function vehicleWeaponsJson(vehicle: Vehicle) {
  return JSON.stringify({
    actions: vehicle.action || [],
    weapons: vehicle.weapon || [],
    traits: vehicle.trait || [],
    other: vehicle.other || [],
  });
}

export async function seedAdventuringContent(db: any) {
  console.log("Seeding vehicles, bastions, traps, and hazards from 5etools data...");

  const vehicleFluffMap = loadVehicleFluffMap();
  const bastionFluffMap = loadBastionFluffMap();
  const trapHazardFluffMap = loadTrapsHazardsFluffMap();
  const upgradeFoundryMap = loadVehicleUpgradesFoundryMap();

  const vehicles = selectAllowed(readArray<Vehicle>("vehicles.json", "vehicle"));
  const facilities = selectAllowed(readArray<BastionFacility>("bastions.json", "facility"));
  const traps = selectAllowed(readArray<TrapHazard>("trapshazards.json", "trap"));
  const hazards = selectAllowed(readArray<TrapHazard>("trapshazards.json", "hazard"));

  for (const vehicle of vehicles) {
    const description = renderEntries(vehicle.entries);
    const key = `${vehicle.name.toLowerCase()}|${vehicle.source.toLowerCase()}`;
    const fluff = vehicleFluffMap.get(key);

    await db
      .insert(schema.vehicles)
      .values({
        id: slugify(vehicle.name, vehicle.source),
        name: vehicle.name,
        source: vehicle.source,
        page: vehicle.page || null,
        category: titleCase(vehicle.vehicleType || "Vehicle"),
        description,
        costGp: Math.round((vehicle.value || 0) / 100),
        speed: firstNumber(vehicle.speed) || 0,
        capacityJson: capacityJson(vehicle),
        ac: acValue(vehicle.ac),
        hp: hpValue(vehicle.hp),
        damageThreshold: firstNumber((vehicle as any).dt) || 0,
        weaponsJson: vehicleWeaponsJson(vehicle),
        rawJson: JSON.stringify(vehicle),
        fluffJson: fluff ? JSON.stringify(fluff) : null,
        foundryJson: null,
      })
      .onConflictDoUpdate({
        target: schema.vehicles.id,
        set: {
          name: vehicle.name,
          source: vehicle.source,
          page: vehicle.page || null,
          category: titleCase(vehicle.vehicleType || "Vehicle"),
          description,
          costGp: Math.round((vehicle.value || 0) / 100),
          speed: firstNumber(vehicle.speed) || 0,
          capacityJson: capacityJson(vehicle),
          ac: acValue(vehicle.ac),
          hp: hpValue(vehicle.hp),
          damageThreshold: firstNumber((vehicle as any).dt) || 0,
          weaponsJson: vehicleWeaponsJson(vehicle),
          rawJson: JSON.stringify(vehicle),
          fluffJson: fluff ? JSON.stringify(fluff) : null,
          foundryJson: null,
        },
      });
  }

  for (const facility of facilities) {
    const description = renderEntries(facility.entries);
    const key = `${facility.name.toLowerCase()}|${facility.source.toLowerCase()}`;
    const fluff = bastionFluffMap.get(key);

    await db
      .insert(schema.bastions)
      .values({
        id: slugify(facility.name, facility.source),
        name: facility.name,
        source: facility.source,
        page: facility.page || null,
        facilityType: facility.facilityType || "basic",
        levelRequired: facility.level || 5,
        prerequisite: facility.prerequisite ? renderEntries(facility.prerequisite) : null,
        description,
        costToBuild: facility.cost || 0,
        daysToBuild: facility.buildTime || 0,
        ordersJson: JSON.stringify(facility.orders || []),
        rawJson: JSON.stringify(facility),
        fluffJson: fluff ? JSON.stringify(fluff) : null,
        foundryJson: null,
      })
      .onConflictDoUpdate({
        target: schema.bastions.id,
        set: {
          name: facility.name,
          source: facility.source,
          page: facility.page || null,
          facilityType: facility.facilityType || "basic",
          levelRequired: facility.level || 5,
          prerequisite: facility.prerequisite ? renderEntries(facility.prerequisite) : null,
          description,
          costToBuild: facility.cost || 0,
          daysToBuild: facility.buildTime || 0,
          ordersJson: JSON.stringify(facility.orders || []),
          rawJson: JSON.stringify(facility),
          fluffJson: fluff ? JSON.stringify(fluff) : null,
          foundryJson: null,
        },
      });
  }

  for (const item of [...traps, ...hazards]) {
    const description = renderEntries(item.entries);
    const kind = traps.includes(item) ? "trap" : "hazard";
    const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
    const fluff = trapHazardFluffMap.get(key);

    await db
      .insert(schema.hazards)
      .values({
        id: slugify(item.name, item.source),
        name: item.name,
        source: item.source,
        page: item.page || null,
        kind,
        hazardType: item.trapHazType || null,
        ratingJson: JSON.stringify(item.rating || []),
        description,
        perceptionDc: extractDc(description, /(?:notice|spot|detect|perceive)[^.]*\bDC\s+(\d{2})/i),
        disableDc: extractDc(description, /(?:disable|disarm|jam|bypass)[^.]*\bDC\s+(\d{2})/i),
        saveJson: JSON.stringify(extractSaves(description)),
        damageJson: JSON.stringify(extractDamage(description)),
        rawJson: JSON.stringify(item),
        fluffJson: fluff ? JSON.stringify(fluff) : null,
        foundryJson: null,
      })
      .onConflictDoUpdate({
        target: schema.hazards.id,
        set: {
          name: item.name,
          source: item.source,
          page: item.page || null,
          kind,
          hazardType: item.trapHazType || null,
          ratingJson: JSON.stringify(item.rating || []),
          description,
          perceptionDc: extractDc(
            description,
            /(?:notice|spot|detect|perceive)[^.]*\bDC\s+(\d{2})/i,
          ),
          disableDc: extractDc(description, /(?:disable|disarm|jam|bypass)[^.]*\bDC\s+(\d{2})/i),
          saveJson: JSON.stringify(extractSaves(description)),
          damageJson: JSON.stringify(extractDamage(description)),
          rawJson: JSON.stringify(item),
          fluffJson: fluff ? JSON.stringify(fluff) : null,
          foundryJson: null,
        },
      });
  }

  console.log(`Seeded ${vehicles.length} vehicles.`);
  console.log(`Seeded ${facilities.length} bastion facilities.`);
  console.log(`Seeded ${traps.length} traps.`);
  console.log(`Seeded ${hazards.length} hazards.`);

  // Seed vehicle upgrades
  const upgrades = readVehicleUpgrades();
  const allowedUpgrades = upgrades.filter((u: any) => isSourceAllowed(u.source));
  for (const upgrade of allowedUpgrades) {
    const id = slugify(`${upgrade.name}-${upgrade.source}`);
    const desc = renderEntries(upgrade.entries || []);
    const key = `${upgrade.name.toLowerCase()}|${upgrade.source.toLowerCase()}`;
    const foundry = upgradeFoundryMap.get(key);

    await db
      .insert(schema.vehicleUpgrades)
      .values({
        id,
        name: upgrade.name,
        source: upgrade.source,
        page: upgrade.page || null,
        upgradeTypeJson: JSON.stringify(upgrade.upgradeType || []),
        description: desc,
        rawJson: JSON.stringify(upgrade),
        fluffJson: null,
        foundryJson: foundry ? JSON.stringify(foundry) : null,
      })
      .onConflictDoUpdate({
        target: schema.vehicleUpgrades.id,
        set: {
          name: upgrade.name,
          source: upgrade.source,
          page: upgrade.page || null,
          upgradeTypeJson: JSON.stringify(upgrade.upgradeType || []),
          description: desc,
          rawJson: JSON.stringify(upgrade),
          fluffJson: null,
          foundryJson: foundry ? JSON.stringify(foundry) : null,
        },
      });
  }
  console.log(`Seeded ${allowedUpgrades.length} vehicle upgrades.`);

  // Seed encounters
  const encounters = readEncounters();
  const allowedEncounters = encounters.filter((e: any) => isSourceAllowed(e.source));
  for (const enc of allowedEncounters) {
    const id = slugify(`${enc.name}-${enc.source}`);
    await db
      .insert(schema.encounters)
      .values({
        id,
        name: enc.name,
        source: enc.source,
        page: enc.page || null,
        tablesJson: JSON.stringify(enc.tables || []),
        rawJson: JSON.stringify(enc),
      })
      .onConflictDoUpdate({
        target: schema.encounters.id,
        set: {
          name: enc.name,
          source: enc.source,
          page: enc.page || null,
          tablesJson: JSON.stringify(enc.tables || []),
          rawJson: JSON.stringify(enc),
        },
      });
  }
  console.log(`Seeded ${allowedEncounters.length} encounters.`);

  const encounterShapes = readEncounterShapes().filter((shape: any) =>
    isSourceAllowed(shape.source || "Generic"),
  );
  for (const shape of encounterShapes) {
    const source = shape.source || "Generic";
    await db
      .insert(schema.encounterShapes)
      .values({
        id: slugify(`${shape.name}-${source}`),
        name: shape.name,
        source,
        shapeTemplateJson: JSON.stringify(shape.shapeTemplate || []),
        rawJson: JSON.stringify(shape),
      })
      .onConflictDoUpdate({
        target: schema.encounterShapes.id,
        set: {
          name: shape.name,
          source,
          shapeTemplateJson: JSON.stringify(shape.shapeTemplate || []),
          rawJson: JSON.stringify(shape),
        },
      });
  }
  console.log(`Seeded ${encounterShapes.length} encounter shapes.`);
}

function readVehicleUpgrades(): any[] {
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/vehicles.json"), "utf-8"),
  );
  return data.vehicleUpgrade || [];
}

function readEncounters(): any[] {
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/encounters.json"), "utf-8"),
  );
  return data.encounter || [];
}

function readEncounterShapes(): any[] {
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/encounterbuilder.json"), "utf-8"),
  );
  return data.encounterShape || [];
}

function loadVehicleFluffMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/fluff-vehicles.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const list = data.vehicleFluff || [];
    for (const item of list) {
      const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}

function loadBastionFluffMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/fluff-bastions.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const list = data.facilityFluff || [];
    for (const item of list) {
      const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}

function loadTrapsHazardsFluffMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/fluff-trapshazards.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const traps = data.trapFluff || [];
    for (const item of traps) {
      const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
    const hazards = data.hazardFluff || [];
    for (const item of hazards) {
      const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}

function loadVehicleUpgradesFoundryMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/foundry-vehicles.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const list = data.vehicleUpgrade || [];
    for (const item of list) {
      const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}
