import { describe, expect, it } from "vitest";
import type { CharacterBuild } from "./schema";
import {
  hasInitiativeAdvantage,
  hitPointsPerCharacterLevel,
  resolveCharacterRuleEffects,
} from "./rule-effects";

function baseBuild(): CharacterBuild {
  const ref = (kind: "species" | "background" | "class", id: string) => ({
    kind,
    id,
    name: id,
    ruleset: "2024" as const,
    sourceId: "TEST",
    verification: "verified" as const,
  });
  return {
    schemaVersion: 2,
    ruleset: "2024",
    contentRevision: "test",
    revision: 1,
    speciesRef: ref("species", "human"),
    backgroundRef: ref("background", "sage"),
    abilityBasis: {
      method: "standard-array",
      scores: { STR: 8, DEX: 14, CON: 13, INT: 15, WIS: 12, CHA: 10 },
      verified: true,
    },
    levels: [
      {
        characterLevel: 1,
        classLevel: 1,
        classRef: ref("class", "wizard"),
        hpGain: 6,
        reconstruction: "native",
      },
    ],
    subclasses: [],
    choices: [],
    overrides: [],
  };
}

describe("Character V2 canonical rule effects", () => {
  it("derives HP and initiative behavior from catalog metadata rather than names", () => {
    const build = {
      ...baseBuild(),
      choices: [
        {
          id: "choice:durable",
          groupId: "feats",
          selection: {
            kind: "feat" as const,
            id: "durable-rule-id",
            name: "Any Display Name",
            ruleset: "2024" as const,
            sourceId: "TEST",
            verification: "verified" as const,
          },
          grantedAtCharacterLevel: 1,
          provenance: "native" as const,
          selectionState: "confirmed" as const,
        },
      ],
    };
    const effects = resolveCharacterRuleEffects({
      build,
      grantedFeatureIds: ["fast-start"],
      catalog: [
        {
          id: "durable-rule-id",
          name: "Not Tough",
          kind: "feat",
          foundryJson: JSON.stringify({
            effects: [
              {
                changes: [{ key: "system.attributes.hp.bonuses.level", mode: "ADD", value: 2 }],
              },
            ],
          }),
        },
        {
          id: "fast-start",
          name: "Not Feral Instinct",
          kind: "feature",
          foundryJson: JSON.stringify({
            effects: [
              {
                changes: [{ key: "flags.dnd5e.initiativeAdv", mode: "OVERRIDE", value: true }],
              },
            ],
          }),
        },
      ],
    });

    expect(hitPointsPerCharacterLevel(effects)).toBe(2);
    expect(hasInitiativeAdvantage(effects)).toBe(true);
    expect(effects.map((effect) => effect.source.id)).toEqual(["durable-rule-id", "fast-start"]);
  });

  it("does not infer effects from prose, display names, or malformed metadata", () => {
    const effects = resolveCharacterRuleEffects({
      build: baseBuild(),
      grantedFeatureIds: ["looks-like-tough", "broken"],
      catalog: [
        {
          id: "looks-like-tough",
          name: "Tough",
          kind: "feature",
          foundryJson: JSON.stringify({ effects: [], description: "Gain more hit points." }),
        },
        {
          id: "broken",
          name: "Broken",
          kind: "feature",
          foundryJson: "not-json",
        },
      ],
    });
    expect(effects).toEqual([]);
  });
});
