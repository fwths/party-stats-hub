import { z } from "zod";
import { CharacterAggregateSchema, ExactRuleRefSchema, type ExactRuleRef } from "./schema";

export type LevelUpSubclassCandidate = {
  subclassRef: ExactRuleRef;
  classVersionKey: string;
  levelChosen: number;
};

export type LevelUpSubclassPlan = {
  nextCharacterLevel: number;
  nextClassLevel: number;
  requiresSubclass: boolean;
  candidates: ExactRuleRef[];
};

export type LevelUpSubclassSelection =
  | { mode: "none" }
  | { mode: "subclass"; subclassVersionKey: string };

export type LevelUpSubclassChoice = {
  classVersionKey: string;
  subclassRef: ExactRuleRef;
  selectedAtCharacterLevel: number;
};

export const LevelUpSubclassChoiceSchema = z
  .object({
    classVersionKey: z.string().trim().min(1),
    subclassRef: ExactRuleRefSchema.refine((ref) => ref.kind === "subclass"),
    selectedAtCharacterLevel: z.number().int().min(1).max(20),
  })
  .strict();

export function deriveLevelUpSubclassPlan(input: {
  character: unknown;
  classVersionKey: string;
  subclassCatalog?: LevelUpSubclassCandidate[];
}): LevelUpSubclassPlan {
  const character = CharacterAggregateSchema.parse(input.character);
  const classLevels = character.build.levels.filter(
    (level) => level.classRef.versionKey === input.classVersionKey,
  );
  const currentClass = classLevels.at(-1);
  if (!currentClass) throw new Error("Level-up class is not part of this character build");
  const nextCharacterLevel = character.build.levels.length + 1;
  if (nextCharacterLevel > 20) throw new Error("Character cannot advance beyond level 20");
  const nextClassLevel = classLevels.length + 1;
  const alreadyHasSubclass = character.build.subclasses.some(
    (subclass) => subclass.classVersionKey === input.classVersionKey,
  );
  const candidates = (input.subclassCatalog ?? [])
    .filter((candidate) => candidate.classVersionKey === input.classVersionKey)
    .filter((candidate) => candidate.subclassRef.kind === "subclass")
    .filter((candidate) => candidate.levelChosen === nextClassLevel)
    .map((candidate) => candidate.subclassRef);

  return {
    nextCharacterLevel,
    nextClassLevel,
    requiresSubclass: !alreadyHasSubclass && candidates.length > 0,
    candidates: alreadyHasSubclass ? [] : candidates,
  };
}

export function compileLevelUpSubclassChoice(input: {
  character: unknown;
  classVersionKey: string;
  plan: LevelUpSubclassPlan;
  selection: LevelUpSubclassSelection;
}): LevelUpSubclassChoice | null {
  const character = CharacterAggregateSchema.parse(input.character);
  if (input.plan.nextCharacterLevel !== character.build.levels.length + 1) {
    throw new Error("Level-up subclass plan is stale");
  }
  if (!input.plan.requiresSubclass) {
    if (input.selection.mode !== "none") {
      throw new Error("This level does not permit a subclass selection");
    }
    return null;
  }
  if (input.selection.mode === "none") throw new Error("This level requires a subclass selection");
  const selected = input.plan.candidates.find(
    (candidate) => candidate.versionKey === input.selection.subclassVersionKey,
  );
  if (!selected) throw new Error("Selected subclass is not eligible");
  return LevelUpSubclassChoiceSchema.parse({
    classVersionKey: input.classVersionKey,
    subclassRef: selected,
    selectedAtCharacterLevel: input.plan.nextCharacterLevel,
  });
}
