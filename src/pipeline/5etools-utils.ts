export const SCHOOL_MAP: Record<string, string> = {
  A: "Abjuration",
  C: "Conjuration",
  D: "Divination",
  E: "Enchantment",
  V: "Evocation",
  I: "Illusion",
  N: "Necromancy",
  T: "Transmutation",
};

export const SIZE_MAP: Record<string, string> = {
  F: "Fine",
  D: "Diminutive",
  T: "Tiny",
  S: "Small",
  M: "Medium",
  L: "Large",
  H: "Huge",
  G: "Gargantuan",
  V: "Varies",
};

export const DAMAGE_TYPE_MAP: Record<string, string> = {
  A: "Acid",
  B: "Bludgeoning",
  C: "Cold",
  F: "Fire",
  O: "Force",
  L: "Lightning",
  N: "Necrotic",
  P: "Piercing",
  I: "Poison",
  Y: "Psychic",
  R: "Radiant",
  S: "Slashing",
  T: "Thunder",
};

export const ARMOR_TYPE_MAP: Record<string, string> = {
  LA: "Light",
  MA: "Medium",
  HA: "Heavy",
  S: "Shield",
};

export const ITEM_TYPE_MAP: Record<string, string> = {
  A: "Ammunition",
  AF: "Ammunition",
  AT: "Artisan's Tools",
  EXP: "Explosive",
  G: "Adventuring Gear",
  GS: "Gaming Set",
  HA: "Heavy Armor",
  INS: "Instrument",
  LA: "Light Armor",
  M: "Melee Weapon",
  MA: "Medium Armor",
  OTH: "Other",
  P: "Potion",
  R: "Ranged Weapon",
  RD: "Rod",
  RG: "Ring",
  S: "Shield",
  SC: "Scroll",
  SCF: "Spellcasting Focus",
  T: "Tools",
  WD: "Wand",
  WOND: "Wondrous Item",
};

export const PROPERTY_MAP: Record<string, string> = {
  "2H": "Two-Handed",
  A: "Ammunition",
  F: "Finesse",
  H: "Heavy",
  L: "Light",
  LD: "Loading",
  R: "Reach",
  S: "Special",
  T: "Thrown",
  V: "Versatile",
};

type EntryObject = {
  name?: string;
  type?: string;
  entry?: unknown;
  entries?: unknown;
  items?: unknown;
  rows?: unknown;
  caption?: string;
};

type Range = {
  type?: string;
  distance?: {
    type?: string;
    amount?: number;
  };
};

type Duration = {
  type?: string;
  concentration?: boolean;
  duration?: {
    type?: string;
    amount?: number;
  };
  ends?: string[];
};

type CastingTime = {
  number?: number;
  unit?: string;
  condition?: string;
};

export function stripTags(text: string): string {
  return text
    .replace(/\{@(\w+)\s+([^}]+)\}/g, (_match, tag: string, body: string) => {
      const [label, , displayText] = body.split("|");
      if (tag === "dice" || tag === "damage" || tag === "scaledamage") return label;
      if (tag === "hit" || tag === "dc") return label.startsWith("+") ? label : `DC ${label}`;
      if (tag === "h") return "";
      if (tag === "atkr") return label;
      return displayText || label;
    })
    .replace(/\{@actSave (\w+)\}/g, (_match, ability: string) => `${ability.toUpperCase()} Save:`)
    .replace(/\{@actSaveFail\}/g, "Failure:")
    .replace(/\{@actSaveSuccess\}/g, "Success:")
    .replace(/\{@i ([^}]+)\}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function isEntryObject(value: unknown): value is EntryObject {
  return !!value && typeof value === "object";
}

export function renderEntries(entries: unknown): string {
  if (!entries) return "";
  if (typeof entries === "string") return stripTags(entries);

  if (Array.isArray(entries)) {
    return entries.map(renderEntries).filter(Boolean).join("\n\n");
  }

  if (!isEntryObject(entries)) return "";

  const chunks: string[] = [];
  if (entries.name) chunks.push(stripTags(entries.name));
  if (entries.caption) chunks.push(stripTags(entries.caption));
  if (entries.entry) chunks.push(renderEntries(entries.entry));
  if (entries.entries) chunks.push(renderEntries(entries.entries));
  if (entries.items) chunks.push(renderEntries(entries.items));
  if (entries.rows) chunks.push(renderEntries(entries.rows));
  return chunks.filter(Boolean).join("\n\n");
}

export function slugify(name: string, source?: string): string {
  const slug = name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return source ? `${slug}-${source.toLowerCase()}` : slug;
}

export function sourceTag(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return String(value).split("|").at(-1)?.toUpperCase();
}

export function codePart(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).split("|")[0];
}

export function parseCr(cr: unknown): number {
  if (typeof cr === "number") return cr;
  if (typeof cr === "object" && cr && "cr" in cr) return parseCr(cr.cr);
  if (typeof cr !== "string") return 0;

  const trimmed = cr.trim();
  if (!trimmed || trimmed === "Unknown") return 0;
  if (trimmed.includes("/")) {
    const [numerator, denominator] = trimmed.split("/").map(Number);
    return denominator ? numerator / denominator : 0;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatRange(range: Range | undefined): string {
  if (!range) return "Unknown";
  if (range.type === "special") return "Special";
  if (range.type === "point" && range.distance?.type === "self") return "Self";
  if (!range.distance) return titleCase(range.type || "Unknown");

  const { amount, type } = range.distance;
  if (typeof amount === "number" && type) return `${amount} ${type}`;
  return titleCase(type || range.type || "Unknown");
}

export function formatDuration(durations: Duration[] | undefined): string {
  if (!durations?.length) return "Instantaneous";

  return durations
    .map((duration) => {
      if (duration.type === "instant") return "Instantaneous";
      if (duration.type === "permanent" && duration.ends?.length) {
        return `Until ${duration.ends.join(" or ")}`;
      }
      if (!duration.duration) return titleCase(duration.type || "Unknown");

      const prefix = duration.concentration ? "Concentration, up to " : "";
      const amount = duration.duration.amount || 1;
      return `${prefix}${amount} ${duration.duration.type}${amount === 1 ? "" : "s"}`;
    })
    .join(" or ");
}

export function formatCastingTime(times: CastingTime[] | undefined): string {
  if (!times?.length) return "1 action";

  return times
    .map((time) => {
      const amount = time.number || 1;
      const unit = time.unit || "action";
      const base = `${amount} ${unit}${amount === 1 ? "" : "s"}`;
      return time.condition ? `${base}, ${stripTags(time.condition)}` : base;
    })
    .join(" or ");
}

export function titleCase(value: string): string {
  return String(value)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}
