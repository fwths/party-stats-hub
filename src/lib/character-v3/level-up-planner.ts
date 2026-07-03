import {
  CharacterAggregateSchema,
  CharacterDecisionSchema,
  type CharacterDecision,
  type ExactRuleRef,
} from "./schema";
import { effectiveAbilityScores, type Ability } from "./derived-sheet";

const ABILITIES: Ability[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const STANDARD_ASI_LEVELS = new Set([4, 8, 12, 16, 19]);
const FIGHTER_ASI_LEVELS = new Set([4, 6, 8, 12, 14, 16, 19]);
const ROGUE_ASI_LEVELS = new Set([4, 8, 10, 12, 16, 19]);

export type GeneralFeatCandidate = {
  ref: ExactRuleRef;
  compatibleWith2024: boolean;
  minimumCharacterLevel: number;
  prerequisiteAlternatives: Array<Array<{ ability: Ability; minimum: number }>>;
  repeatable: boolean;
};

export type AsiAllocation = Array<{ ability: Ability; amount: 1 | 2 }>;

export type LevelUpDecisionPlan = {
  nextCharacterLevel: number;
  nextClassLevel: number;
  requiresAsiOrFeat: boolean;
  asiAllocations: AsiAllocation[];
  eligibleFeats: ExactRuleRef[];
};

export type LevelUpDecisionSelection =
  | { mode: "none" }
  | { mode: "asi"; allocation: AsiAllocation }
  | { mode: "feat"; featVersionKey: string };

function sameAllocation(left: AsiAllocation, right: AsiAllocation): boolean {
  const normalize = (allocation: AsiAllocation) =>
    allocation
      .map((increase) => `${increase.ability}:${increase.amount}`)
      .sort()
      .join("|");
  return normalize(left) === normalize(right);
}

export function compileLevelUpDecision(input: {
  character: unknown;
  classVersionKey: string;
  plan: LevelUpDecisionPlan;
  selection: LevelUpDecisionSelection;
  decisionId: string;
}): CharacterDecision | null {
  const character = CharacterAggregateSchema.parse(input.character);
  const classRef = character.build.levels.find(
    (level) => level.classRef.versionKey === input.classVersionKey,
  )?.classRef;
  if (!classRef) throw new Error("Level-up class is not part of this character build");
  if (input.plan.nextCharacterLevel !== character.build.levels.length + 1) {
    throw new Error("Level-up plan is stale");
  }
  if (!input.plan.requiresAsiOrFeat) {
    if (input.selection.mode !== "none")
      throw new Error("This level does not permit an ASI or feat");
    return null;
  }
  if (input.selection.mode === "none") throw new Error("This level requires an ASI or feat");
  if (input.selection.mode === "asi") {
    const allocation = input.plan.asiAllocations.find((candidate) =>
      sameAllocation(candidate, input.selection.allocation),
    );
    if (!allocation) throw new Error("Selected ASI allocation is not eligible");
    return CharacterDecisionSchema.parse({
      id: input.decisionId,
      type: "ability-score-increase",
      madeAtCharacterLevel: input.plan.nextCharacterLevel,
      provenance: "native",
      sourceRef: classRef,
      increases: allocation,
    });
  }
  const feat = input.plan.eligibleFeats.find(
    (candidate) => candidate.versionKey === input.selection.featVersionKey,
  );
  if (!feat) throw new Error("Selected feat is not eligible");
  return CharacterDecisionSchema.parse({
    id: input.decisionId,
    type: "rule-selection",
    madeAtCharacterLevel: input.plan.nextCharacterLevel,
    provenance: "native",
    selectionKind: "feat",
    sourceRef: classRef,
    selections: [feat],
  });
}

function asiLevels(className: string): Set<number> {
  const normalized = className.trim().toLowerCase();
  if (normalized === "fighter") return FIGHTER_ASI_LEVELS;
  if (normalized === "rogue") return ROGUE_ASI_LEVELS;
  return STANDARD_ASI_LEVELS;
}

function legalAsiAllocations(scores: Record<Ability, number>): AsiAllocation[] {
  const allocations: AsiAllocation[] = [];
  for (const ability of ABILITIES) {
    if (scores[ability] <= 18) allocations.push([{ ability, amount: 2 }]);
  }
  for (let left = 0; left < ABILITIES.length; left += 1) {
    for (let right = left + 1; right < ABILITIES.length; right += 1) {
      const first = ABILITIES[left];
      const second = ABILITIES[right];
      if (scores[first] < 20 && scores[second] < 20) {
        allocations.push([
          { ability: first, amount: 1 },
          { ability: second, amount: 1 },
        ]);
      }
    }
  }
  return allocations;
}

export function deriveLevelUpDecisionPlan(input: {
  character: unknown;
  classVersionKey: string;
  featCatalog?: GeneralFeatCandidate[];
}): LevelUpDecisionPlan {
  const character = CharacterAggregateSchema.parse(input.character);
  const classLevels = character.build.levels.filter(
    (level) => level.classRef.versionKey === input.classVersionKey,
  );
  const currentClass = classLevels.at(-1);
  if (!currentClass) throw new Error("Level-up class is not part of this character build");
  const nextCharacterLevel = character.build.levels.length + 1;
  if (nextCharacterLevel > 20) throw new Error("Character cannot advance beyond level 20");
  const nextClassLevel = classLevels.length + 1;
  const requiresAsiOrFeat = asiLevels(currentClass.classRef.name).has(nextClassLevel);
  const scores = effectiveAbilityScores(character);
  const selectedFeatVersions = new Set(
    character.build.decisions.flatMap((decision) =>
      decision.type === "rule-selection" && decision.selectionKind === "feat"
        ? decision.selections.map((selection) => selection.versionKey)
        : [],
    ),
  );
  const eligibleFeats = requiresAsiOrFeat
    ? (input.featCatalog ?? [])
        .filter((candidate) => candidate.ref.kind === "feat")
        .filter((candidate) => candidate.compatibleWith2024)
        .filter((candidate) => nextCharacterLevel >= candidate.minimumCharacterLevel)
        .filter(
          (candidate) =>
            candidate.repeatable || !selectedFeatVersions.has(candidate.ref.versionKey),
        )
        .filter(
          (candidate) =>
            candidate.prerequisiteAlternatives.length === 0 ||
            candidate.prerequisiteAlternatives.some((alternative) =>
              alternative.every(
                (requirement) => scores[requirement.ability] >= requirement.minimum,
              ),
            ),
        )
        .map((candidate) => candidate.ref)
    : [];

  return {
    nextCharacterLevel,
    nextClassLevel,
    requiresAsiOrFeat,
    asiAllocations: requiresAsiOrFeat ? legalAsiAllocations(scores) : [],
    eligibleFeats,
  };
}
