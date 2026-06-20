import { PreparedSpell, SpellSlotLevel } from "../dndbeyond.types";
import { MULTI_SLOTS, PACT_TABLE } from "./constants";

export function casterLevelFor(className: string, level: number, subclass: string): number {
  const n = className.toLowerCase();
  if (["bard", "cleric", "druid", "sorcerer", "wizard"].includes(n)) return level;
  if (n === "artificer") return Math.ceil(level / 2); // artificer rounds up
  if (["paladin", "ranger"].includes(n)) return level >= 2 ? Math.floor(level / 2) : 0;
  if (n === "fighter" && /eldritch knight/i.test(subclass))
    return level >= 3 ? Math.floor(level / 3) : 0;
  if (n === "rogue" && /arcane trickster/i.test(subclass))
    return level >= 3 ? Math.floor(level / 3) : 0;
  return 0;
}

export function computeSpellSlots(data: any): {
  spellSlots: SpellSlotLevel[];
  pactSlots: SpellSlotLevel[];
} {
  let casterLevel = 0;
  let warlockLevel = 0;
  for (const c of data.classes ?? []) {
    const name = c.definition?.name ?? "";
    const lvl = c.level ?? 0;
    const sub = c.subclassDefinition?.name ?? "";
    if (name.toLowerCase() === "warlock") warlockLevel += lvl;
    else casterLevel += casterLevelFor(name, lvl, sub);
  }
  const usedByLevel = new Map<number, number>();
  for (const s of data.spellSlots ?? []) usedByLevel.set(s.level, s.used ?? 0);
  const pactUsedByLevel = new Map<number, number>();
  for (const s of data.pactMagic ?? []) pactUsedByLevel.set(s.level, s.used ?? 0);

  const slotRow = MULTI_SLOTS[Math.min(casterLevel, 20)] ?? [];
  const spellSlots: SpellSlotLevel[] = slotRow.map((max, i) => ({
    level: i + 1,
    max,
    used: usedByLevel.get(i + 1) ?? 0,
  }));

  const pactSlots: SpellSlotLevel[] = [];
  if (warlockLevel > 0) {
    const [pactLvl, pactCount] = PACT_TABLE[Math.min(warlockLevel, 20)];
    if (pactCount > 0) {
      pactSlots.push({
        level: pactLvl,
        max: pactCount,
        used: pactUsedByLevel.get(pactLvl) ?? 0,
      });
    }
  }
  return { spellSlots, pactSlots };
}

export function mapSpell(
  def: any,
  level: number,
  prepared = true,
  alwaysPrepared = false,
  customName?: string,
): PreparedSpell {
  return {
    level,
    name: customName || def.name,
    description: def.description,
    school: def.school || undefined,
    activation: def.activation
      ? {
          activationTime: def.activation.activationTime,
          activationType: def.activation.activationType,
        }
      : undefined,
    range: def.range
      ? {
          origin: def.range.origin,
          rangeValue: def.range.rangeValue,
          aoeType: def.range.aoeType,
          aoeValue: def.range.aoeValue,
        }
      : undefined,
    duration: def.duration
      ? {
          durationType: def.duration.durationType,
          durationInterval: def.duration.durationInterval,
          durationUnit: def.duration.durationUnit,
        }
      : undefined,
    components: def.components || undefined,
    componentsDescription: def.componentsDescription || undefined,
    concentration: typeof def.concentration === "boolean" ? def.concentration : undefined,
    ritual: typeof def.ritual === "boolean" ? def.ritual : undefined,
    prepared,
    alwaysPrepared,
  };
}

export function computeSpellsList(data: any): {
  cantrips: PreparedSpell[];
  preparedSpells: PreparedSpell[];
  allSpells: PreparedSpell[];
} {
  const cantrips: PreparedSpell[] = [];
  const preparedSpells: PreparedSpell[] = [];
  const allSpells: PreparedSpell[] = [];

  const nameOverrides = new Map<number, string>();
  for (const cv of data?.characterValues ?? []) {
    if (cv.typeId === 8 && cv.valueId) {
      nameOverrides.set(Number(cv.valueId), cv.value);
    }
  }

  // 1. Process data.spells (race, background, item, feat, and subclass/class always-prepared)
  const sources = ["race", "class", "background", "item", "feat"] as const;
  for (const source of sources) {
    const list = data?.spells?.[source] ?? [];
    for (const s of list) {
      const def = s.definition ?? {};
      const customName = nameOverrides.get(s.id) || s.override?.name || s.clientOverrides?.name || s.displayAs;
      const name = customName || def.name;
      if (!name) continue;
      const level = def.level ?? 0;
      const isCantrip = level === 0;
      const isPrep = !!(
        s.prepared ||
        s.alwaysPrepared ||
        source === "item" ||
        source === "feat" ||
        source === "race"
      );

      const mapped = mapSpell(def, level, isPrep, !!s.alwaysPrepared, customName);
      if (isCantrip) {
        cantrips.push(mapped);
      } else {
        if (isPrep) {
          preparedSpells.push(mapped);
        }
        allSpells.push(mapped);
      }
    }
  }

  // 2. Process data.classSpells (spellbook/prepared list/known list)
  const classSpellsList = data?.classSpells ?? [];
  for (const cs of classSpellsList) {
    // Find corresponding class definition
    const klass = data.classes?.find((c: any) => c.id === cs.characterClassId);
    const isPreparedCaster = klass?.definition?.spellPrepareType != null;

    const spells = cs.spells ?? [];
    for (const s of spells) {
      const def = s.definition ?? {};
      const customName = nameOverrides.get(s.id) || s.override?.name || s.clientOverrides?.name || s.displayAs;
      const name = customName || def.name;
      if (!name) continue;
      const level = def.level ?? 0;
      const isCantrip = level === 0;

      const isAvailable =
        isCantrip ||
        !!s.prepared ||
        !!s.alwaysPrepared ||
        (!isPreparedCaster && !!s.countsAsKnownSpell);

      const mapped = mapSpell(def, level, isAvailable, !!s.alwaysPrepared, customName);
      if (isCantrip) {
        cantrips.push(mapped);
      } else {
        if (isAvailable) {
          preparedSpells.push(mapped);
        }
        allSpells.push(mapped);
      }
    }
  }

  const seenCantrips = new Set<string>();
  const uniqueCantrips: PreparedSpell[] = [];
  for (const c of cantrips) {
    if (!seenCantrips.has(c.name)) {
      seenCantrips.add(c.name);
      uniqueCantrips.push(c);
    }
  }
  uniqueCantrips.sort((a, b) => a.name.localeCompare(b.name));

  const seenSpells = new Set<string>();
  const uniquePrepared: PreparedSpell[] = [];
  for (const p of preparedSpells) {
    if (!seenSpells.has(p.name)) {
      seenSpells.add(p.name);
      uniquePrepared.push(p);
    }
  }
  uniquePrepared.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  });

  const seenAllSpells = new Set<string>();
  const uniqueAllSpells: PreparedSpell[] = [];
  for (const p of allSpells) {
    if (!seenAllSpells.has(p.name)) {
      seenAllSpells.add(p.name);
      uniqueAllSpells.push(p);
    }
  }
  uniqueAllSpells.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  });

  return {
    cantrips: uniqueCantrips,
    preparedSpells: uniquePrepared,
    allSpells: uniqueAllSpells,
  };
}
