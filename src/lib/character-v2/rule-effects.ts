import { z } from "zod";
import type { CharacterBuild } from "./schema";

const EffectSourceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(["feat", "feature", "species", "background", "item"]),
  })
  .strict();

const EffectBase = { source: EffectSourceSchema };

export const CharacterRuleEffectSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...EffectBase,
      type: z.literal("hit-points-per-character-level"),
      amount: z.number().int(),
    })
    .strict(),
  z
    .object({
      ...EffectBase,
      type: z.literal("initiative-advantage"),
      enabled: z.boolean(),
    })
    .strict(),
]);

export type CharacterRuleEffect = z.infer<typeof CharacterRuleEffectSchema>;

export type RuleEffectCatalogRecord = {
  id: string;
  name: string;
  kind: "feat" | "feature" | "species" | "background" | "item";
  foundryJson: string | null;
};

type FoundryChange = { key?: unknown; mode?: unknown; value?: unknown };

function parseFoundryEffects(record: RuleEffectCatalogRecord): CharacterRuleEffect[] {
  if (!record.foundryJson) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(record.foundryJson);
  } catch {
    return [];
  }
  if (!raw || typeof raw !== "object" || !("effects" in raw)) return [];
  const effects = (raw as { effects?: unknown }).effects;
  if (!Array.isArray(effects)) return [];
  const source = { id: record.id, name: record.name, kind: record.kind };
  const parsed: CharacterRuleEffect[] = [];

  for (const effect of effects) {
    if (!effect || typeof effect !== "object" || !("changes" in effect)) continue;
    const changes = (effect as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) continue;
    for (const rawChange of changes) {
      const change = rawChange as FoundryChange;
      if (
        change.key === "system.attributes.hp.bonuses.level" &&
        String(change.mode).toUpperCase() === "ADD" &&
        Number.isFinite(Number(change.value))
      ) {
        parsed.push(
          CharacterRuleEffectSchema.parse({
            type: "hit-points-per-character-level",
            amount: Number(change.value),
            source,
          }),
        );
      }
      if (
        change.key === "flags.dnd5e.initiativeAdv" &&
        String(change.mode).toUpperCase() === "OVERRIDE" &&
        (change.value === true || String(change.value).toLowerCase() === "true")
      ) {
        parsed.push(
          CharacterRuleEffectSchema.parse({ type: "initiative-advantage", enabled: true, source }),
        );
      }
    }
  }
  return parsed;
}

export function resolveCharacterRuleEffects(input: {
  build: CharacterBuild;
  catalog: RuleEffectCatalogRecord[];
  grantedFeatureIds?: string[];
}): CharacterRuleEffect[] {
  const activeIds = new Set(
    input.build.choices
      .filter((choice) => choice.selectionState === "confirmed")
      .map((choice) => choice.selection.id),
  );
  for (const featureId of input.grantedFeatureIds ?? []) activeIds.add(featureId);

  return input.catalog
    .filter((record) => activeIds.has(record.id))
    .flatMap(parseFoundryEffects)
    .sort((left, right) => {
      const type = left.type.localeCompare(right.type);
      return type !== 0 ? type : left.source.id.localeCompare(right.source.id);
    });
}

export function hitPointsPerCharacterLevel(effects: CharacterRuleEffect[]): number {
  return effects
    .filter((effect) => effect.type === "hit-points-per-character-level")
    .reduce((total, effect) => total + effect.amount, 0);
}

export function hasInitiativeAdvantage(effects: CharacterRuleEffect[]): boolean {
  return effects.some((effect) => effect.type === "initiative-advantage" && effect.enabled);
}
