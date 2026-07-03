import { normalizeRuleName } from "../character-v2/reconcile";
import { CharacterAggregateSchema, type CharacterAggregate } from "./schema";
import {
  CapabilityChoiceOptionSchema,
  CapabilityChoiceRequirementSchema,
  isCapabilityChoiceOptionEligible,
  type CapabilityChoiceOption,
  type CapabilityChoiceRequirement,
} from "./capability-choices";

export type CapabilityReadinessReport = {
  characterId: string;
  buildRevision: number;
  readyForNativeCapabilityAuthority: boolean;
  remainingCapabilityCount: number;
  remainingByKind: Record<string, number>;
  pendingChoiceRequirementCount: number;
  pendingChoiceSlotCount: number;
  maximumChoiceCoverage: number;
  minimumUnresolvedAfterChoices: number;
  remainingCapabilities: Array<{ id: string; kind: string; label: string; value: number | null }>;
  definiteUnexplained: Array<{ id: string; kind: string; label: string }>;
  candidates: Array<{
    capabilityId: string;
    requirementIds: string[];
  }>;
};

function canSatisfy(
  capability: NonNullable<CharacterAggregate["migrationBaseline"]>["capabilities"][number],
  requirement: CapabilityChoiceRequirement,
  options: CapabilityChoiceOption[],
) {
  if (capability.kind !== requirement.kind) return false;
  return options.some(
    (option) =>
      normalizeRuleName(option.capabilityLabel) === normalizeRuleName(capability.label) &&
      isCapabilityChoiceOptionEligible(requirement, option),
  );
}

export function buildCapabilityReadinessReport(input: {
  character: CharacterAggregate;
  requirements: CapabilityChoiceRequirement[];
  options: CapabilityChoiceOption[];
}): CapabilityReadinessReport {
  const character = CharacterAggregateSchema.parse(input.character);
  const requirements = input.requirements.map((entry) =>
    CapabilityChoiceRequirementSchema.parse(entry),
  );
  const options = input.options.map((entry) => CapabilityChoiceOptionSchema.parse(entry));
  const capabilities = character.migrationBaseline?.capabilities ?? [];
  const remainingByKind: Record<string, number> = {};
  capabilities.forEach((capability) => {
    remainingByKind[capability.kind] = (remainingByKind[capability.kind] ?? 0) + 1;
  });

  const slots = requirements.flatMap((requirement) =>
    Array.from({ length: requirement.count }, (_, index) => ({ requirement, index })),
  );
  const edges = capabilities.map((capability) =>
    slots
      .map((slot, index) => (canSatisfy(capability, slot.requirement, options) ? index : -1))
      .filter((index) => index >= 0),
  );
  const capabilityForSlot = new Map<number, number>();
  const assign = (capabilityIndex: number, visited: Set<number>): boolean => {
    for (const slotIndex of edges[capabilityIndex]) {
      if (visited.has(slotIndex)) continue;
      visited.add(slotIndex);
      const previous = capabilityForSlot.get(slotIndex);
      if (previous === undefined || assign(previous, visited)) {
        capabilityForSlot.set(slotIndex, capabilityIndex);
        return true;
      }
    }
    return false;
  };
  let maximumChoiceCoverage = 0;
  capabilities.forEach((_, index) => {
    if (assign(index, new Set())) maximumChoiceCoverage += 1;
  });

  const candidates = capabilities.map((capability) => ({
    capabilityId: capability.id,
    requirementIds: requirements
      .filter((requirement) => canSatisfy(capability, requirement, options))
      .map((requirement) => requirement.id),
  }));
  return {
    characterId: character.identity.id,
    buildRevision: character.build.revision,
    readyForNativeCapabilityAuthority: capabilities.length === 0,
    remainingCapabilityCount: capabilities.length,
    remainingByKind,
    pendingChoiceRequirementCount: requirements.length,
    pendingChoiceSlotCount: slots.length,
    maximumChoiceCoverage,
    minimumUnresolvedAfterChoices: capabilities.length - maximumChoiceCoverage,
    remainingCapabilities: capabilities.map((capability) => ({
      id: capability.id,
      kind: capability.kind,
      label: capability.label,
      value: capability.value,
    })),
    definiteUnexplained: capabilities
      .filter((_, index) => edges[index].length === 0)
      .map((capability) => ({
        id: capability.id,
        kind: capability.kind,
        label: capability.label,
      })),
    candidates,
  };
}
