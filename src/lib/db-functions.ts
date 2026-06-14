import { createServerFn } from "@tanstack/react-start";

export const getClassesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("./drizzle.server");
  const { classes } = await import("../db/schema");
  return await db.select().from(classes);
});

export const getSpellsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("./drizzle.server");
  const { spells } = await import("../db/schema");
  return await db.select().from(spells);
});

export const getFeatsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("./drizzle.server");
  const { feats } = await import("../db/schema");
  return await db.select().from(feats);
});

export const getSpeciesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("./drizzle.server");
  const { species } = await import("../db/schema");
  return await db.select().from(species);
});

export const getSubclassesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("./drizzle.server");
  const { subclasses } = await import("../db/schema");
  return await db.select().from(subclasses);
});
