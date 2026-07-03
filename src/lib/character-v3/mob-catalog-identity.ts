import type { ExactRuleRef } from "./schema";

const CLASS_IDENTITIES: Record<string, { upstreamId: string; sourceId: string }> = {
  "ddb:class:2656866": { upstreamId: "artificer", sourceId: "EFA" },
  "ddb:class:2190884": { upstreamId: "sorcerer", sourceId: "XPHB" },
  "ddb:class:2190876": { upstreamId: "bard", sourceId: "XPHB" },
  "ddb:class:2190878": { upstreamId: "druid", sourceId: "XPHB" },
  "ddb:class:2190875": { upstreamId: "barbarian", sourceId: "XPHB" },
};

const SUBCLASS_IDENTITIES: Record<string, { upstreamId: string; sourceId: string }> = {
  "ddb:subclass:2656869": { upstreamId: "artificer-armorer", sourceId: "EFA" },
  "ddb:subclass:2190988": { upstreamId: "sorcerer-aberrant", sourceId: "XPHB" },
  "ddb:subclass:2190913": { upstreamId: "bard-glamour", sourceId: "XPHB" },
  "ddb:subclass:2190919": { upstreamId: "druid-stars", sourceId: "XPHB" },
  "ddb:subclass:2190889": { upstreamId: "barbarian-wild-heart", sourceId: "XPHB" },
};

function resolve(
  ref: ExactRuleRef,
  identities: Record<string, { upstreamId: string; sourceId: string }>,
) {
  const identity = identities[ref.upstreamId];
  return identity ? { ...ref, ...identity } : ref;
}

export function resolveMobCatalogClassIdentity(ref: ExactRuleRef): ExactRuleRef {
  return resolve(ref, CLASS_IDENTITIES);
}

export function resolveMobCatalogSubclassIdentity(ref: ExactRuleRef): ExactRuleRef {
  return resolve(ref, SUBCLASS_IDENTITIES);
}
