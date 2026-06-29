import { z } from "zod";
import type { PartyMember } from "@/lib/dndbeyond.types";
import {
  validateLevelChoiceSubmission,
  type LevelChoiceSubmission,
  type ResolvedLevelChoice,
} from "./level-choices";
import { appendCharacterLevel } from "./operations";
import type { NextLevelPreview } from "./level-preview";
import {
  hasInitiativeAdvantage,
  hitPointsPerCharacterLevel,
  type CharacterRuleEffect,
} from "./rule-effects";
import {
  CharacterBuildSchema,
  CharacterLiveStateSchema,
  CharacterResourceSchema,
  RuleRefSchema,
  type CharacterBuild,
  type CharacterLiveState,
} from "./schema";

const NamedModifierSchema = z.object({ name: z.string(), modifier: z.number().int() }).strict();

export const CompiledSheetSchema = z
  .object({
    characterId: z.string().min(1),
    name: z.string().min(1),
    level: z.number().int().min(1).max(20),
    proficiencyBonus: z.number().int().min(2).max(6),
    abilities: z.array(
      z.object({ name: z.string(), score: z.number().int(), modifier: z.number().int() }).strict(),
    ),
    hp: z
      .object({
        current: z.number().int().min(0),
        max: z.number().int().min(1),
        temporary: z.number().int().min(0),
      })
      .strict(),
    armorClass: z.number().int(),
    initiative: z.object({ modifier: z.number().int(), advantage: z.boolean() }).strict(),
    speed: z.number().int().min(0),
    hitDice: z
      .object({
        die: z.number().int().positive(),
        remaining: z.number().int().min(0),
        max: z.number().int().positive(),
      })
      .strict(),
    skills: z.array(
      NamedModifierSchema.extend({
        key: z.string(),
        ability: z.string(),
        proficiency: z.string(),
      }).strict(),
    ),
    saves: z.array(
      z
        .object({ ability: z.string(), modifier: z.number().int(), proficiency: z.string() })
        .strict(),
    ),
    attacks: z.array(
      z
        .object({
          name: z.string(),
          attackBonus: z.number(),
          damage: z.string(),
          damageType: z.string(),
          properties: z.array(z.string()),
          isWeapon: z.boolean(),
        })
        .strict(),
    ),
    spellSlots: z.array(
      z.object({ level: z.number().int(), max: z.number().int(), used: z.number().int() }).strict(),
    ),
    spellbook: z.array(
      z
        .object({
          ref: RuleRefSchema.nullable(),
          name: z.string().min(1),
          level: z.number().int().min(0).max(9),
          preparation: z.enum(["cantrip", "prepared", "always-prepared"]),
        })
        .strict(),
    ),
    unlockedFeatures: z.array(z.string()),
    resources: z.array(CharacterResourceSchema),
  })
  .strict();

export type CompiledSheet = z.infer<typeof CompiledSheetSchema>;

function parseSingleHitDie(value: string): CompiledSheet["hitDice"] {
  const match = value.trim().match(/^(\d+)\/(\d+)d(\d+)$/);
  if (!match)
    throw new Error(`Choice-free compiler requires one hit-die pool; received "${value}"`);
  return { remaining: Number(match[1]), max: Number(match[2]), die: Number(match[3]) };
}

export function snapshotPartyMember(
  member: PartyMember,
  characterId: string,
  liveState: CharacterLiveState,
): CompiledSheet {
  const state = CharacterLiveStateSchema.parse(liveState);
  return CompiledSheetSchema.parse({
    characterId,
    name: member.name,
    level: member.level,
    proficiencyBonus: member.proficiencyBonus,
    abilities: member.abilities,
    hp: { current: state.currentHp, max: state.maxHp, temporary: state.temporaryHp },
    armorClass: member.armorClass,
    initiative: { modifier: member.initiative, advantage: false },
    speed: member.speed,
    hitDice: parseSingleHitDie(member.hitDice),
    skills: member.skills,
    saves: member.saves,
    attacks: member.attacks,
    spellSlots: member.spellSlots,
    spellbook: [
      ...member.cantrips.map((spell) => ({
        ref: null,
        name: spell.name,
        level: 0,
        preparation: "cantrip" as const,
      })),
      ...member.preparedSpells.map((spell) => ({
        ref: null,
        name: spell.name,
        level: spell.level,
        preparation: spell.alwaysPrepared ? ("always-prepared" as const) : ("prepared" as const),
      })),
    ],
    unlockedFeatures: member.features
      .filter((feature) => feature.isUnlocked !== false)
      .map((feature) => feature.name),
    resources: state.resources,
  });
}

export type CurrentHpPolicy = "preserve-damage" | "preserve-current";

export type LevelUpResult = {
  build: CharacterBuild;
  liveState: CharacterLiveState;
  sheet: CompiledSheet;
  hpGain: { fixed: number; constitution: number; perLevelBonuses: number; total: number };
};

export type ChoiceFreeLevelUpResult = LevelUpResult;

function ordinalSpellLevel(label: string): number | null {
  const match = label.trim().match(/^(\d+)(?:st|nd|rd|th)$/i);
  return match ? Number(match[1]) : null;
}

export function compileLevelUp(input: {
  build: CharacterBuild;
  liveState: CharacterLiveState;
  before: CompiledSheet;
  preview: NextLevelPreview;
  resolvedEffects: CharacterRuleEffect[];
  resolvedChoices: ResolvedLevelChoice[];
  choiceSubmissions: LevelChoiceSubmission[];
  currentHpPolicy: CurrentHpPolicy;
}): LevelUpResult {
  const { build, preview, currentHpPolicy } = input;
  const before = CompiledSheetSchema.parse(input.before);
  const liveState = CharacterLiveStateSchema.parse(input.liveState);
  if (!preview.readyToPreview) throw new Error("The next level is not ready to compile");
  if (
    preview.characterLevel.before !== before.level ||
    preview.characterLevel.after !== before.level + 1
  ) {
    throw new Error("Level preview does not match the before sheet");
  }
  const afterProficiency = Math.ceil(preview.characterLevel.after / 4) + 1;
  if (afterProficiency !== before.proficiencyBonus) {
    throw new Error("Level compiler cannot yet recompute a proficiency-bonus boundary");
  }
  if (before.hitDice.die !== preview.hp.hitDie)
    throw new Error("Catalog hit die does not match the imported sheet");

  const constitutionScore = before.abilities.find((ability) =>
    ability.name.toUpperCase().startsWith("CON"),
  )?.score;
  if (constitutionScore === undefined) throw new Error("Before sheet has no Constitution score");
  const constitution = Math.floor((constitutionScore - 10) / 2);
  const perLevelBonuses = hitPointsPerCharacterLevel(input.resolvedEffects);
  const totalHpGain = preview.hp.fixed + constitution + perLevelBonuses;
  let advancedBuild = appendCharacterLevel(build, {
    expectedRevision: build.revision,
    classRef: preview.classRef,
    hpGain: preview.hp.fixed,
  });

  const choicesById = new Map(input.resolvedChoices.map((choice) => [choice.id, choice]));
  const submissionsById = new Map(
    input.choiceSubmissions.map((submission) => [submission.choiceId, submission]),
  );
  const selectedOptions: Array<{
    choice: ResolvedLevelChoice;
    ref: NonNullable<ResolvedLevelChoice["options"][number]>["ref"];
    spellLevel: number | null;
  }> = [];
  for (const required of preview.requiredChoices) {
    const choice = choicesById.get(required.id);
    const submission = submissionsById.get(required.id);
    if (!choice || !submission) throw new Error(`Missing selection for ${required.label}`);
    const refs = validateLevelChoiceSubmission(choice, submission);
    for (const ref of refs) {
      const option = choice.options.find((candidate) => candidate.ref.id === ref.id)!;
      selectedOptions.push({ choice, ref, spellLevel: option.spellLevel });
    }
  }
  if (selectedOptions.length > 0) {
    advancedBuild = CharacterBuildSchema.parse({
      ...advancedBuild,
      choices: [
        ...advancedBuild.choices,
        ...selectedOptions.map(({ choice, ref }, index) => ({
          id: `native:level-${preview.characterLevel.after}:${choice.id}:${index}`,
          groupId: choice.id,
          selection: ref,
          grantedAtCharacterLevel: preview.characterLevel.after,
          provenance: "native" as const,
          selectionState: "confirmed" as const,
          payload: { choiceKind: choice.kind },
        })),
      ],
    });
  }

  const spellSlots = before.spellSlots.map((slot) => ({ ...slot }));
  const resources = liveState.resources.map((resource) => ({ ...resource }));
  for (const change of preview.progressionChanges) {
    if (/prepared spells?|cantrips?/i.test(change.label)) continue;
    const spellLevel = ordinalSpellLevel(change.label);
    if (
      spellLevel === null ||
      typeof change.before !== "number" ||
      typeof change.after !== "number"
    ) {
      throw new Error(`Level compiler does not support progression change: ${change.label}`);
    }
    const existingSlot = spellSlots.find((slot) => slot.level === spellLevel);
    if (existingSlot) existingSlot.max = change.after;
    else spellSlots.push({ level: spellLevel, max: change.after, used: 0 });

    const resourceKey = `spell-slot:${spellLevel}`;
    const existingResource = resources.find((resource) => resource.key === resourceKey);
    const increase = change.after - change.before;
    if (existingResource) {
      existingResource.max = change.after;
      existingResource.current = Math.min(change.after, existingResource.current + increase);
    } else {
      resources.push({
        key: resourceKey,
        label: `Level ${spellLevel} Spell Slots`,
        current: change.after,
        max: change.after,
        reset: "long-rest",
      });
    }
  }
  const newMaxHp = liveState.maxHp + totalHpGain;
  const damage = liveState.maxHp - liveState.currentHp;
  const newCurrentHp =
    currentHpPolicy === "preserve-damage" ? newMaxHp - damage : liveState.currentHp;
  const advancedState = CharacterLiveStateSchema.parse({
    ...liveState,
    revision: liveState.revision + 1,
    maxHp: newMaxHp,
    currentHp: newCurrentHp,
    resources,
  });
  const newFeatureNames = preview.automaticFeatures.map((feature) => feature.name);
  const advancedSheet = CompiledSheetSchema.parse({
    ...before,
    level: preview.characterLevel.after,
    proficiencyBonus: afterProficiency,
    hp: {
      current: advancedState.currentHp,
      max: advancedState.maxHp,
      temporary: advancedState.temporaryHp,
    },
    hitDice: {
      ...before.hitDice,
      remaining: before.hitDice.remaining + 1,
      max: before.hitDice.max + 1,
    },
    initiative: {
      ...before.initiative,
      advantage: before.initiative.advantage || hasInitiativeAdvantage(input.resolvedEffects),
    },
    spellSlots: spellSlots.sort((left, right) => left.level - right.level),
    spellbook: [
      ...before.spellbook,
      ...selectedOptions
        .filter(({ choice }) => choice.kind === "prepared-spell" || choice.kind === "cantrip")
        .map(({ choice, ref, spellLevel }) => ({
          ref,
          name: ref.name,
          level: spellLevel ?? 0,
          preparation: choice.kind === "cantrip" ? ("cantrip" as const) : ("prepared" as const),
        })),
    ],
    unlockedFeatures: [
      ...before.unlockedFeatures,
      ...newFeatureNames.filter((name) => !before.unlockedFeatures.includes(name)),
    ],
    resources: advancedState.resources,
  });

  return {
    build: advancedBuild,
    liveState: advancedState,
    sheet: advancedSheet,
    hpGain: { fixed: preview.hp.fixed, constitution, perLevelBonuses, total: totalHpGain },
  };
}

export function compileChoiceFreeLevelUp(
  input: Omit<Parameters<typeof compileLevelUp>[0], "resolvedChoices" | "choiceSubmissions">,
): ChoiceFreeLevelUpResult {
  if (input.preview.requiredChoices.length > 0) {
    throw new Error("Choice-free compiler cannot resolve required choices");
  }
  if (input.preview.progressionChanges.length > 0) {
    throw new Error("Choice-free compiler cannot apply progression-table changes");
  }
  return compileLevelUp({ ...input, resolvedChoices: [], choiceSubmissions: [] });
}
