import { createFileRoute } from "@tanstack/react-router";
import {
  getBackgroundsFromDb,
  getClassFeaturesFromDb,
  getClassSpellsFromDb,
  getClassesFromDb,
  getFeatsFromDb,
  getSpeciesFromDb,
  getSpellsFromDb,
  getSubclassesFromDb,
} from "@/lib/db-functions";

export const Route = createFileRoute("/builder")({
  loader: async () => {
    const classes = await getClassesFromDb();
    const species = await getSpeciesFromDb();
    const subclasses = await getSubclassesFromDb();
    const backgrounds = await getBackgroundsFromDb();
    const feats = await getFeatsFromDb();
    const spells = await getSpellsFromDb();
    const classSpells = await getClassSpellsFromDb();
    const classFeatures = await getClassFeaturesFromDb();
    return { classes, species, subclasses, backgrounds, feats, spells, classSpells, classFeatures };
  },
});
