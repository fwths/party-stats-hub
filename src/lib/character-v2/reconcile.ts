import { CharacterBuildSchema, type CharacterBuild, type RuleRef } from "./schema";

export type CatalogRecord = {
  kind: RuleRef["kind"];
  id: string;
  name: string;
  sourceId: string;
  edition: string | null;
  parentId?: string | null;
};

export type RulesCompatibility = "core-2024" | "current-2024-compatible" | "legacy";
export type ReconciliationStatus =
  | "resolved"
  | "resolved-alias"
  | "derived-grant"
  | "unresolved-import-choice"
  | "missing"
  | "ambiguous";

export type ReconciliationEntry = {
  path: string;
  imported: RuleRef;
  status: ReconciliationStatus;
  canonical: CatalogRecord | null;
  compatibility: RulesCompatibility | null;
  acceptedByCurrentRulesPolicy: boolean;
  aliasDetail: string | null;
  requiresDecision: boolean;
};

export type CharacterReconciliationReport = {
  entries: ReconciliationEntry[];
  blockingEntries: ReconciliationEntry[];
  decisionEntries: ReconciliationEntry[];
  classProgressionReady: boolean;
};

const CORE_2024_SOURCES = new Set(["XPHB", "XDMG", "XMM"]);

export function normalizeRuleName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function classifyRulesCompatibility(record: CatalogRecord): RulesCompatibility {
  if (CORE_2024_SOURCES.has(record.sourceId.toUpperCase())) return "core-2024";
  if (record.edition?.toLowerCase() === "one") return "current-2024-compatible";
  return "legacy";
}

export function isAcceptedByCurrentRulesPolicy(compatibility: RulesCompatibility | null): boolean {
  return compatibility === "core-2024" || compatibility === "current-2024-compatible";
}

function derivedGrantDetail(ref: RuleRef): string | null {
  if (/ ability score improvements$/i.test(ref.name)) {
    return "Generated background ability-score grant";
  }
  if (/^(?:\d+:\s*)?weapon mastery$/i.test(ref.name)) {
    return "Generated class weapon-mastery grant";
  }
  return null;
}

function aliasFor(ref: RuleRef): { name: string; detail: string } | null {
  const magicInitiate = ref.name.match(/^Magic Initiate\s*\(([^)]+)\)$/i);
  if (magicInitiate) {
    return {
      name: "Magic Initiate",
      detail: `Imported specialization: ${magicInitiate[1].trim()}`,
    };
  }
  return null;
}

function compatibilityPriority(value: RulesCompatibility): number {
  switch (value) {
    case "core-2024":
      return 3;
    case "current-2024-compatible":
      return 2;
    case "legacy":
      return 1;
  }
}

function reconcileRef(
  path: string,
  imported: RuleRef,
  catalog: CatalogRecord[],
  selectionState: "confirmed" | "unresolved-required-choice" = "confirmed",
): ReconciliationEntry {
  if (selectionState === "unresolved-required-choice") {
    return {
      path,
      imported,
      status: "unresolved-import-choice",
      canonical: null,
      compatibility: null,
      acceptedByCurrentRulesPolicy: false,
      aliasDetail: "The source offered required options but did not record a selected value.",
      requiresDecision: true,
    };
  }

  const derivedDetail = imported.kind === "feat" ? derivedGrantDetail(imported) : null;
  if (derivedDetail) {
    return {
      path,
      imported,
      status: "derived-grant",
      canonical: null,
      compatibility: "core-2024",
      acceptedByCurrentRulesPolicy: true,
      aliasDetail: derivedDetail,
      requiresDecision: false,
    };
  }

  const alias = aliasFor(imported);
  const targetName = alias?.name ?? imported.name;
  const normalizedTarget = normalizeRuleName(targetName);
  const candidates = catalog.filter(
    (record) =>
      record.kind === imported.kind && normalizeRuleName(record.name) === normalizedTarget,
  );

  if (candidates.length === 0) {
    return {
      path,
      imported,
      status: "missing",
      canonical: null,
      compatibility: null,
      acceptedByCurrentRulesPolicy: false,
      aliasDetail: alias?.detail ?? null,
      requiresDecision: true,
    };
  }

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      compatibility: classifyRulesCompatibility(candidate),
    }))
    .sort(
      (left, right) =>
        compatibilityPriority(right.compatibility) - compatibilityPriority(left.compatibility),
    );
  const bestPriority = compatibilityPriority(ranked[0].compatibility);
  const best = ranked.filter(
    (candidate) => compatibilityPriority(candidate.compatibility) === bestPriority,
  );
  if (best.length > 1) {
    return {
      path,
      imported,
      status: "ambiguous",
      canonical: null,
      compatibility: null,
      acceptedByCurrentRulesPolicy: false,
      aliasDetail: alias?.detail ?? null,
      requiresDecision: true,
    };
  }

  const match = best[0];
  return {
    path,
    imported,
    status: alias ? "resolved-alias" : "resolved",
    canonical: match.candidate,
    compatibility: match.compatibility,
    acceptedByCurrentRulesPolicy: isAcceptedByCurrentRulesPolicy(match.compatibility),
    aliasDetail: alias?.detail ?? null,
    requiresDecision: !isAcceptedByCurrentRulesPolicy(match.compatibility),
  };
}

export function reconcileCharacterBuild(
  build: CharacterBuild,
  catalog: CatalogRecord[],
): CharacterReconciliationReport {
  const refs: Array<{
    path: string;
    ref: RuleRef;
    selectionState?: "confirmed" | "unresolved-required-choice";
  }> = [
    { path: "species", ref: build.speciesRef },
    { path: "background", ref: build.backgroundRef },
  ];

  const seenClasses = new Set<string>();
  for (const level of build.levels) {
    if (!seenClasses.has(level.classRef.id)) {
      refs.push({ path: `classes.${seenClasses.size}`, ref: level.classRef });
      seenClasses.add(level.classRef.id);
    }
  }
  build.subclasses.forEach((subclass, index) => {
    refs.push({ path: `subclasses.${index}`, ref: subclass.subclassRef });
  });
  build.choices.forEach((choice, index) => {
    refs.push({
      path: `choices.${index}`,
      ref: choice.selection,
      selectionState: choice.selectionState,
    });
  });

  const entries = refs.map(({ path, ref, selectionState }) =>
    reconcileRef(path, ref, catalog, selectionState),
  );
  const blockingEntries = entries.filter(
    (entry) =>
      entry.status === "missing" ||
      entry.status === "ambiguous" ||
      entry.status === "unresolved-import-choice",
  );
  const decisionEntries = entries.filter((entry) => entry.requiresDecision);
  const classEntries = entries.filter(
    (entry) => entry.imported.kind === "class" || entry.imported.kind === "subclass",
  );

  return {
    entries,
    blockingEntries,
    decisionEntries,
    classProgressionReady:
      classEntries.length > 0 &&
      classEntries.every(
        (entry) => entry.status === "resolved" || entry.status === "resolved-alias",
      ),
  };
}

function canonicalRuleRef(entry: ReconciliationEntry): RuleRef | null {
  if (!entry.canonical || (entry.status !== "resolved" && entry.status !== "resolved-alias")) {
    return null;
  }
  return {
    kind: entry.canonical.kind,
    id: entry.canonical.id,
    name: entry.canonical.name,
    ruleset: "2024",
    sourceId: entry.canonical.sourceId,
    verification: entry.acceptedByCurrentRulesPolicy ? "verified" : "imported-unverified",
  };
}

/**
 * Replaces imported identifiers with stable catalog identifiers. Compatibility
 * decisions are intentionally not hidden: legacy matches remain unverified.
 */
export function applyCanonicalReconciliation(
  build: CharacterBuild,
  report: CharacterReconciliationReport,
): CharacterBuild {
  const replacements = new Map<string, RuleRef>();
  for (const entry of report.entries) {
    const canonical = canonicalRuleRef(entry);
    if (canonical) replacements.set(`${entry.imported.kind}:${entry.imported.id}`, canonical);
  }
  const replace = (ref: RuleRef): RuleRef => replacements.get(`${ref.kind}:${ref.id}`) ?? ref;

  const levels = build.levels.map((level) => ({ ...level, classRef: replace(level.classRef) }));
  const classIds = new Map(
    build.levels.map((level, index) => [level.classRef.id, levels[index].classRef.id]),
  );

  return CharacterBuildSchema.parse({
    ...build,
    contentRevision: "workspace-canonical-current",
    revision: build.revision + 1,
    speciesRef: replace(build.speciesRef),
    backgroundRef: replace(build.backgroundRef),
    levels,
    subclasses: build.subclasses.map((subclass) => ({
      ...subclass,
      classRefId: classIds.get(subclass.classRefId) ?? subclass.classRefId,
      subclassRef: replace(subclass.subclassRef),
    })),
    choices: build.choices.map((choice) => ({
      ...choice,
      selection: replace(choice.selection),
    })),
  });
}
