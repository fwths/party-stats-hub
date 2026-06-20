export type RuleGrantType =
  | "ability_score_bonus"
  | "skill_proficiency"
  | "skill_expertise"
  | "tool_proficiency"
  | "weapon_proficiency"
  | "armor_proficiency"
  | "language"
  | "sense"
  | "speed"
  | "size"
  | "condition_immunity"
  | "damage_resistance"
  | "damage_immunity"
  | "damage_vulnerability"
  | "save_proficiency"
  | "spell_known"
  | "spell_prepared"
  | "spellcasting_feature"
  | "action"
  | "bonus_action"
  | "reaction"
  | "resource"
  | "item_grant"
  | "weapon_mastery"
  | "active_effect"
  | "feature_reference"
  | "armor_class_bonus"
  | "ability_override"
  | "speed_bonus";

export type RuleGrantMode = "fixed" | "choose" | "derived" | "scaling";

export interface RuleGrant {
  id: string;
  type: RuleGrantType;
  value: any; // e.g., "STR", "stealth", "darkvision 60", 2, "fire"
  mode: RuleGrantMode;
  sourceEntity: string;
  level?: number;
  conditions?: string;
  provenance: string;
}

export function parseFoundryEffectsToGrants(
  foundryJsonStr: string | null | undefined,
  sourceEntity: string,
  provenance: string
): RuleGrant[] {
  if (!foundryJsonStr) return [];
  // Use a simple JSON.parse to avoid circular dependency with BuilderUtils
  let parsed: any;
  try {
    parsed = JSON.parse(foundryJsonStr);
  } catch (e) {
    return [];
  }
  if (!parsed) return [];

  const grants: RuleGrant[] = [];
  const effects = Array.isArray(parsed.effects) ? parsed.effects : [];
  for (const effect of effects) {
    if (effect.disabled === true) continue;
    const changes = Array.isArray(effect.changes) ? effect.changes : [];
    for (const change of changes) {
      const key = String(change.key || "");
      const rawValue = change.value;

      const parseValNum = (val: any): number => {
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          const parsedNum = parseInt(val, 10);
          return isNaN(parsedNum) ? 0 : parsedNum;
        }
        return 0;
      };

      // Senses
      const sensesMatch = key.match(/^system\.attributes\.senses\.([a-z]+)$/i);
      if (sensesMatch) {
        const senseType = sensesMatch[1].toLowerCase();
        const valNum = parseValNum(rawValue);
        const name =
          senseType === "darkvision"
            ? "Darkvision"
            : senseType === "blindsight"
              ? "Blindsight"
              : senseType === "truesight"
                ? "Truesight"
                : senseType.charAt(0).toUpperCase() + senseType.slice(1);
        grants.push({
          id: `${sourceEntity}_sense_${name}`,
          type: "sense",
          value: { [name]: valNum },
          mode: "fixed",
          sourceEntity,
          provenance,
        });
        continue;
      }
      // 1. Ability Scores
      const abilityMatch = key.match(/^system\.abilities\.([a-z]{3})\.value$/i);
      if (abilityMatch) {
        const ability = abilityMatch[1].toUpperCase();
        const valNum = parseValNum(rawValue);
        const modeNum = change.mode;
        if (modeNum === "OVERRIDE" || modeNum === 5 || modeNum === "UPGRADE" || modeNum === 4) {
          grants.push({
            id: `${sourceEntity}_ability_override_${ability}`,
            type: "ability_override",
            value: { [ability]: valNum },
            mode: "fixed",
            sourceEntity,
            provenance,
          });
        } else {
          grants.push({
            id: `${sourceEntity}_ability_bonus_${ability}`,
            type: "ability_score_bonus",
            value: { [ability]: valNum },
            mode: "fixed",
            sourceEntity,
            provenance,
          });
        }
        continue;
      }

      // 2. Armor Class
      if (key === "system.attributes.ac.bonus") {
        const valNum = parseValNum(rawValue);
        grants.push({
          id: `${sourceEntity}_ac_bonus`,
          type: "armor_class_bonus",
          value: valNum,
          mode: "fixed",
          sourceEntity,
          provenance,
        });
        continue;
      }

      // 3. Speed
      const movementMatch = key.match(/^system\.attributes\.movement\.([a-z]+)$/i);
      if (movementMatch) {
        const moveType = movementMatch[1].toLowerCase();
        const valNum = parseValNum(rawValue);
        grants.push({
          id: `${sourceEntity}_speed_bonus_${moveType}`,
          type: "speed_bonus",
          value: { [moveType]: valNum },
          mode: "fixed",
          sourceEntity,
          provenance,
        });
        continue;
      }

      const normalizeName = (val: any) => String(val || "").replace(/[^a-zA-Z0-9]/g, " ").trim().toLowerCase();

      // Defenses (Resistances/Immunities/Vulnerabilities/Conditions)
      if (key === "system.traits.dr.value" || key === "system.traits.dr") {
        const types = typeof rawValue === "string" ? [rawValue] : Array.isArray(rawValue) ? rawValue : [];
        for (const t of types) {
          grants.push({ id: `${sourceEntity}_dr_${normalizeName(t)}`, type: "damage_resistance", value: normalizeName(t), mode: "fixed", sourceEntity, provenance });
        }
        continue;
      }
      if (key === "system.traits.di.value") {
        const types = typeof rawValue === "string" ? [rawValue] : Array.isArray(rawValue) ? rawValue : [];
        for (const t of types) {
          grants.push({ id: `${sourceEntity}_di_${normalizeName(t)}`, type: "damage_immunity", value: normalizeName(t), mode: "fixed", sourceEntity, provenance });
        }
        continue;
      }
      if (key === "system.traits.dv.value") {
        const types = typeof rawValue === "string" ? [rawValue] : Array.isArray(rawValue) ? rawValue : [];
        for (const t of types) {
          grants.push({ id: `${sourceEntity}_dv_${normalizeName(t)}`, type: "damage_vulnerability", value: normalizeName(t), mode: "fixed", sourceEntity, provenance });
        }
        continue;
      }
      if (key === "system.traits.ci.value") {
        const types = typeof rawValue === "string" ? [rawValue] : Array.isArray(rawValue) ? rawValue : [];
        for (const t of types) {
          grants.push({ id: `${sourceEntity}_ci_${normalizeName(t)}`, type: "condition_immunity", value: normalizeName(t), mode: "fixed", sourceEntity, provenance });
        }
        continue;
      }
    }
  }
  return grants;
}
