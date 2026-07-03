import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import type { CharacterAggregate, CharacterDecision, ExactRuleRef } from "./schema";

type GrantedMode = "always-prepared" | "granted";

export type GrantedSpellName = {
  name: string;
  sourceId: string;
  cantrip: boolean;
  mode: GrantedMode;
};
export type GrantedSpellChoiceRequirement = {
  id: string;
  mode: GrantedMode;
  count: number;
  levels: number[];
  classIds: string[];
  schoolIds: string[];
};
export type GrantedSpellParseResult = {
  spells: GrantedSpellName[];
  choiceRequirements: GrantedSpellChoiceRequirement[];
  variantChoices: string[];
  selectedVariant: string | null;
  blockers: string[];
};
export type GrantedSpellCatalogEntry = {
  spellRef: ExactRuleRef;
  spellLevel: number;
  schoolId: string;
  classIds: string[];
};
export type GrantedSpellChoicePlan = GrantedSpellChoiceRequirement & {
  options: Array<{ spellRef: ExactRuleRef; spellLevel: number }>;
};

function parseSpellToken(token: string): Omit<GrantedSpellName, "mode"> | null {
  const [name, sourceAndTag] = token.split("|");
  if (!name?.trim() || !sourceAndTag?.trim()) return null;
  const [sourceId, tag] = sourceAndTag.split("#");
  if (!sourceId?.trim()) return null;
  return { name: name.trim(), sourceId: sourceId.toUpperCase(), cantrip: tag === "c" };
}

function parseChoiceFilter(value: unknown, mode: GrantedMode, id: string) {
  if (typeof value !== "string") return null;
  const fields = new Map<string, string>();
  for (const segment of value.split("|")) {
    const separator = segment.indexOf("=");
    if (separator < 1) return null;
    const key = segment.slice(0, separator).toLowerCase();
    if (fields.has(key) || !["level", "class", "school"].includes(key)) return null;
    fields.set(key, segment.slice(separator + 1));
  }
  if (!fields.has("level") || !fields.has("class")) return null;
  const levels = fields.get("level")!.split(";").map(Number);
  const classIds = fields
    .get("class")!
    .split(";")
    .map((entry) => entry.trim().toLowerCase());
  const schoolIds = fields.has("school")
    ? fields
        .get("school")!
        .split(";")
        .map((entry) => entry.trim().toUpperCase())
    : [];
  if (levels.some((level) => !Number.isInteger(level) || level < 0 || level > 9)) return null;
  if (classIds.some((entry) => !entry) || schoolIds.some((entry) => !entry)) return null;
  return { id, mode, count: 1, levels, classIds, schoolIds };
}

export function parseGrantedSpellsAtLevel(
  raw: unknown,
  classLevel: number,
  selectedVariant: string | null = null,
): GrantedSpellParseResult {
  const empty = {
    spells: [],
    choiceRequirements: [],
    variantChoices: [],
    selectedVariant: null,
    blockers: [],
  };
  if (!Array.isArray(raw)) return empty;
  const variantChoices = raw.flatMap((bundle) =>
    bundle &&
    typeof bundle === "object" &&
    !Array.isArray(bundle) &&
    typeof bundle.name === "string"
      ? [bundle.name]
      : [],
  );
  if (raw.length > 1 || variantChoices.length > 0) {
    if (variantChoices.length !== raw.length) {
      return { ...empty, blockers: ["Subclass spell variants are malformed"] };
    }
    if (selectedVariant === null) return { ...empty, variantChoices };
    const selected = raw.find((bundle) => bundle.name === selectedVariant);
    if (!selected) {
      return {
        ...empty,
        variantChoices,
        blockers: ["Selected subclass spell variant is not eligible"],
      };
    }
    raw = [selected];
  }
  const spells: GrantedSpellName[] = [];
  const choiceRequirements: GrantedSpellChoiceRequirement[] = [];
  const blockers: string[] = [];
  const bundle = raw[0];
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) return empty;
  const record = bundle as Record<string, unknown>;
  for (const [modeKey, mode] of [
    ["prepared", "always-prepared"],
    ["known", "granted"],
  ] as const) {
    const byLevel = record[modeKey];
    if (!byLevel || typeof byLevel !== "object" || Array.isArray(byLevel)) continue;
    const entries = (byLevel as Record<string, unknown>)[String(classLevel)];
    if (entries === undefined) continue;
    if (!Array.isArray(entries)) {
      blockers.push(`${modeKey} subclass spells are malformed`);
      continue;
    }
    const groups = new Map<string, GrantedSpellChoiceRequirement>();
    entries.forEach((entry, index) => {
      if (typeof entry === "string") {
        const parsed = parseSpellToken(entry);
        if (!parsed) blockers.push(`Malformed subclass spell reference: ${entry}`);
        else spells.push({ ...parsed, mode });
        return;
      }
      const choice =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? parseChoiceFilter(
              (entry as Record<string, unknown>).choose,
              mode,
              `${modeKey}:${classLevel}:${index}`,
            )
          : null;
      if (!choice) {
        blockers.push(`${modeKey} subclass spell choice has an unsupported filter`);
        return;
      }
      const signature = JSON.stringify([
        choice.mode,
        choice.levels,
        choice.classIds,
        choice.schoolIds,
      ]);
      const existing = groups.get(signature);
      if (existing) existing.count += 1;
      else groups.set(signature, choice);
    });
    choiceRequirements.push(...groups.values());
  }
  for (const unsupportedMode of ["innate", "expanded"]) {
    const value = record[unsupportedMode];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.prototype.hasOwnProperty.call(value, String(classLevel))
    ) {
      blockers.push(`${unsupportedMode} subclass spells require a dedicated casting compiler`);
    }
  }
  return { spells, choiceRequirements, variantChoices, selectedVariant, blockers };
}

export function findGrantedSpellVariant(
  character: CharacterAggregate,
  subclassRef: ExactRuleRef,
): string | null {
  const decision = character.build.decisions.find(
    (entry) =>
      entry.type === "rule-selection" &&
      entry.selectionKind === "feature-option" &&
      entry.sourceRef?.versionKey === subclassRef.versionKey &&
      entry.selections.some((selection) =>
        selection.upstreamId.startsWith(`${subclassRef.upstreamId}:spell-variant:`),
      ),
  );
  return decision?.type === "rule-selection" ? (decision.selections[0]?.name ?? null) : null;
}

export function deriveGrantedSpellChoicePlans(input: {
  parsed: GrantedSpellParseResult;
  spellCatalog: GrantedSpellCatalogEntry[];
  existingSpellVersionKeys?: string[];
}): GrantedSpellChoicePlan[] {
  const existing = new Set(input.existingSpellVersionKeys ?? []);
  return input.parsed.choiceRequirements.map((requirement) => ({
    ...requirement,
    options: input.spellCatalog
      .filter((spell) => requirement.levels.includes(spell.spellLevel))
      .filter((spell) => spell.classIds.some((classId) => requirement.classIds.includes(classId)))
      .filter(
        (spell) =>
          requirement.schoolIds.length === 0 ||
          requirement.schoolIds.includes(spell.schoolId.toUpperCase()),
      )
      .filter((spell) => !existing.has(spell.spellRef.versionKey))
      .map(({ spellRef, spellLevel }) => ({ spellRef, spellLevel })),
  }));
}

export function compileGrantedLevelUpSpells(input: {
  character: CharacterAggregate;
  classVersionKey: string;
  subclassRef: ExactRuleRef;
  parsed: GrantedSpellParseResult;
  spellCatalog: GrantedSpellCatalogEntry[];
  choiceSelections?: Array<{ requirementId: string; selectedSpellVersionKeys: string[] }>;
  persistVariantDecision?: boolean;
  decisionId: string;
}): { decisions: CharacterDecision[]; spells: CharacterAggregate["build"]["spells"] } {
  if (input.parsed.blockers.length > 0)
    throw new Error(`Granted spell compiler blocked: ${input.parsed.blockers.join(", ")}`);
  const catalog = new Map(
    input.spellCatalog.map((entry) => [
      `${entry.spellRef.name.trim().toLowerCase()}|${entry.spellRef.sourceId.toUpperCase()}`,
      entry,
    ]),
  );
  const choicePlans = deriveGrantedSpellChoicePlans({
    parsed: input.parsed,
    spellCatalog: input.spellCatalog,
    existingSpellVersionKeys: input.character.build.spells.map(
      (spell) => spell.spellRef.versionKey,
    ),
  });
  const choiceSelections = new Map(
    (input.choiceSelections ?? []).map((selection) => [selection.requirementId, selection]),
  );
  if (choiceSelections.size !== choicePlans.length)
    throw new Error(`Granted spells require ${choicePlans.length} choice group(s)`);
  const nextCharacterLevel = input.character.build.levels.length + 1;
  const decisions: CharacterDecision[] = [];
  const spells: CharacterAggregate["build"]["spells"] = [];
  if (input.persistVariantDecision && input.parsed.selectedVariant) {
    const name = input.parsed.selectedVariant;
    const upstreamId = `${input.subclassRef.upstreamId}:spell-variant:${name}`;
    decisions.push({
      id: `${input.decisionId}:variant`,
      type: "rule-selection",
      selectionKind: "feature-option",
      sourceRef: input.subclassRef,
      selections: [
        {
          kind: "feature",
          familyKey: createRuleFamilyKey("feature", `${input.subclassRef.name}: ${name}`),
          versionKey: createRuleVersionKey({
            kind: "feature",
            sourceId: input.subclassRef.sourceId,
            upstreamId,
            contentRevision: input.subclassRef.contentRevision,
          }),
          name,
          rulesGeneration: "2024",
          sourceId: input.subclassRef.sourceId,
          upstreamId,
          contentRevision: input.subclassRef.contentRevision,
          compatibility: input.subclassRef.compatibility,
          verification: input.subclassRef.verification,
        },
      ],
      madeAtCharacterLevel: nextCharacterLevel,
      provenance: "native",
    });
  }
  for (const mode of ["always-prepared", "granted"] as const) {
    const fixed = input.parsed.spells
      .filter((spell) => spell.mode === mode)
      .map((spell) => {
        const entry = catalog.get(`${spell.name.toLowerCase()}|${spell.sourceId}`);
        if (!entry)
          throw new Error(`Exact granted spell is unavailable: ${spell.name}|${spell.sourceId}`);
        if (spell.cantrip !== (entry.spellLevel === 0))
          throw new Error(`Granted spell level marker disagrees with catalog: ${spell.name}`);
        return entry;
      });
    const chosen = choicePlans
      .filter((plan) => plan.mode === mode)
      .flatMap((plan) => {
        const selection = choiceSelections.get(plan.id);
        if (
          !selection ||
          selection.selectedSpellVersionKeys.length !== plan.count ||
          new Set(selection.selectedSpellVersionKeys).size !== plan.count
        )
          throw new Error(
            `Granted spell choice ${plan.id} requires ${plan.count} distinct spell(s)`,
          );
        return selection.selectedSpellVersionKeys.map((versionKey) => {
          const option = plan.options.find(
            (candidate) => candidate.spellRef.versionKey === versionKey,
          );
          if (!option) throw new Error(`Spell is not eligible for granted choice ${plan.id}`);
          return input.spellCatalog.find((entry) => entry.spellRef.versionKey === versionKey)!;
        });
      });
    const resolved = [...fixed, ...chosen];
    if (resolved.length === 0) continue;
    const decisionId = `${input.decisionId}:${mode}`;
    decisions.push({
      id: decisionId,
      type: "spell-selection",
      classVersionKey: input.classVersionKey,
      selectionMode: mode,
      sourceRef: input.subclassRef,
      spellVersionKeys: resolved.map((entry) => entry.spellRef.versionKey),
      madeAtCharacterLevel: nextCharacterLevel,
      provenance: "native",
    });
    spells.push(
      ...resolved.map((entry) => ({
        id: `${decisionId}:spell:${entry.spellRef.versionKey}`,
        spellRef: entry.spellRef,
        spellLevel: entry.spellLevel,
        classVersionKey: input.classVersionKey,
        grantSourceRef: input.subclassRef,
        castingAbility: null,
        mode,
        active: true,
        selectedAtCharacterLevel: nextCharacterLevel,
        provenance: "native" as const,
        decisionId,
      })),
    );
  }
  return { decisions, spells };
}
