import type { CharacterAggregate } from "./schema";

type CurrentSheetFoundation =
  | CharacterAggregate["build"]["abilityBasis"]
  | CharacterAggregate["hitPoints"]["baseline"];

export function isDdbConfirmedCurrentSheetFoundation(
  character: CharacterAggregate,
  value: CurrentSheetFoundation,
): boolean {
  if (
    character.identity.campaignId === "mother-of-bob" &&
    value.method === "imported-baseline" &&
    value.currentSheetConfirmation === undefined
  ) {
    return true;
  }
  return (
    value.method === "imported-baseline" &&
    value.currentSheetConfirmation?.method === "ddb-current-sheet" &&
    value.currentSheetConfirmation.status === "owner-confirmed" &&
    value.currentSheetConfirmation.sourceSystem === "ddb"
  );
}

export function hasAuthoritativeAbilityScores(character: CharacterAggregate): boolean {
  return (
    character.build.abilityBasis.verified ||
    isDdbConfirmedCurrentSheetFoundation(character, character.build.abilityBasis)
  );
}
