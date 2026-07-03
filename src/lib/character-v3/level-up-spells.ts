import { normalizeRuleName } from "../character-v2/reconcile";
import type { CharacterAggregate, CharacterDecision, ExactRuleRef } from "./schema";
import type { LevelUpProgressionRequirement } from "./level-up-progression";

type SpellSelectionMode = "cantrip" | "prepared";

export type LevelUpSpellCatalogRecord = {
  spellRef: ExactRuleRef;
  level: number;
  classVersionKeys: string[];
};

export type LevelUpSpellChoicePlan = {
  kind: "prepared-spell" | "cantrip";
  label: string;
  count: number;
  selectionMode: SpellSelectionMode;
  readyToSelect: boolean;
  unavailableReason: string | null;
  options: Array<{ spellRef: ExactRuleRef; spellLevel: number }>;
};

export type CompiledLevelUpSpellSelection = {
  decision: CharacterDecision;
  spells: CharacterAggregate["build"]["spells"];
};

function existingSpellNames(character: CharacterAggregate): Set<string> {
  return new Set(character.build.spells.map((spell) => normalizeRuleName(spell.spellRef.name)));
}

export function deriveLevelUpSpellChoicePlans(input: {
  character: CharacterAggregate;
  classVersionKey: string;
  requirements: LevelUpProgressionRequirement[];
  spellCatalog: LevelUpSpellCatalogRecord[];
  maximumSpellLevel: number;
}): LevelUpSpellChoicePlan[] {
  if (
    !input.character.build.levels.some(
      (level) => level.classRef.versionKey === input.classVersionKey,
    )
  ) {
    throw new Error("Spell choice class is not part of this character build");
  }
  const existingNames = existingSpellNames(input.character);
  return input.requirements
    .filter(
      (requirement) => requirement.kind === "prepared-spell" || requirement.kind === "cantrip",
    )
    .map((requirement) => {
      const options = input.spellCatalog
        .filter((spell) => spell.classVersionKeys.includes(input.classVersionKey))
        .filter((spell) =>
          requirement.kind === "cantrip"
            ? spell.level === 0
            : spell.level > 0 && spell.level <= input.maximumSpellLevel,
        )
        .filter((spell) => spell.spellRef.verification === "verified")
        .filter((spell) => !existingNames.has(normalizeRuleName(spell.spellRef.name)))
        .map((spell) => ({ spellRef: spell.spellRef, spellLevel: spell.level }))
        .sort((left, right) =>
          left.spellLevel !== right.spellLevel
            ? left.spellLevel - right.spellLevel
            : left.spellRef.name.localeCompare(right.spellRef.name),
        );
      const readyToSelect = options.length >= requirement.count;
      return {
        kind: requirement.kind,
        label: requirement.label,
        count: requirement.count,
        selectionMode: requirement.kind === "cantrip" ? "cantrip" : "prepared",
        readyToSelect,
        unavailableReason: readyToSelect
          ? null
          : "The exact-version spell catalog has too few eligible options",
        options,
      };
    });
}

export function compileLevelUpSpellSelection(input: {
  character: CharacterAggregate;
  classVersionKey: string;
  plan: LevelUpSpellChoicePlan;
  selectedSpellVersionKeys: string[];
  decisionId: string;
}): CompiledLevelUpSpellSelection {
  if (!input.plan.readyToSelect) {
    throw new Error(input.plan.unavailableReason ?? "Spell choice is not ready");
  }
  if (new Set(input.selectedSpellVersionKeys).size !== input.selectedSpellVersionKeys.length) {
    throw new Error("A spell choice cannot select the same spell more than once");
  }
  if (input.selectedSpellVersionKeys.length !== input.plan.count) {
    throw new Error(`Spell choice requires exactly ${input.plan.count} selection(s)`);
  }
  const byVersionKey = new Map(
    input.plan.options.map((option) => [option.spellRef.versionKey, option]),
  );
  const selected = input.selectedSpellVersionKeys.map((versionKey) => {
    const option = byVersionKey.get(versionKey);
    if (!option) throw new Error(`Spell ${versionKey} is not eligible for ${input.plan.label}`);
    return option;
  });
  const nextCharacterLevel = input.character.build.levels.length + 1;
  const decision: CharacterDecision = {
    id: input.decisionId,
    type: "spell-selection",
    classVersionKey: input.classVersionKey,
    selectionMode: input.plan.selectionMode,
    sourceRef: null,
    spellVersionKeys: input.selectedSpellVersionKeys,
    madeAtCharacterLevel: nextCharacterLevel,
    provenance: "native",
  };
  return {
    decision,
    spells: selected.map((selection) => ({
      id: `${input.decisionId}:spell:${selection.spellRef.versionKey}`,
      spellRef: selection.spellRef,
      spellLevel: selection.spellLevel,
      classVersionKey: input.classVersionKey,
      grantSourceRef: null,
      castingAbility: null,
      mode: input.plan.selectionMode,
      active: true,
      selectedAtCharacterLevel: nextCharacterLevel,
      provenance: "native",
      decisionId: input.decisionId,
    })),
  };
}
