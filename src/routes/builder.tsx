import { createFileRoute } from "@tanstack/react-router";
import type { ForgeData } from "@/lib/forge/forge-data";
import {
  getBackgroundsFromDb,
  getActiveEffectsFromDb,
  getClassFeaturesFromDb,
  getClassSpellsFromDb,
  getClassesFromDb,
  getFeatureActiveEffectsFromDb,
  getFeatsFromDb,
  getLanguagesFromDb,
  getSpeciesFromDb,
  getSpellsFromDb,
  getSubclassesFromDb,
  getItemActiveEffectsFromDb,
  getSpellActiveEffectsFromDb,
  getMagicItemsFromDb,
  getSpeciesVariantsFromDb,
  getWeaponsFromDb,
  getArmorFromDb,
  getChallengeRatingsFromDb,
  getCharOptionsFromDb,
  getConditionsFromDb,
  getCreatureBuilderEntriesFromDb,
  getItemCardReferencesFromDb,
  getItemGroupsFromDb,
  getItemPropertiesFromDb,
  getItemTypeAdditionalEntriesFromDb,
  getItemTypesFromDb,
  getMagicVariantsFromDb,
  getMundaneGearFromDb,
  getOptionalFeaturesFromDb,
  getRulesActionsFromDb,
  getSensesFromDb,
  getSkillsFromDb,
  getWeaponMasteriesFromDb,
} from "@/lib/db-functions";

export const Route = createFileRoute("/builder")({
  loader: async (): Promise<ForgeData> => {
    const classes = await getClassesFromDb();
    const species = await getSpeciesFromDb();
    const speciesVariants = await getSpeciesVariantsFromDb();
    const subclasses = await getSubclassesFromDb();
    const backgrounds = await getBackgroundsFromDb();
    const feats = await getFeatsFromDb();
    const spells = await getSpellsFromDb();
    const classSpells = await getClassSpellsFromDb();
    const classFeatures = await getClassFeaturesFromDb();
    const languages = await getLanguagesFromDb();
    const activeEffects = await getActiveEffectsFromDb();
    const featureActiveEffects = await getFeatureActiveEffectsFromDb();
    const itemActiveEffects = await getItemActiveEffectsFromDb();
    const spellActiveEffects = await getSpellActiveEffectsFromDb();
    const magicItems = await getMagicItemsFromDb();
    const weapons = await getWeaponsFromDb();
    const armor = await getArmorFromDb();
    const skills = await getSkillsFromDb();
    const senses = await getSensesFromDb();
    const conditions = await getConditionsFromDb();
    const rulesActions = await getRulesActionsFromDb();
    const optionalFeatures = await getOptionalFeaturesFromDb();
    const charOptions = await getCharOptionsFromDb();
    const mundaneGear = await getMundaneGearFromDb();
    const weaponMasteries = await getWeaponMasteriesFromDb();
    const itemProperties = await getItemPropertiesFromDb();
    const itemTypes = await getItemTypesFromDb();
    const itemTypeAdditionalEntries = await getItemTypeAdditionalEntriesFromDb();
    const itemGroups = await getItemGroupsFromDb();
    const magicVariants = await getMagicVariantsFromDb();
    const itemCardReferences = await getItemCardReferencesFromDb();
    const challengeRatings = await getChallengeRatingsFromDb();
    const creatureBuilderEntries = await getCreatureBuilderEntriesFromDb();

    return {
      classes,
      species,
      speciesVariants,
      subclasses,
      backgrounds,
      feats,
      spells,
      classSpells,
      classFeatures,
      languages,
      activeEffects,
      featureActiveEffects,
      itemActiveEffects,
      spellActiveEffects,
      magicItems,
      weapons,
      armor,
      skills,
      senses,
      conditions,
      rulesActions,
      optionalFeatures,
      charOptions,
      mundaneGear,
      weaponMasteries,
      itemProperties,
      itemTypes,
      itemTypeAdditionalEntries,
      itemGroups,
      magicVariants,
      itemCardReferences,
      challengeRatings,
      creatureBuilderEntries,
    };
  },
});
