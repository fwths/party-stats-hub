import { z } from "zod";
import type { CompiledSheet } from "./compiled-sheet";
import type { NextLevelPreview } from "./level-preview";
import {
  classifyRulesCompatibility,
  isAcceptedByCurrentRulesPolicy,
  normalizeRuleName,
} from "./reconcile";
import { createRuleVersionKey } from "./rule-identity";
import { RuleRefSchema, type RuleRef } from "./schema";

export type SpellChoiceCatalogRecord = {
  id: string;
  name: string;
  level: number;
  sourceId: string;
  edition: string | null;
  classIds: string[];
  contentRevision: string;
};

export const ResolvedLevelChoiceSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    kind: z.enum(["prepared-spell", "cantrip", "asi-or-feat", "feature-option"]),
    count: z.number().int().positive(),
    readyToSelect: z.boolean(),
    unavailableReason: z.string().min(1).nullable(),
    options: z.array(
      z
        .object({
          ref: RuleRefSchema,
          spellLevel: z.number().int().min(0).max(9).nullable(),
        })
        .strict(),
    ),
  })
  .strict();

export type ResolvedLevelChoice = z.infer<typeof ResolvedLevelChoiceSchema>;

function choiceKind(id: string): ResolvedLevelChoice["kind"] {
  if (id.endsWith(":prepared-spells")) return "prepared-spell";
  if (id.endsWith(":cantrips")) return "cantrip";
  if (id.endsWith(":asi-or-feat")) return "asi-or-feat";
  return "feature-option";
}

function ordinalSpellLevel(label: string): number | null {
  const match = label.trim().match(/^(\d+)(?:st|nd|rd|th)$/i);
  return match ? Number(match[1]) : null;
}

function maximumSpellLevel(before: CompiledSheet, preview: NextLevelPreview): number {
  let maximum = before.spellSlots.reduce(
    (highest, slot) => (slot.max > 0 ? Math.max(highest, slot.level) : highest),
    0,
  );
  for (const change of preview.progressionChanges) {
    const level = ordinalSpellLevel(change.label);
    if (level !== null && typeof change.after === "number" && change.after > 0) {
      maximum = Math.max(maximum, level);
    }
  }
  return maximum;
}

function spellRef(record: SpellChoiceCatalogRecord): RuleRef {
  const compatibility = classifyRulesCompatibility({
    kind: "spell",
    id: record.id,
    name: record.name,
    sourceId: record.sourceId,
    edition: record.edition,
  });
  return RuleRefSchema.parse({
    kind: "spell",
    id: createRuleVersionKey({
      kind: "spell",
      sourceId: record.sourceId,
      upstreamId: record.id,
      contentRevision: record.contentRevision,
    }),
    name: record.name,
    ruleset: "2024",
    sourceId: record.sourceId,
    verification: isAcceptedByCurrentRulesPolicy(compatibility)
      ? "verified"
      : "imported-unverified",
  });
}

export function resolveLevelChoices(input: {
  preview: NextLevelPreview;
  before: CompiledSheet;
  spells: SpellChoiceCatalogRecord[];
  existingSpellNames: string[];
}): ResolvedLevelChoice[] {
  const existingNames = new Set(input.existingSpellNames.map(normalizeRuleName));
  const maximumLevel = maximumSpellLevel(input.before, input.preview);

  return input.preview.requiredChoices.map((choice) => {
    const kind = choiceKind(choice.id);
    if (kind !== "prepared-spell" && kind !== "cantrip") {
      return ResolvedLevelChoiceSchema.parse({
        id: choice.id,
        label: choice.label,
        kind,
        count: choice.count,
        readyToSelect: false,
        unavailableReason: `${kind} option hydration is not implemented yet`,
        options: [],
      });
    }
    const requiredLevel = kind === "cantrip" ? 0 : null;
    const options = input.spells
      .filter(
        (spell) => input.preview.classRef.id && spell.classIds.includes(input.preview.classRef.id),
      )
      .filter((spell) =>
        requiredLevel === 0 ? spell.level === 0 : spell.level > 0 && spell.level <= maximumLevel,
      )
      .filter((spell) => !existingNames.has(normalizeRuleName(spell.name)))
      .filter((spell) =>
        isAcceptedByCurrentRulesPolicy(
          classifyRulesCompatibility({
            kind: "spell",
            id: spell.id,
            name: spell.name,
            sourceId: spell.sourceId,
            edition: spell.edition,
          }),
        ),
      )
      .map((spell) => ({ ref: spellRef(spell), spellLevel: spell.level }))
      .sort((left, right) =>
        left.spellLevel !== right.spellLevel
          ? left.spellLevel! - right.spellLevel!
          : left.ref.name.localeCompare(right.ref.name),
      );
    const readyToSelect = options.length >= choice.count;
    return ResolvedLevelChoiceSchema.parse({
      id: choice.id,
      label: choice.label,
      kind,
      count: choice.count,
      readyToSelect,
      unavailableReason: readyToSelect
        ? null
        : "The canonical catalog has too few eligible options",
      options,
    });
  });
}

export const LevelChoiceSubmissionSchema = z
  .object({
    choiceId: z.string().min(1),
    selectionIds: z.array(z.string().min(1)),
  })
  .strict();

export type LevelChoiceSubmission = z.infer<typeof LevelChoiceSubmissionSchema>;

export function validateLevelChoiceSubmission(
  choice: ResolvedLevelChoice,
  rawSubmission: unknown,
): RuleRef[] {
  const submission = LevelChoiceSubmissionSchema.parse(rawSubmission);
  if (submission.choiceId !== choice.id)
    throw new Error("Submission targets a different level choice");
  if (!choice.readyToSelect) throw new Error(choice.unavailableReason ?? "Choice is not ready");
  if (new Set(submission.selectionIds).size !== submission.selectionIds.length) {
    throw new Error("A choice cannot select the same option more than once");
  }
  if (submission.selectionIds.length !== choice.count) {
    throw new Error(`Choice requires exactly ${choice.count} selection(s)`);
  }
  const byId = new Map(choice.options.map((option) => [option.ref.id, option.ref]));
  return submission.selectionIds.map((id) => {
    const ref = byId.get(id);
    if (!ref) throw new Error(`Selection ${id} is not eligible for ${choice.label}`);
    return ref;
  });
}
