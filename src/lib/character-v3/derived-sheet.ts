import { CharacterAggregateSchema, type CharacterAggregate } from "./schema";

export const DERIVED_SHEET_COMPILER_VERSION = "v3-derived-sheet/1";

export type Ability = keyof CharacterAggregate["build"]["abilityBasis"]["baseScores"];

export function effectiveAbilityScores(raw: unknown): Record<Ability, number> {
  const character = CharacterAggregateSchema.parse(raw);
  const scores = { ...character.build.abilityBasis.baseScores };
  for (const decision of character.build.decisions) {
    if (decision.type !== "ability-score-increase" || decision.provenance !== "native") continue;
    for (const increase of decision.increases) scores[increase.ability] += increase.amount;
  }
  return scores;
}

export type DerivedNumber = {
  value: number;
  formula: string;
  sourcePaths: string[];
};

export type CharacterV3DerivedFoundation = {
  compilerVersion: typeof DERIVED_SHEET_COMPILER_VERSION;
  characterId: string;
  buildRevision: number;
  characterLevel: number;
  proficiencyBonus: DerivedNumber;
  abilityModifiers: Record<Ability, DerivedNumber>;
  baseInitiative: DerivedNumber;
  initiative:
    | { status: "unavailable"; reason: string }
    | { status: "imported-baseline"; sourceSystem: "ddb"; value: DerivedNumber };
  armorClass:
    | { status: "unavailable"; reason: string }
    | { status: "imported-baseline"; sourceSystem: "ddb"; value: DerivedNumber };
  passiveScores:
    | { status: "unavailable"; reason: string }
    | {
        status: "imported-baseline";
        sourceSystem: "ddb";
        values: {
          perception: DerivedNumber;
          investigation: DerivedNumber;
          insight: DerivedNumber;
        };
      };
  skills:
    | { status: "unavailable"; reason: string }
    | {
        status: "imported-baseline";
        sourceSystem: "ddb";
        values: Array<{
          key: string;
          name: string;
          ability: Ability;
          modifier: DerivedNumber;
          proficiency: "none" | "half" | "proficient" | "expertise";
        }>;
      };
  senses:
    | { status: "unavailable"; reason: string }
    | {
        status: "imported-baseline";
        sourceSystem: "ddb";
        values: Array<{ name: string; range: DerivedNumber | null; sourcePaths: string[] }>;
      };
  defenses:
    | { status: "unavailable"; reason: string }
    | {
        status: "imported-baseline";
        sourceSystem: "ddb";
        values: Array<{
          type: "resistance" | "immunity" | "vulnerability" | "condition_immunity";
          damageType: string;
          sourcePaths: string[];
        }>;
      };
  proficiencies:
    | { status: "unavailable"; reason: string }
    | {
        status: "imported-baseline";
        sourceSystem: "ddb";
        languages: Array<{ value: string; sourcePaths: string[] }>;
        tools: Array<{ value: string; sourcePaths: string[] }>;
        armor: Array<{ value: string; sourcePaths: string[] }>;
        weapons: Array<{ value: string; sourcePaths: string[] }>;
      };
  actions:
    | { status: "unavailable"; reason: string }
    | {
        status: "imported-baseline";
        sourceSystem: "ddb";
        values: Array<
          CharacterAggregate["profile"]["actions"]["values"][number] & { sourcePaths: string[] }
        >;
      };
  attacks:
    | { status: "unavailable"; reason: string }
    | {
        status: "imported-baseline";
        sourceSystem: "ddb";
        values: Array<
          Omit<CharacterAggregate["profile"]["attacks"]["values"][number], "attackBonus"> & {
            attackBonus: DerivedNumber;
            sourcePaths: string[];
          }
        >;
      };
  features:
    | { status: "unavailable"; reason: string }
    | {
        status: "imported-baseline";
        sourceSystem: "ddb";
        values: Array<
          CharacterAggregate["profile"]["features"]["values"][number] & {
            sourcePaths: string[];
          }
        >;
        feats: Array<
          CharacterAggregate["profile"]["features"]["feats"][number] & {
            sourcePaths: string[];
          }
        >;
      };
  encumbrance:
    | { status: "unavailable"; reason: string }
    | {
        status: "imported-baseline";
        sourceSystem: "ddb";
        weightCarried: DerivedNumber;
        carryingCapacity: DerivedNumber;
        remainingCapacity: DerivedNumber;
      };
  movement:
    | { status: "unavailable"; reason: string }
    | {
        status: "imported-baseline";
        sourceSystem: "ddb";
        speeds: Array<{ type: "Walk" | "Fly" | "Swim" | "Climb" | "Burrow"; value: DerivedNumber }>;
      };
  savingThrows:
    | { status: "unavailable"; reason: string }
    | {
        status: "derived";
        sourceVersionKey: string;
        values: Record<Ability, DerivedNumber & { proficient: boolean }>;
      };
  totalSavingThrows:
    | { status: "unavailable"; reason: string }
    | {
        status: "imported-baseline";
        sourceSystem: "ddb";
        values: Partial<
          Record<
            Ability,
            DerivedNumber & { proficiency: "none" | "proficient" | "expertise" }
          >
        >;
      };
  spellcasting:
    | { status: "none"; reason: string }
    | { status: "unavailable"; reason: string }
    | {
        status: "derived";
        classes: Array<{
          classVersionKey: string;
          className: string;
          ability: Ability;
          spellSaveDc: DerivedNumber;
          spellAttackBonus: DerivedNumber;
        }>;
      };
  totalSpellcasting:
    | { status: "none"; reason: string }
    | {
        status: "imported-baseline";
        sourceSystem: "ddb";
        values: Array<{
          className: string;
          ability: Ability;
          spellSaveDc: DerivedNumber;
          spellAttackBonus: DerivedNumber;
        }>;
      };
};

export type DerivedClassCatalogRecord = {
  id: string;
  sourceId: string;
  contentRevision: string;
  proficienciesJson: string | null;
  spellcastingJson?: string | null;
};

const ABILITIES: Ability[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export function proficiencyBonusForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 20) {
    throw new Error("Character level must be an integer from 1 through 20");
  }
  return 2 + Math.floor((level - 1) / 4);
}

export function abilityModifier(score: number): number {
  if (!Number.isInteger(score)) throw new Error("Ability score must be an integer");
  return Math.floor((score - 10) / 2);
}

function deriveMovement(character: CharacterAggregate): CharacterV3DerivedFoundation["movement"] {
  const movement = character.profile.movement;
  const speeds: Extract<
    CharacterV3DerivedFoundation["movement"],
    { status: "imported-baseline" }
  >["speeds"] = [];
  if (movement.walk !== null) {
    speeds.push({
      type: "Walk",
      value: {
        value: movement.walk,
        formula: "DDB imported current sheet walking speed",
        sourcePaths: ["profile.movement.walk"],
      },
    });
  }
  for (const [index, speed] of movement.special.entries()) {
    speeds.push({
      type: speed.type,
      value: {
        value: speed.value,
        formula: "DDB imported current sheet special speed",
        sourcePaths: [`profile.movement.special.${index}`],
      },
    });
  }
  if (speeds.length === 0) {
    return { status: "unavailable", reason: "No imported movement snapshot is available" };
  }
  return { status: "imported-baseline", sourceSystem: movement.sourceSystem, speeds };
}

function deriveArmorClass(
  character: CharacterAggregate,
): CharacterV3DerivedFoundation["armorClass"] {
  const armorClass = character.profile.armorClass;
  if (armorClass.value === null) {
    return { status: "unavailable", reason: "No imported armor class snapshot is available" };
  }
  return {
    status: "imported-baseline",
    sourceSystem: armorClass.sourceSystem,
    value: {
      value: armorClass.value,
      formula: "DDB imported current sheet armor class",
      sourcePaths: ["profile.armorClass.value"],
    },
  };
}

function deriveInitiative(
  character: CharacterAggregate,
): CharacterV3DerivedFoundation["initiative"] {
  const initiative = character.profile.initiative;
  if (initiative.value === null) {
    return { status: "unavailable", reason: "No imported initiative snapshot is available" };
  }
  return {
    status: "imported-baseline",
    sourceSystem: initiative.sourceSystem,
    value: {
      value: initiative.value,
      formula: "DDB imported current sheet initiative",
      sourcePaths: ["profile.initiative.value"],
    },
  };
}

function derivePassiveScores(
  character: CharacterAggregate,
): CharacterV3DerivedFoundation["passiveScores"] {
  const passiveScores = character.profile.passiveScores;
  if (
    passiveScores.perception === null ||
    passiveScores.investigation === null ||
    passiveScores.insight === null
  ) {
    return { status: "unavailable", reason: "No complete imported passive score snapshot is available" };
  }
  return {
    status: "imported-baseline",
    sourceSystem: passiveScores.sourceSystem,
    values: {
      perception: {
        value: passiveScores.perception,
        formula: "DDB imported current sheet passive Perception",
        sourcePaths: ["profile.passiveScores.perception"],
      },
      investigation: {
        value: passiveScores.investigation,
        formula: "DDB imported current sheet passive Investigation",
        sourcePaths: ["profile.passiveScores.investigation"],
      },
      insight: {
        value: passiveScores.insight,
        formula: "DDB imported current sheet passive Insight",
        sourcePaths: ["profile.passiveScores.insight"],
      },
    },
  };
}

function deriveSkills(character: CharacterAggregate): CharacterV3DerivedFoundation["skills"] {
  const skills = character.profile.skills;
  if (skills.values.length === 0) {
    return { status: "unavailable", reason: "No imported skill snapshot is available" };
  }
  return {
    status: "imported-baseline",
    sourceSystem: skills.sourceSystem,
    values: skills.values.map((skill, index) => ({
      key: skill.key,
      name: skill.name,
      ability: skill.ability,
      proficiency: skill.proficiency,
      modifier: {
        value: skill.modifier,
        formula: "DDB imported current sheet skill modifier",
        sourcePaths: [`profile.skills.values.${index}.modifier`],
      },
    })),
  };
}

function deriveSenses(character: CharacterAggregate): CharacterV3DerivedFoundation["senses"] {
  const senses = character.profile.senses;
  if (senses.values.length === 0) {
    return { status: "unavailable", reason: "No imported senses snapshot is available" };
  }
  return {
    status: "imported-baseline",
    sourceSystem: senses.sourceSystem,
    values: senses.values.map((sense, index) => ({
      name: sense.name,
      range:
        sense.value === null
          ? null
          : {
              value: sense.value,
              formula: "DDB imported current sheet sense range",
              sourcePaths: [`profile.senses.values.${index}.value`],
            },
      sourcePaths: [`profile.senses.values.${index}`],
    })),
  };
}

function deriveDefenses(character: CharacterAggregate): CharacterV3DerivedFoundation["defenses"] {
  const defenses = character.profile.defenses;
  if (defenses.values.length === 0) {
    return { status: "unavailable", reason: "No imported defenses snapshot is available" };
  }
  return {
    status: "imported-baseline",
    sourceSystem: defenses.sourceSystem,
    values: defenses.values.map((defense, index) => ({
      type: defense.type,
      damageType: defense.damageType,
      sourcePaths: [`profile.defenses.values.${index}`],
    })),
  };
}

function deriveProficiencies(
  character: CharacterAggregate,
): CharacterV3DerivedFoundation["proficiencies"] {
  const proficiencies = character.profile.proficiencies;
  if (
    proficiencies.languages.length === 0 &&
    proficiencies.tools.length === 0 &&
    proficiencies.armor.length === 0 &&
    proficiencies.weapons.length === 0
  ) {
    return { status: "unavailable", reason: "No imported proficiency snapshot is available" };
  }
  const trace = (values: string[], path: string) =>
    values.map((value, index) => ({ value, sourcePaths: [`${path}.${index}`] }));
  return {
    status: "imported-baseline",
    sourceSystem: proficiencies.sourceSystem,
    languages: trace(proficiencies.languages, "profile.proficiencies.languages"),
    tools: trace(proficiencies.tools, "profile.proficiencies.tools"),
    armor: trace(proficiencies.armor, "profile.proficiencies.armor"),
    weapons: trace(proficiencies.weapons, "profile.proficiencies.weapons"),
  };
}

function deriveActions(character: CharacterAggregate): CharacterV3DerivedFoundation["actions"] {
  const actions = character.profile.actions;
  if (actions.values.length === 0) {
    return { status: "unavailable", reason: "No imported action snapshot is available" };
  }
  return {
    status: "imported-baseline",
    sourceSystem: actions.sourceSystem,
    values: actions.values.map((action, index) => ({
      ...action,
      sourcePaths: [`profile.actions.values.${index}`],
    })),
  };
}

function deriveAttacks(character: CharacterAggregate): CharacterV3DerivedFoundation["attacks"] {
  const attacks = character.profile.attacks;
  if (attacks.values.length === 0) {
    return { status: "unavailable", reason: "No imported attack snapshot is available" };
  }
  return {
    status: "imported-baseline",
    sourceSystem: attacks.sourceSystem,
    values: attacks.values.map((attack, index) => ({
      ...attack,
      attackBonus: {
        value: attack.attackBonus,
        formula: "DDB imported current sheet attack bonus",
        sourcePaths: [`profile.attacks.values.${index}.attackBonus`],
      },
      sourcePaths: [`profile.attacks.values.${index}`],
    })),
  };
}

function deriveFeatures(character: CharacterAggregate): CharacterV3DerivedFoundation["features"] {
  const features = character.profile.features;
  if (features.values.length === 0 && features.feats.length === 0) {
    return { status: "unavailable", reason: "No imported feature snapshot is available" };
  }
  return {
    status: "imported-baseline",
    sourceSystem: features.sourceSystem,
    values: features.values.map((feature, index) => ({
      ...feature,
      sourcePaths: [`profile.features.values.${index}`],
    })),
    feats: features.feats.map((feat, index) => ({
      ...feat,
      sourcePaths: [`profile.features.feats.${index}`],
    })),
  };
}

function deriveEncumbrance(
  character: CharacterAggregate,
): CharacterV3DerivedFoundation["encumbrance"] {
  const encumbrance = character.profile.encumbrance;
  if (encumbrance.weightCarried === null || encumbrance.carryingCapacity === null) {
    return { status: "unavailable", reason: "No complete imported encumbrance snapshot is available" };
  }
  return {
    status: "imported-baseline",
    sourceSystem: encumbrance.sourceSystem,
    weightCarried: {
      value: encumbrance.weightCarried,
      formula: "DDB imported current sheet carried weight",
      sourcePaths: ["profile.encumbrance.weightCarried"],
    },
    carryingCapacity: {
      value: encumbrance.carryingCapacity,
      formula: "DDB imported current sheet carrying capacity",
      sourcePaths: ["profile.encumbrance.carryingCapacity"],
    },
    remainingCapacity: {
      value: Math.max(0, encumbrance.carryingCapacity - encumbrance.weightCarried),
      formula: "max(0, carryingCapacity - weightCarried)",
      sourcePaths: [
        "profile.encumbrance.carryingCapacity",
        "profile.encumbrance.weightCarried",
      ],
    },
  };
}

function deriveSavingThrows(
  character: CharacterAggregate,
  proficiencyBonus: number,
  abilityModifiers: Record<Ability, DerivedNumber>,
  catalog: DerivedClassCatalogRecord[],
): CharacterV3DerivedFoundation["savingThrows"] {
  const startingClass = character.build.levels[0].classRef;
  const record = catalog.find(
    (candidate) =>
      candidate.id === startingClass.upstreamId &&
      candidate.sourceId === startingClass.sourceId &&
      candidate.contentRevision === startingClass.contentRevision,
  );
  if (!record?.proficienciesJson) {
    return {
      status: "unavailable",
      reason: "Exact starting-class saving throw catalog data is unavailable",
    };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(record.proficienciesJson);
  } catch {
    return { status: "unavailable", reason: "Starting-class proficiency data is invalid JSON" };
  }
  const saves =
    raw && typeof raw === "object" && "savingThrows" in raw
      ? (raw as { savingThrows?: unknown }).savingThrows
      : null;
  if (
    !Array.isArray(saves) ||
    saves.length !== 2 ||
    !saves.every((save): save is Ability => ABILITIES.includes(save as Ability)) ||
    new Set(saves).size !== saves.length
  ) {
    return {
      status: "unavailable",
      reason: "Starting-class proficiency data must declare two unique V3 abilities",
    };
  }
  const proficient = new Set<Ability>(saves);
  return {
    status: "derived",
    sourceVersionKey: startingClass.versionKey,
    values: Object.fromEntries(
      ABILITIES.map((ability) => [
        ability,
        {
          value: abilityModifiers[ability].value + (proficient.has(ability) ? proficiencyBonus : 0),
          proficient: proficient.has(ability),
          formula: proficient.has(ability)
            ? "ability modifier + proficiency bonus"
            : "ability modifier",
          sourcePaths: [
            ...abilityModifiers[ability].sourcePaths,
            ...(proficient.has(ability) ? ["build.levels.0.classRef", "build.levels"] : []),
          ],
        },
      ]),
    ) as Record<Ability, DerivedNumber & { proficient: boolean }>,
  };
}

function deriveTotalSavingThrows(
  character: CharacterAggregate,
): CharacterV3DerivedFoundation["totalSavingThrows"] {
  const savingThrows = character.profile.savingThrows;
  if (savingThrows.values.length === 0) {
    return { status: "unavailable", reason: "No imported saving throw snapshot is available" };
  }
  const values: Extract<
    CharacterV3DerivedFoundation["totalSavingThrows"],
    { status: "imported-baseline" }
  >["values"] = {};
  savingThrows.values.forEach((save, index) => {
    values[save.ability] = {
      value: save.modifier,
      proficiency: save.proficiency,
      formula: "DDB imported current sheet saving throw modifier",
      sourcePaths: [`profile.savingThrows.values.${index}.modifier`],
    };
  });
  return { status: "imported-baseline", sourceSystem: savingThrows.sourceSystem, values };
}

function parseSpellcastingAbility(spellcastingJson: string | null | undefined): Ability | null {
  if (!spellcastingJson) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(spellcastingJson);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const candidates = [
    record.ability,
    record.spellcastingAbility,
    record.spellcastingAbilityAbbreviation,
    record.spellcastingAbilityId,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const normalized = candidate.trim().toUpperCase();
      if (ABILITIES.includes(normalized as Ability)) return normalized as Ability;
    }
    if (typeof candidate === "number") {
      const fromDdbId = ({ 1: "STR", 2: "DEX", 3: "CON", 4: "INT", 5: "WIS", 6: "CHA" } as const)[
        candidate as 1 | 2 | 3 | 4 | 5 | 6
      ];
      if (fromDdbId) return fromDdbId;
    }
  }
  return null;
}

function deriveSpellcasting(
  character: CharacterAggregate,
  proficiencyBonus: number,
  abilityModifiers: Record<Ability, DerivedNumber>,
  catalog: DerivedClassCatalogRecord[],
): CharacterV3DerivedFoundation["spellcasting"] {
  const classRefs = [
    ...new Map(character.build.levels.map((level) => [level.classRef.versionKey, level.classRef]))
      .values(),
  ];
  const spellcastingClasses = classRefs.filter((classRef) =>
    character.build.spells.some((spell) => spell.classVersionKey === classRef.versionKey),
  );
  if (spellcastingClasses.length === 0) {
    return { status: "none", reason: "No class spell selections are present" };
  }
  const classes: Extract<CharacterV3DerivedFoundation["spellcasting"], { status: "derived" }>["classes"] =
    [];
  for (const classRef of spellcastingClasses) {
    const record = catalog.find(
      (candidate) =>
        candidate.id === classRef.upstreamId &&
        candidate.sourceId === classRef.sourceId &&
        candidate.contentRevision === classRef.contentRevision,
    );
    const ability = parseSpellcastingAbility(record?.spellcastingJson);
    if (!ability) {
      return {
        status: "unavailable",
        reason: `Exact spellcasting ability catalog data is unavailable for ${classRef.name}`,
      };
    }
    const modifier = abilityModifiers[ability];
    classes.push({
      classVersionKey: classRef.versionKey,
      className: classRef.name,
      ability,
      spellSaveDc: {
        value: 8 + proficiencyBonus + modifier.value,
        formula: "8 + proficiency bonus + spellcasting ability modifier",
        sourcePaths: ["build.levels", ...modifier.sourcePaths, "build.spells"],
      },
      spellAttackBonus: {
        value: proficiencyBonus + modifier.value,
        formula: "proficiency bonus + spellcasting ability modifier",
        sourcePaths: ["build.levels", ...modifier.sourcePaths, "build.spells"],
      },
    });
  }
  return { status: "derived", classes };
}

function deriveTotalSpellcasting(
  character: CharacterAggregate,
): CharacterV3DerivedFoundation["totalSpellcasting"] {
  const totals = character.profile.spellcastingTotals;
  if (totals.values.length === 0) {
    return { status: "none", reason: "No imported spellcasting totals are available" };
  }
  return {
    status: "imported-baseline",
    sourceSystem: totals.sourceSystem,
    values: totals.values.map((entry, index) => ({
      className: entry.className,
      ability: entry.ability,
      spellSaveDc: {
        value: entry.saveDc,
        formula: "DDB imported current sheet spell save DC",
        sourcePaths: [`profile.spellcastingTotals.values.${index}.saveDc`],
      },
      spellAttackBonus: {
        value: entry.attackBonus,
        formula: "DDB imported current sheet spell attack bonus",
        sourcePaths: [`profile.spellcastingTotals.values.${index}.attackBonus`],
      },
    })),
  };
}

export function deriveCharacterV3Foundation(
  raw: unknown,
  classCatalog: DerivedClassCatalogRecord[] = [],
): CharacterV3DerivedFoundation {
  const character = CharacterAggregateSchema.parse(raw);
  const characterLevel = character.build.levels.length;
  const effectiveScores = effectiveAbilityScores(character);
  const abilityModifiers = Object.fromEntries(
    ABILITIES.map((ability) => {
      const score = effectiveScores[ability];
      return [
        ability,
        {
          value: abilityModifier(score),
          formula: "floor((score - 10) / 2)",
          sourcePaths: ["build.abilityBasis.baseScores." + ability, "build.decisions"],
        },
      ];
    }),
  ) as Record<Ability, DerivedNumber>;

  const proficiencyBonus = proficiencyBonusForLevel(characterLevel);
  return {
    compilerVersion: DERIVED_SHEET_COMPILER_VERSION,
    characterId: character.identity.id,
    buildRevision: character.build.revision,
    characterLevel,
    proficiencyBonus: {
      value: proficiencyBonus,
      formula: "2 + floor((characterLevel - 1) / 4)",
      sourcePaths: ["build.levels"],
    },
    abilityModifiers,
    baseInitiative: {
      value: abilityModifiers.DEX.value,
      formula: "Dexterity modifier before feature, item, or condition modifiers",
      sourcePaths: abilityModifiers.DEX.sourcePaths,
    },
    initiative: deriveInitiative(character),
    armorClass: deriveArmorClass(character),
    passiveScores: derivePassiveScores(character),
    skills: deriveSkills(character),
    senses: deriveSenses(character),
    defenses: deriveDefenses(character),
    proficiencies: deriveProficiencies(character),
    actions: deriveActions(character),
    attacks: deriveAttacks(character),
    features: deriveFeatures(character),
    encumbrance: deriveEncumbrance(character),
    movement: deriveMovement(character),
    savingThrows: deriveSavingThrows(character, proficiencyBonus, abilityModifiers, classCatalog),
    totalSavingThrows: deriveTotalSavingThrows(character),
    spellcasting: deriveSpellcasting(character, proficiencyBonus, abilityModifiers, classCatalog),
    totalSpellcasting: deriveTotalSpellcasting(character),
  };
}
