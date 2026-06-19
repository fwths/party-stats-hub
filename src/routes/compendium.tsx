import { createFileRoute } from "@tanstack/react-router";
import { getClassesFromDb, getSpeciesFromDb } from "@/lib/db-functions";

export const Route = createFileRoute("/compendium")({
  loader: async () => {
    const dbClasses = await getClassesFromDb();
    const dbSpecies = await getSpeciesFromDb();
    return { dbClasses, dbSpecies };
  },
});
