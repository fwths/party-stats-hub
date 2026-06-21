import * as schema from "../../db/schema";
import { slugify } from "../5etools-utils";

type EffectSource = {
  id: string;
  name: string;
  description?: string | null;
  duration?: string | null;
};

const CONDITION_NAMES = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Exhaustion",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
];

const DAMAGE_TYPES = [
  "Acid",
  "Bludgeoning",
  "Cold",
  "Fire",
  "Force",
  "Lightning",
  "Necrotic",
  "Piercing",
  "Poison",
  "Psychic",
  "Radiant",
  "Slashing",
  "Thunder",
];

function textOf(source: EffectSource) {
  return `${source.name}\n${source.description || ""}`;
}

function durationParts(duration: string | null | undefined) {
  if (!duration) return { durationValue: null, durationUnit: null };
  const match = duration.match(/(?:up to\s+)?(\d+)\s+(\w+)/i);
  if (!match) return { durationValue: null, durationUnit: duration };
  return { durationValue: Number(match[1]), durationUnit: match[2].toLowerCase() };
}

function mentionedConditions(text: string) {
  return CONDITION_NAMES.filter((condition) => new RegExp(`\\b${condition}\\b`, "i").test(text));
}

function mentionedDamageTypes(text: string, phrase: "resistance" | "immunity") {
  const lower = text.toLowerCase();
  return DAMAGE_TYPES.filter((damageType) => {
    const type = damageType.toLowerCase();
    return (
      new RegExp(`${phrase}\\s+to\\s+${type}\\s+damage`, "i").test(text) ||
      new RegExp(`${phrase}\\s+against\\s+${type}\\s+damage`, "i").test(text) ||
      new RegExp(`${type}\\s+damage[^.]{0,80}\\b${phrase}`, "i").test(text) ||
      lower.includes(`${phrase} to all damage`)
    );
  });
}

function mentionedSpeeds(text: string) {
  const speeds: Array<{ type: string; value: number | null }> = [];
  for (const match of text.matchAll(
    /\b(walking|climbing|flying|swimming|burrowing)?\s*speed (?:is|of|equal to|increases by)?\s*(\d+)?\s*feet/gi,
  )) {
    speeds.push({
      type: (match[1] || "speed").toLowerCase(),
      value: match[2] ? Number(match[2]) : null,
    });
  }
  return speeds;
}

function mentionedSenses(text: string) {
  const senses: Array<{ type: string; value: number | null }> = [];
  for (const match of text.matchAll(
    /\b(Darkvision|Blindsight|Tremorsense|Truesight)\b(?:\s+with a range of|\s+out to|\s+)?\s*(\d+)?\s*feet?/gi,
  )) {
    senses.push({
      type: match[1],
      value: match[2] ? Number(match[2]) : null,
    });
  }
  return senses;
}

function actionType(text: string) {
  if (/\bbonus action\b/i.test(text)) return "bonus_action";
  if (/\breaction\b/i.test(text)) return "reaction";
  if (/\bmagic action\b/i.test(text)) return "magic_action";
  if (/\baction\b/i.test(text)) return "action";
  return null;
}

function usesHint(text: string) {
  if (/\bproficiency bonus\b/i.test(text)) return { maximum: "proficiency_bonus" };
  const ability = text.match(
    /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier\b/i,
  );
  if (ability) return { maximum: `${ability[1].toLowerCase()}_modifier` };
  if (/\bonce\b/i.test(text)) return { maximum: 1 };
  return null;
}

function effectType(text: string) {
  if (/\bmust make\b|\bon a failed save\b|\bhas the .* condition\b/i.test(text)) return "Debuff";
  return "Buff";
}

function buildEffects(source: EffectSource, sourceKind: "spell" | "feature" | "item") {
  const text = textOf(source);
  const conditions = mentionedConditions(text);
  const resistances = mentionedDamageTypes(text, "resistance");
  const immunities = mentionedDamageTypes(text, "immunity");
  const speeds = mentionedSpeeds(text);
  const senses = mentionedSenses(text);
  const activation = actionType(text);
  const uses = usesHint(text);
  const changes = {
    conditions,
    speeds,
    senses,
    activation,
    uses,
    sourceKind,
  };

  if (
    conditions.length === 0 &&
    resistances.length === 0 &&
    immunities.length === 0 &&
    speeds.length === 0 &&
    senses.length === 0 &&
    !activation &&
    !uses
  ) {
    return [];
  }

  const duration = durationParts(source.duration);
  return [
    {
      id: slugify(`effect-${sourceKind}-${source.id}`),
      name: source.name,
      type: effectType(text),
      target: /\bself\b/i.test(text) ? "self" : "creature",
      durationValue: duration.durationValue,
      durationUnit: duration.durationUnit,
      changesJson: JSON.stringify(changes),
      grantsAdvantageOn: /\badvantage\b/i.test(text) ? source.name : null,
      grantsDisadvantageOn: /\bdisadvantage\b/i.test(text) ? source.name : null,
      grantsResistances: resistances.length ? JSON.stringify(resistances) : null,
      grantsImmunities: immunities.length ? JSON.stringify(immunities) : null,
    },
  ];
}

export async function seedActiveEffects(db: any) {
  console.log("Deriving active effects from normalized spells, features, and items...");

  let effectCount = 0;
  let spellLinks = 0;
  let featureLinks = 0;
  let itemLinks = 0;

  const effects: any[] = [];
  const spellLinkRows: any[] = [];
  const featureLinkRows: any[] = [];
  const itemLinkRows: any[] = [];

  const spells = await db.select().from(schema.spells);
  for (const spell of spells) {
    for (const effect of buildEffects(spell, "spell")) {
      effects.push(effect);
      spellLinkRows.push({ spellId: spell.id, effectId: effect.id });
      effectCount++;
      spellLinks++;
    }
  }

  const features = await db.select().from(schema.classFeatures);
  for (const feature of features) {
    for (const effect of buildEffects(feature, "feature")) {
      effects.push(effect);
      featureLinkRows.push({ featureId: feature.id, effectId: effect.id });
      effectCount++;
      featureLinks++;
    }
  }

  const magicItems = await db.select().from(schema.magicItems);
  for (const item of magicItems) {
    for (const effect of buildEffects(item, "item")) {
      effects.push(effect);
      itemLinkRows.push({ itemId: item.id, effectId: effect.id });
      effectCount++;
      itemLinks++;
    }
  }

  const BATCH_SIZE = 1000;
  if (effects.length > 0) {
    for (let i = 0; i < effects.length; i += BATCH_SIZE) {
      await db
        .insert(schema.activeEffects)
        .values(effects.slice(i, i + BATCH_SIZE))
        .onConflictDoNothing();
    }
  }
  if (spellLinkRows.length > 0) {
    for (let i = 0; i < spellLinkRows.length; i += BATCH_SIZE) {
      await db
        .insert(schema.spellActiveEffects)
        .values(spellLinkRows.slice(i, i + BATCH_SIZE))
        .onConflictDoNothing();
    }
  }
  if (featureLinkRows.length > 0) {
    for (let i = 0; i < featureLinkRows.length; i += BATCH_SIZE) {
      await db
        .insert(schema.featureActiveEffects)
        .values(featureLinkRows.slice(i, i + BATCH_SIZE))
        .onConflictDoNothing();
    }
  }
  if (itemLinkRows.length > 0) {
    for (let i = 0; i < itemLinkRows.length; i += BATCH_SIZE) {
      await db
        .insert(schema.itemActiveEffects)
        .values(itemLinkRows.slice(i, i + BATCH_SIZE))
        .onConflictDoNothing();
    }
  }

  console.log(`Derived ${effectCount} active effects.`);
  console.log(`  Spell links: ${spellLinks}`);
  console.log(`  Feature links: ${featureLinks}`);
  console.log(`  Item links: ${itemLinks}`);
}
