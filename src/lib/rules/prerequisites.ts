export const MULTICLASS_PREREQS: Record<string, (stats: Record<string, number>) => boolean> = {
  barbarian: (s) => (s.STR || 0) >= 13,
  bard: (s) => (s.CHA || 0) >= 13,
  cleric: (s) => (s.WIS || 0) >= 13,
  druid: (s) => (s.WIS || 0) >= 13,
  fighter: (s) => (s.STR || 0) >= 13 || (s.DEX || 0) >= 13,
  monk: (s) => (s.DEX || 0) >= 13 && (s.WIS || 0) >= 13,
  paladin: (s) => (s.STR || 0) >= 13 && (s.CHA || 0) >= 13,
  ranger: (s) => (s.DEX || 0) >= 13 && (s.WIS || 0) >= 13,
  rogue: (s) => (s.DEX || 0) >= 13,
  sorcerer: (s) => (s.CHA || 0) >= 13,
  warlock: (s) => (s.CHA || 0) >= 13,
  wizard: (s) => (s.INT || 0) >= 13,
  artificer: (s) => (s.INT || 0) >= 13,
};

export function validateMulticlassStats(
  stats: Record<string, number>,
  primaryClassId: string,
  targetClassId: string,
): { isValid: boolean; reason?: string } {
  // Checks both primary class and target class prereqs
  const checkPrimary = MULTICLASS_PREREQS[primaryClassId.toLowerCase()];
  const checkTarget = MULTICLASS_PREREQS[targetClassId.toLowerCase()];

  if (checkPrimary && !checkPrimary(stats)) {
    return {
      isValid: false,
      reason: `You do not meet the primary class (${primaryClassId}) prerequisites to multiclass.`,
    };
  }

  if (checkTarget && !checkTarget(stats)) {
    return {
      isValid: false,
      reason: `You do not meet the prerequisites to multiclass into ${targetClassId}.`,
    };
  }

  return { isValid: true };
}

export function validateFeatPrerequisites(
  feat: any,
  characterLevel: number,
  finalScores: Record<string, number>,
  proficiencies: { armor: string[]; weapons: string[]; tools: string[] },
  hasSpellcasting: boolean,
): { isValid: boolean; reason?: string } {
  const name = feat.name || "Feat";

  // 1. Level Gate
  const levelReq = Number(feat.levelRequirement || feat.level_requirement || 0);
  if (levelReq > 0 && characterLevel < levelReq) {
    return {
      isValid: false,
      reason: `${name} requires character level ${levelReq} (current is ${characterLevel}).`,
    };
  }

  // Parse structured prereqs JSON if it exists
  let prereqs: any = null;
  if (feat.prerequisitesJson) {
    try {
      prereqs =
        typeof feat.prerequisitesJson === "string"
          ? JSON.parse(feat.prerequisitesJson)
          : feat.prerequisitesJson;
    } catch {
      // Ignored
    }
  }

  if (!prereqs) return { isValid: true };

  // 2. Ability Scores Requirements
  if (Array.isArray(prereqs.ability)) {
    for (const req of prereqs.ability) {
      for (const [ab, val] of Object.entries(req)) {
        const abKey = ab.toUpperCase();
        const score = finalScores[abKey] || 0;
        const requiredVal = Number(val || 0);
        if (score < requiredVal) {
          return {
            isValid: false,
            reason: `${name} requires an ability score of ${requiredVal} in ${abKey} (current is ${score}).`,
          };
        }
      }
    }
  }

  // 3. Spellcasting Requirement
  if (prereqs.spellcasting && !hasSpellcasting) {
    return {
      isValid: false,
      reason: `${name} requires the ability to cast at least one spell.`,
    };
  }

  // 4. Armor Proficiencies
  if (Array.isArray(prereqs.armorProficiency)) {
    for (const arm of prereqs.armorProficiency) {
      if (!proficiencies.armor.map((a) => a.toLowerCase()).includes(arm.toLowerCase())) {
        return {
          isValid: false,
          reason: `${name} requires proficiency in ${arm} armor.`,
        };
      }
    }
  }

  return { isValid: true };
}
