import { RuleGrant } from "../rules/grants";
import { ABILITY_NAMES } from "./constants";

function idFor(prefix: string, modifier: any, index: number) {
  return `${prefix}_${modifier?.id ?? modifier?.componentId ?? index}`;
}

function normalizedSubtype(modifier: any) {
  return String(modifier?.friendlySubtypeName || modifier?.subType || "")
    .replace(/-/g, " ")
    .trim();
}

const SKILL_SUBTYPES = new Set([
  "acrobatics",
  "animal-handling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleight-of-hand",
  "stealth",
  "survival",
]);

export function mapDdbModifiersToGrants(modifiers: any[]): RuleGrant[] {
  const grants: RuleGrant[] = [];

  for (const [index, m] of modifiers.entries()) {
    if (!m) continue;
    const source = m.friendlySubtypeName || m.friendlyTypeName || "DDB Import";
    const provenance = "DDB_Import";

    // Ability Score Bonuses
    if (m.type === "bonus" && m.subType && m.subType.endsWith("-score")) {
      const abilityMatch = m.subType.split("-")[0];
      const ability = ABILITY_NAMES.find((a) => a.toLowerCase() === abilityMatch);
      if (ability && typeof m.value === "number") {
        grants.push({
          id: idFor("ddb_ability_bonus", m, index),
          type: "ability_score_bonus",
          value: { ability: ability.toLowerCase(), bonus: m.value },
          mode: "fixed",
          sourceEntity: source,
          provenance,
        });
      }
    }

    // Skill Proficiencies
    if (m.type === "proficiency" && m.subType && SKILL_SUBTYPES.has(m.subType)) {
      grants.push({
        id: idFor("ddb_skill_proficiency", m, index),
        type: "skill_proficiency",
        value: m.subType.replace(/-/g, "_"),
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    // Skill Expertise
    if (m.type === "expertise" && m.subType) {
      grants.push({
        id: idFor("ddb_skill_expertise", m, index),
        type: "skill_expertise",
        value: m.subType.replace(/-/g, "_"),
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    // Saves
    if (m.type === "proficiency" && m.subType && m.subType.endsWith("-saving-throws")) {
      const abilityMatch = m.subType.split("-")[0];
      const ability = ABILITY_NAMES.find((a) => a.toLowerCase() === abilityMatch);
      if (ability) {
        grants.push({
          id: idFor("ddb_save_proficiency", m, index),
          type: "save_proficiency",
          value: ability.toLowerCase(),
          mode: "fixed",
          sourceEntity: source,
          provenance,
        });
      }
    }

    // Armor Class Bonus
    if (m.type === "bonus" && m.subType === "armor-class") {
      grants.push({
        id: idFor("ddb_ac_bonus", m, index),
        type: "armor_class_bonus",
        value: m.value,
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    // Languages
    if (m.type === "language" && m.subType) {
      grants.push({
        id: idFor("ddb_language", m, index),
        type: "language",
        value: m.friendlySubtypeName || m.subType,
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    // Senses
    if (m.type === "set-base" && m.subType && m.subType.includes("vision")) {
      grants.push({
        id: idFor("ddb_sense", m, index),
        type: "sense",
        value: `${m.friendlySubtypeName || m.subType} ${m.value || ""}`.trim(),
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    if (m.type === "resistance" && m.subType) {
      grants.push({
        id: idFor("ddb_damage_resistance", m, index),
        type: "damage_resistance",
        value: normalizedSubtype(m).toLowerCase(),
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    if (m.type === "immunity" && m.subType) {
      const subtype = normalizedSubtype(m).toLowerCase();
      grants.push({
        id: idFor(
          subtype.includes("condition") ? "ddb_condition_immunity" : "ddb_damage_immunity",
          m,
          index,
        ),
        type: subtype.includes("condition") ? "condition_immunity" : "damage_immunity",
        value: subtype.replace(" condition", ""),
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    if (m.type === "vulnerability" && m.subType) {
      grants.push({
        id: idFor("ddb_damage_vulnerability", m, index),
        type: "damage_vulnerability",
        value: normalizedSubtype(m).toLowerCase(),
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    if (
      m.type === "set-base" &&
      m.subType &&
      /speed|movement|walk|fly|swim|climb|burrow/.test(m.subType)
    ) {
      grants.push({
        id: idFor("ddb_speed", m, index),
        type: "speed",
        value: { [m.subType.replace(/-/g, "_")]: m.value },
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    if (
      m.type === "bonus" &&
      m.subType &&
      /speed|movement|walk|fly|swim|climb|burrow/.test(m.subType)
    ) {
      grants.push({
        id: idFor("ddb_speed_bonus", m, index),
        type: "speed_bonus",
        value: { [m.subType.replace(/-/g, "_")]: m.value },
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    if (m.type === "proficiency" && m.subType && /armor|shield/.test(m.subType)) {
      grants.push({
        id: idFor("ddb_armor_proficiency", m, index),
        type: "armor_proficiency",
        value: normalizedSubtype(m),
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    if (m.type === "proficiency" && m.subType && /weapon/.test(m.subType)) {
      grants.push({
        id: idFor("ddb_weapon_proficiency", m, index),
        type: "weapon_proficiency",
        value: normalizedSubtype(m),
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    if (
      m.type === "proficiency" &&
      m.subType &&
      /tool|artisan|instrument|gaming|vehicle/.test(m.subType)
    ) {
      grants.push({
        id: idFor("ddb_tool_proficiency", m, index),
        type: "tool_proficiency",
        value: normalizedSubtype(m),
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    if ((m.type === "weapon-mastery" || m.subType?.includes("weapon-mastery")) && m.subType) {
      grants.push({
        id: idFor("ddb_weapon_mastery", m, index),
        type: "weapon_mastery",
        value: normalizedSubtype(m),
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }

    if (m.type === "grant" && m.subType) {
      grants.push({
        id: idFor("ddb_feature_reference", m, index),
        type: "feature_reference",
        value: {
          name: normalizedSubtype(m),
          description: m.friendlyTypeName || "",
          source: "other",
          sourceName: source,
        },
        mode: "fixed",
        sourceEntity: source,
        provenance,
      });
    }
  }

  const dedupe = new Map<string, RuleGrant>();
  for (const grant of grants) {
    dedupe.set(`${grant.type}:${JSON.stringify(grant.value)}:${grant.sourceEntity}`, grant);
  }
  return Array.from(dedupe.values());
}
