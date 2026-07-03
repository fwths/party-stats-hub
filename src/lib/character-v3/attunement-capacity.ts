import type { ExactRuleRef } from "./schema";

const CAPACITY_BY_FEATURE_ID = new Map<string, number>([
  ["magic-item-adept", 4],
  ["artificer-magic-item-adept-10", 4],
  ["advanced-artifice", 5],
  ["artificer-advanced-artifice-14", 5],
  ["magic-item-master", 6],
  ["artificer-magic-item-master-18", 6],
]);

export type AttunementCapacityReplacement = {
  sourceRef: ExactRuleRef;
  maximum: number;
};

export function authoritativeAttunementCapacityForFeature(
  feature: Pick<ExactRuleRef, "kind" | "upstreamId" | "verification">,
): number | null {
  if (feature.kind !== "feature" || feature.verification !== "verified") return null;
  return CAPACITY_BY_FEATURE_ID.get(feature.upstreamId) ?? null;
}

export function deriveAttunementCapacityReplacements(
  unlockedFeatures: ExactRuleRef[],
): AttunementCapacityReplacement[] {
  return unlockedFeatures.flatMap((sourceRef) => {
    const maximum = authoritativeAttunementCapacityForFeature(sourceRef);
    return maximum === null ? [] : [{ sourceRef, maximum }];
  });
}
