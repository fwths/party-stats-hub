export function validateWizardSpellbook(
  character: any,
  wizardLevel: number,
  selectedSpells: any[],
): { isValid: boolean; reason?: string } {
  if (wizardLevel <= 0) return { isValid: true };

  // A wizard starts with 6 spells at level 1, and learns 2 more per level.
  const maxSpells = 6 + 2 * (wizardLevel - 1);

  // Count first level or higher spells selected specifically for Wizard class
  const wizardSpells = selectedSpells.filter(
    (s) => Number(s.level || 0) > 0 && (!s.classId || s.classId === "wizard"),
  );

  if (wizardSpells.length > maxSpells) {
    return {
      isValid: false,
      reason: `Wizard level ${wizardLevel} spellbook has ${wizardSpells.length} spells, exceeding the level limit of ${maxSpells} (excluding custom scribed spells).`,
    };
  }

  return { isValid: true };
}

export function validateWarlockMysticArcanum(
  warlockLevel: number,
  selectedSpells: any[],
): { isValid: boolean; reason?: string } {
  if (warlockLevel < 11) return { isValid: true };

  // Warlock Mystic Arcanum spell slots are unlocked at levels 11 (6th), 13 (7th), 15 (8th), and 17 (9th).
  const expectedArcanums: number[] = [];
  if (warlockLevel >= 11) expectedArcanums.push(6);
  if (warlockLevel >= 13) expectedArcanums.push(7);
  if (warlockLevel >= 15) expectedArcanums.push(8);
  if (warlockLevel >= 17) expectedArcanums.push(9);

  const arcanumSpells = selectedSpells.filter(
    (s) => expectedArcanums.includes(Number(s.level || 0)) && s.isMysticArcanum,
  );

  if (arcanumSpells.length < expectedArcanums.length) {
    return {
      isValid: false,
      reason: `Warlock level ${warlockLevel} requires selecting ${expectedArcanums.length} Mystic Arcanum spells (levels ${expectedArcanums.join(", ")}).`,
    };
  }

  return { isValid: true };
}

export function validateDruidWildShape(
  druidLevel: number,
  subclassId: string | null,
  wildShapeBeasts: any[], // selected beast custom structures
): { isValid: boolean; reason?: string } {
  if (druidLevel < 2) return { isValid: true };

  const isMoonDruid = subclassId === "circle-of-the-moon";

  // CR Limit checks
  // Circle of the Moon: level 2-5 is CR 1; level 6+ is CR level/3
  // Other Druids: level 2-3 is CR 1/4; level 4-7 is CR 1/2; level 8+ is CR 1
  let maxCr = 0.25;
  if (isMoonDruid) {
    maxCr = druidLevel >= 6 ? Math.floor(druidLevel / 3) : 1.0;
  } else {
    if (druidLevel >= 8) maxCr = 1.0;
    else if (druidLevel >= 4) maxCr = 0.5;
  }

  for (const beast of wildShapeBeasts) {
    const cr = Number(beast.challengeRating || beast.cr || 0);
    if (cr > maxCr) {
      return {
        isValid: false,
        reason: `Wild Shape selection ${beast.name} has CR ${cr}, which exceeds your Druid level limit of CR ${maxCr}.`,
      };
    }
  }

  return { isValid: true };
}
