import { createFileRoute } from "@tanstack/react-router";
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
} from "@/lib/db-functions";

export const Route = createFileRoute("/builder")({
  loader: async () => {
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
    };
  },
});

