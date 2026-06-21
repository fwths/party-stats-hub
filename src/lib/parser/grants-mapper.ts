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
    if (
      m.type === "set-base" &&
      m.subType &&
      /vision|sight|blindsight|tremorsense/.test(m.subType)
    ) {
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

  // OVERLAP RESOLUTION
  const finalGrants: RuleGrant[] = [];
  const seenSkills = new Set<string>();
  const seenExpertise = new Set<string>();
  const seenSaves = new Set<string>();
  const seenLanguages = new Set<string>();
  const seenResistances = new Set<string>();
  const seenImmunities = new Set<string>();
  const seenCondImmunities = new Set<string>();

  // Senses grouping by vision type (e.g. "darkvision") to find max range
  const maxSenses = new Map<string, { grant: RuleGrant; range: number }>();

  // Speed base-setting grouping (max base) and bonuses grouping (sum bonuses)
  const maxBaseSpeeds = new Map<string, { grant: RuleGrant; value: number }>();
  const sumSpeedBonuses = new Map<string, { grant: RuleGrant; value: number }>();

  // Process grants
  for (const g of grants) {
    if (g.type === "skill_proficiency") {
      const skill = String(g.value).toLowerCase();
      if (seenSkills.has(skill)) continue;
      seenSkills.add(skill);
    } else if (g.type === "skill_expertise") {
      const skill = String(g.value).toLowerCase();
      if (seenExpertise.has(skill)) continue;
      seenExpertise.add(skill);
      seenSkills.add(skill); // Expertise implies proficiency
    } else if (g.type === "save_proficiency") {
      const save = String(g.value).toLowerCase();
      if (seenSaves.has(save)) continue;
      seenSaves.add(save);
    } else if (g.type === "language") {
      const lang = String(g.value).toLowerCase();
      if (seenLanguages.has(lang)) continue;
      seenLanguages.add(lang);
    } else if (g.type === "damage_resistance") {
      const res = String(g.value).toLowerCase();
      if (seenResistances.has(res)) continue;
      seenResistances.add(res);
    } else if (g.type === "damage_immunity") {
      const imm = String(g.value).toLowerCase();
      if (seenImmunities.has(imm)) continue;
      seenImmunities.add(imm);
    } else if (g.type === "condition_immunity") {
      const cond = String(g.value).toLowerCase();
      if (seenCondImmunities.has(cond)) continue;
      seenCondImmunities.add(cond);
    } else if (g.type === "sense") {
      const senseStr = String(g.value).toLowerCase();
      const match = senseStr.match(/([a-z\s]+)\s+(\d+)/i);
      if (match) {
        const type = match[1].trim();
        const range = Number(match[2]);
        const existing = maxSenses.get(type);
        if (!existing || range > existing.range) {
          maxSenses.set(type, { grant: g, range });
        }
      } else {
        maxSenses.set(senseStr, { grant: g, range: 0 });
      }
      continue;
    } else if (g.type === "speed") {
      const speedObj = g.value as Record<string, number>;
      for (const [type, val] of Object.entries(speedObj)) {
        const existing = maxBaseSpeeds.get(type);
        if (!existing || val > existing.value) {
          maxBaseSpeeds.set(type, { grant: g, value: val });
        }
      }
      continue;
    } else if (g.type === "speed_bonus") {
      const speedObj = g.value as Record<string, number>;
      for (const [type, val] of Object.entries(speedObj)) {
        const existing = sumSpeedBonuses.get(type);
        if (!existing) {
          sumSpeedBonuses.set(type, { grant: g, value: val });
        } else {
          existing.value += val;
        }
      }
      continue;
    }

    finalGrants.push(g);
  }

  // Add handled senses and speeds back to list
  for (const s of maxSenses.values()) {
    finalGrants.push(s.grant);
  }
  for (const [type, entry] of maxBaseSpeeds.entries()) {
    finalGrants.push({
      ...entry.grant,
      value: { [type]: entry.value },
    });
  }
  for (const [type, entry] of sumSpeedBonuses.entries()) {
    finalGrants.push({
      ...entry.grant,
      value: { [type]: entry.value },
    });
  }

  // Deduplicate identical grants remaining
  const dedupe = new Map<string, RuleGrant>();
  for (const grant of finalGrants) {
    dedupe.set(`${grant.type}:${JSON.stringify(grant.value)}:${grant.sourceEntity}`, grant);
  }
  return Array.from(dedupe.values());
}
