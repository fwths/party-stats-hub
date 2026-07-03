import {
  CharacterAggregateSchema,
  maximumHitPoints,
  type CharacterAggregate,
  type ExactRuleRef,
} from "./schema";
import { isDdbConfirmedCurrentSheetFoundation } from "./current-sheet-authority";

export type V3ReconstructableFacts = {
  identity: CharacterAggregate["identity"];
  profile: CharacterAggregate["profile"];
  rulesContext: CharacterAggregate["build"]["rulesContext"];
  revisions: { build: number; liveState: number };
  progression: {
    species: ExactRuleRef;
    background: ExactRuleRef;
    levels: CharacterAggregate["build"]["levels"];
    subclasses: CharacterAggregate["build"]["subclasses"];
    decisions: CharacterAggregate["build"]["decisions"];
  };
  abilities: CharacterAggregate["build"]["abilityBasis"];
  hitPoints: {
    ledger: CharacterAggregate["hitPoints"];
    maximum: number;
    current: number;
    temporary: number;
  };
  liveState: CharacterAggregate["liveState"];
  spells: CharacterAggregate["build"]["spells"];
  items: CharacterAggregate["items"];
  overrides: CharacterAggregate["build"]["overrides"];
};

export type ReconstructionDomain =
  | "authored-facts"
  | "rule-identity"
  | "abilities"
  | "hit-points"
  | "live-resources"
  | "spellbook"
  | "inventory"
  | "capabilities"
  | "hit-dice"
  | "derived-sheet";

export type ReconstructionBlocker = {
  code: string;
  domain: ReconstructionDomain;
  path: string;
  message: string;
  needsPlayerDecision: boolean;
};

export type V3ReconstructionReadinessReport = {
  characterId: string;
  characterName: string;
  buildRevision: number;
  liveStateRevision: number;
  readyForDdbIndependentSheet: boolean;
  authoritativeDomains: ReconstructionDomain[];
  blockedDomains: ReconstructionDomain[];
  blockers: ReconstructionBlocker[];
};

export type MagicItemMechanicsAuditEntry = {
  itemId: string;
  name: string;
  path: string;
  definitionVersionKey: string | null;
  mechanicsModeled: boolean;
  reasons: string[];
};

export function projectV3ReconstructableFacts(raw: unknown): V3ReconstructableFacts {
  const character = CharacterAggregateSchema.parse(raw);
  return {
    identity: character.identity,
    profile: character.profile,
    rulesContext: character.build.rulesContext,
    revisions: { build: character.build.revision, liveState: character.liveState.revision },
    progression: {
      species: character.build.speciesRef,
      background: character.build.backgroundRef,
      levels: character.build.levels,
      subclasses: character.build.subclasses,
      decisions: character.build.decisions,
    },
    abilities: character.build.abilityBasis,
    hitPoints: {
      ledger: character.hitPoints,
      maximum: maximumHitPoints(character.hitPoints),
      current: character.liveState.currentHp,
      temporary: character.liveState.temporaryHp,
    },
    liveState: character.liveState,
    spells: character.build.spells,
    items: character.items,
    overrides: character.build.overrides,
  };
}

export function auditMagicItemMechanics(raw: unknown): MagicItemMechanicsAuditEntry[] {
  const character = CharacterAggregateSchema.parse(raw);
  return character.items
    .map((item, index): MagicItemMechanicsAuditEntry | null => {
      if (item.details?.magic !== true && item.charges === null) return null;
      const reasons: string[] = [];
      const hasVerifiedItemCharges =
        item.charges?.provenance === "verified-rule" &&
        item.definitionRef !== null &&
        item.charges.sourceVersionKey === item.definitionRef.versionKey;
      const isCuratedSendingStones =
        item.name === "Sending Stones" && hasVerifiedItemCharges && item.charges?.maximum === 1;
      if (item.definitionRef === null) {
        reasons.push("missing exact item definition");
      }
      if (item.details?.magic === true && item.provenance === "imported" && !isCuratedSendingStones) {
        reasons.push("imported magic-item effects are display-only");
      }
      if (item.charges === null) {
        reasons.push("charges are not modeled");
      } else if (item.charges.provenance !== "verified-rule") {
        reasons.push("charges are not verified against an exact rule");
      } else if (item.definitionRef && item.charges.sourceVersionKey !== item.definitionRef.versionKey) {
        reasons.push("verified charges are not sourced from the item definition");
      }
      return {
        itemId: item.id,
        name: item.name,
        path: `items.${index}`,
        definitionVersionKey: item.definitionRef?.versionKey ?? null,
        mechanicsModeled: reasons.length === 0,
        reasons,
      };
    })
    .filter((entry): entry is MagicItemMechanicsAuditEntry => entry !== null);
}

function collectRuleRefs(
  character: CharacterAggregate,
): Array<{ path: string; ref: ExactRuleRef }> {
  const refs: Array<{ path: string; ref: ExactRuleRef }> = [
    { path: "build.speciesRef", ref: character.build.speciesRef },
    { path: "build.backgroundRef", ref: character.build.backgroundRef },
  ];
  character.build.levels.forEach((level, index) =>
    refs.push({ path: `build.levels.${index}.classRef`, ref: level.classRef }),
  );
  character.build.subclasses.forEach((subclass, index) =>
    refs.push({ path: `build.subclasses.${index}.subclassRef`, ref: subclass.subclassRef }),
  );
  character.build.decisions.forEach((decision, decisionIndex) => {
    if (decision.type !== "rule-selection") return;
    decision.selections.forEach((ref, selectionIndex) =>
      refs.push({ path: `build.decisions.${decisionIndex}.selections.${selectionIndex}`, ref }),
    );
  });
  character.build.spells.forEach((spell, index) => {
    refs.push({ path: `build.spells.${index}.spellRef`, ref: spell.spellRef });
    if (spell.grantSourceRef) {
      refs.push({ path: `build.spells.${index}.grantSourceRef`, ref: spell.grantSourceRef });
    }
  });
  character.items.forEach((item, index) => {
    if (item.definitionRef)
      refs.push({ path: `items.${index}.definitionRef`, ref: item.definitionRef });
  });
  character.hitPoints.gains.forEach((gain, gainIndex) =>
    gain.bonuses.forEach((bonus, bonusIndex) => {
      if (bonus.sourceRef) {
        refs.push({
          path: `hitPoints.gains.${gainIndex}.bonuses.${bonusIndex}.sourceRef`,
          ref: bonus.sourceRef,
        });
      }
    }),
  );
  character.liveState.conditions.forEach((condition, index) => {
    if (condition.conditionRef) {
      refs.push({
        path: `liveState.conditions.${index}.conditionRef`,
        ref: condition.conditionRef,
      });
    }
  });
  return refs;
}

function isAuthorized(character: CharacterAggregate, ref: ExactRuleRef): boolean {
  if (ref.verification === "verified" || ref.verification === "custom") return true;
  return character.resolutions.some(
    (resolution) =>
      resolution.type === "content-version-decision" &&
      (resolution.importedVersionKey === ref.versionKey ||
        resolution.selectedVersionKey === ref.versionKey),
  );
}

export function buildV3ReconstructionReadinessReport(
  raw: unknown,
): V3ReconstructionReadinessReport {
  const character = CharacterAggregateSchema.parse(raw);
  const blockers: ReconstructionBlocker[] = [];
  const add = (
    code: string,
    domain: ReconstructionDomain,
    path: string,
    message: string,
    needsPlayerDecision = false,
  ) => blockers.push({ code, domain, path, message, needsPlayerDecision });

  character.migrationIssues.forEach((issue, index) => {
    if (issue.severity === "blocking") {
      add(issue.code, "rule-identity", `migrationIssues.${index}`, issue.message);
    }
  });
  collectRuleRefs(character).forEach(({ path, ref }) => {
    if (!isAuthorized(character, ref)) {
      add(
        "unverified-rule-reference",
        path.includes("spells")
          ? "spellbook"
          : path.includes("items")
            ? "inventory"
            : "rule-identity",
        path,
        `${ref.name} (${ref.versionKey}) is not verified or explicitly accepted`,
        true,
      );
    }
  });
  if (
    !character.build.abilityBasis.verified &&
    !isDdbConfirmedCurrentSheetFoundation(character, character.build.abilityBasis)
  ) {
    add(
      "unverified-ability-basis",
      "abilities",
      "build.abilityBasis",
      "Ability scores are DDB-confirmed current-sheet truth but are not yet reconstructed from native build choices",
    );
  }
  if (
    !character.hitPoints.baseline.verified &&
    !isDdbConfirmedCurrentSheetFoundation(character, character.hitPoints.baseline)
  ) {
    add(
      "unverified-hp-baseline",
      "hit-points",
      "hitPoints.baseline",
      "Historical maximum HP is DDB-confirmed current-sheet truth but is not yet reconstructed from native level-by-level HP choices",
    );
  }
  character.liveState.resources.forEach((resource, index) => {
    if (
      resource.provenance === "imported-unverified" ||
      (resource.provenance === "verified-rule" && resource.sourceVersionKey === null)
    ) {
      add(
        "resource-without-rule-source",
        "live-resources",
        `liveState.resources.${index}`,
        `${resource.label} has no exact rule source`,
      );
    }
  });
  character.items.forEach((item, index) => {
    if (item.provenance === "imported" && item.definitionRef === null) {
      add(
        "imported-item-without-definition",
        "inventory",
        `items.${index}`,
        `${item.name} has no exact item definition`,
      );
    }
    if (item.provenance === "imported" && item.details?.magic === true && item.charges === null) {
      add(
        "imported-magic-item-mechanics-unmodeled",
        "inventory",
        `items.${index}`,
        `${item.name} is an imported magic item whose rule effects, bonuses, charges, or recharge behavior are not yet modeled natively`,
      );
    }
    if (
      item.charges &&
      (item.charges.provenance === "imported-unverified" ||
        (item.charges.provenance === "verified-rule" && item.charges.sourceVersionKey === null))
    ) {
      add(
        "item-charges-without-rule-source",
        "inventory",
        `items.${index}.charges`,
        `${item.name} charges have no exact rule source`,
      );
    }
  });
  (character.migrationBaseline?.capabilities ?? []).forEach((capability, index) =>
    add(
      "imported-capability-unreconciled",
      "capabilities",
      `migrationBaseline.capabilities.${index}`,
      `${capability.kind} ${capability.label} is DDB-confirmed current-sheet truth but lacks exact native source provenance`,
    ),
  );

  if (character.liveState.hitDice.status === "unavailable") {
    add(
      "hit-dice-live-state-unavailable",
      "hit-dice",
      "liveState.hitDice",
      character.liveState.hitDice.reason,
    );
  } else {
    character.liveState.hitDice.pools.forEach((pool, index) => {
      if (pool.provenance === "imported-unverified") {
        add(
          "unverified-hit-die-pool",
          "hit-dice",
          `liveState.hitDice.pools.${index}`,
          `The d${pool.die} hit-die pool still requires confirmation from its exact class version`,
        );
      }
    });
  }
  for (const field of [
    "armor-class",
    "initiative",
    "speed",
    "skills",
    "saving-throws",
    "attacks",
    "spell-slots",
    "unlocked-features",
  ]) {
    add(
      `native-compiler-missing:${field}`,
      "derived-sheet",
      `compiledSheet.${field}`,
      `${field} is not yet derived from V3 plus the versioned rules catalog`,
    );
  }

  const domains: ReconstructionDomain[] = [
    "authored-facts",
    "rule-identity",
    "abilities",
    "hit-points",
    "live-resources",
    "spellbook",
    "inventory",
    "capabilities",
    "hit-dice",
    "derived-sheet",
  ];
  const blocked = new Set(blockers.map((blocker) => blocker.domain));
  return {
    characterId: character.identity.id,
    characterName: character.identity.name,
    buildRevision: character.build.revision,
    liveStateRevision: character.liveState.revision,
    readyForDdbIndependentSheet: blockers.length === 0,
    authoritativeDomains: domains.filter((domain) => !blocked.has(domain)),
    blockedDomains: domains.filter((domain) => blocked.has(domain)),
    blockers,
  };
}
