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

export const getMonstersFromDb = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("./drizzle.server");
  const { monsters } = await import("../db/schema");
  return await db.select().from(monsters);
});

export const getMagicItemsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("./drizzle.server");
  const { magicItems } = await import("../db/schema");
  return await db.select().from(magicItems);
});

export const getWeaponsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("./drizzle.server");
  const { weapons } = await import("../db/schema");
  return await db.select().from(weapons);
});

export const getArmorFromDb = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("./drizzle.server");
  const { armor } = await import("../db/schema");
  return await db.select().from(armor);
});
