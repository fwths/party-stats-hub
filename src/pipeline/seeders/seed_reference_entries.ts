import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import { renderEntries, slugify } from "../5etools-utils";
import { getSourcePriority, isSourceAllowed } from "../source-config";

type BaseItem = {
  name: string;
  source: string;
  edition?: string;
  page?: number;
  entries?: unknown;
  [key: string]: unknown;
};

function readArray<T>(fileName: string, key: string): T[] {
  const filePath = path.join(process.cwd(), "new data", fileName);
  if (!fs.existsSync(filePath)) return [];
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return data[key] || [];
}

function selectAllowed<T extends BaseItem>(items: T[]): T[] {
  const selected = new Map<string, T>();

  for (const item of items) {
    if (!item.name || !item.source || !isSourceAllowed(item.source)) continue;
    const key = item.name.toLowerCase();
    const existing = selected.get(key);
    const existingPriority = existing ? getSourcePriority(existing.source, existing.edition) : -1;
    const priority = getSourcePriority(item.source, item.edition);
    if (!existing || priority > existingPriority) selected.set(key, item);
  }

  return [...selected.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function descriptionFor(item: BaseItem): string {
  return renderEntries(item.entries || item.entry || item.instructions || item.actionEntries);
}

export async function seedReferenceEntries(db: any) {
  console.log("Seeding canonical typed reference tables from 5etools...");

  const BATCH_SIZE = 1000;

  // 1. Character Options
  const rawCharOptions = selectAllowed(
    readArray<BaseItem>("charcreationoptions.json", "charoption"),
  );
  const charOptionRows = rawCharOptions.map((item) => {
    const id = slugify(item.name);
    return {
      id,
      name: item.name,
      source: item.source,
      page: item.page || null,
      optionTypeJson: JSON.stringify(item.optionType || []),
      description: descriptionFor(item),
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < charOptionRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.charOptions)
      .values(charOptionRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${rawCharOptions.length} character options.`);

  // 2. Optional Features
  const rawOptionalFeatures = selectAllowed(
    readArray<BaseItem>("optionalfeatures.json", "optionalfeature"),
  );
  const optionalFeatureRows = rawOptionalFeatures.map((item) => {
    const id = slugify(item.name);
    return {
      id,
      name: item.name,
      source: item.source,
      page: item.page || null,
      featureTypeJson: JSON.stringify(item.featureType || []),
      prerequisite: item.prerequisite ? renderEntries(item.prerequisite) : null,
      description: descriptionFor(item),
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < optionalFeatureRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.optionalFeatures)
      .values(optionalFeatureRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${rawOptionalFeatures.length} optional features.`);

  // 3. Deities
  const rawDeities = selectAllowed(readArray<BaseItem>("deities.json", "deity"));
  const deityRows = rawDeities.map((item) => {
    const id = slugify(item.name);
    return {
      id,
      name: item.name,
      source: item.source,
      page: item.page || null,
      pantheon: (item.pantheon as string) || null,
      alignmentJson: JSON.stringify(item.alignment || []),
      category: (item.category as string) || null,
      domainsJson: JSON.stringify(item.domains || []),
      province: (item.province as string) || null,
      symbol: (item.symbol as string) || null,
      description: descriptionFor(item),
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < deityRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.deities)
      .values(deityRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${rawDeities.length} deities.`);

  // 4. Rewards
  const rawRewards = selectAllowed(readArray<BaseItem>("rewards.json", "reward"));
  const rewardRows = rawRewards.map((item) => {
    const id = slugify(item.name);
    return {
      id,
      name: item.name,
      source: item.source,
      page: item.page || null,
      type: (item.type as string) || null,
      description: descriptionFor(item),
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < rewardRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.rewards)
      .values(rewardRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${rawRewards.length} rewards.`);

  // 5. Objects
  const rawObjects = selectAllowed(readArray<BaseItem>("objects.json", "object"));
  const objectRows = rawObjects.map((item) => {
    const id = slugify(item.name);
    return {
      id,
      name: item.name,
      source: item.source,
      page: item.page || null,
      sizeJson: JSON.stringify(item.size || []),
      objectType: (item.objectType as string) || null,
      ac: typeof item.ac === "number" ? item.ac : null,
      hp: typeof item.hp === "number" ? item.hp : null,
      speed: typeof item.speed === "number" ? item.speed : null,
      str: typeof item.str === "number" ? item.str : null,
      dex: typeof item.dex === "number" ? item.dex : null,
      con: typeof item.con === "number" ? item.con : null,
      int: typeof item.int === "number" ? item.int : null,
      wis: typeof item.wis === "number" ? item.wis : null,
      cha: typeof item.cha === "number" ? item.cha : null,
      sensesJson: JSON.stringify(item.senses || []),
      immuneJson: JSON.stringify(item.immune || []),
      description: descriptionFor(item),
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < objectRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.objects)
      .values(objectRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${rawObjects.length} objects.`);

  // 6. Recipes
  const rawRecipes = selectAllowed(readArray<BaseItem>("recipes.json", "recipe"));
  const recipeRows = rawRecipes.map((item) => {
    const id = slugify(item.name);
    return {
      id,
      name: item.name,
      source: item.source,
      page: item.page || null,
      type: (item.type as string) || null,
      dishTypesJson: JSON.stringify(item.dishTypes || []),
      description: descriptionFor(item),
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < recipeRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.recipes)
      .values(recipeRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${rawRecipes.length} recipes.`);

  // 7. Decks
  const rawDecks = selectAllowed(readArray<BaseItem>("decks.json", "deck"));
  const deckRows = rawDecks.map((item) => {
    const id = slugify(item.name);
    return {
      id,
      name: item.name,
      source: item.source,
      page: item.page || null,
      description: descriptionFor(item),
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < deckRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.decks)
      .values(deckRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${rawDecks.length} decks.`);

  // 8. Cards (linked to Decks)
  const rawCards = selectAllowed(readArray<BaseItem>("decks.json", "card"));
  const cardRows = rawCards.map((item) => {
    const id = slugify(`${item.set}-${item.name}`);
    const deckId = item.set ? slugify(String(item.set)) : null;
    return {
      id,
      deckId,
      name: item.name,
      suit: (item.suit as string) || null,
      value: typeof item.value === "number" ? item.value : null,
      description: descriptionFor(item),
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < cardRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.cards)
      .values(cardRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${rawCards.length} cards.`);

  // 9. Roll Tables
  const rawTables = selectAllowed(readArray<BaseItem>("tables.json", "table"));
  const tableRows = rawTables.map((item) => {
    const id = slugify(item.name);
    return {
      id,
      name: item.name,
      source: item.source,
      page: item.page || null,
      caption: (item.caption as string) || null,
      colLabelsJson: JSON.stringify(item.colLabels || []),
      rowsJson: JSON.stringify(item.rows || []),
      description: descriptionFor(item),
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < tableRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.rollTables)
      .values(tableRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${rawTables.length} roll tables.`);

  // 10. Variant Rules
  const rawVariantRules = selectAllowed(readArray<BaseItem>("variantrules.json", "variantrule"));
  const variantRuleRows = rawVariantRules.map((item) => {
    const id = slugify(item.name);
    return {
      id,
      name: item.name,
      source: item.source,
      page: item.page || null,
      ruleType: (item.ruleType as string) || null,
      description: descriptionFor(item),
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < variantRuleRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.variantRules)
      .values(variantRuleRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${rawVariantRules.length} variant rules.`);

  // 11. Cults and Boons
  const rawCults = selectAllowed(readArray<BaseItem>("cultsboons.json", "cult")).map((item) => ({
    ...item,
    kind: "cult",
  }));
  const rawBoons = selectAllowed(readArray<BaseItem>("cultsboons.json", "boon")).map((item) => ({
    ...item,
    kind: "boon",
  }));
  const rawCultsBoons = [...rawCults, ...rawBoons].sort((a, b) => a.name.localeCompare(b.name));
  const cultsBoonsRows = rawCultsBoons.map((item) => {
    const id = slugify(`${item.kind}-${item.name}`);
    return {
      id,
      name: item.name,
      source: item.source,
      page: item.page || null,
      kind: item.kind,
      type: ((item as any).type as string) || null,
      description: descriptionFor(item),
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < cultsBoonsRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.cultsBoons)
      .values(cultsBoonsRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${rawCultsBoons.length} cults and boons.`);

  // 12. Monster Statistics by Challenge Rating
  const challengeRatings = readArray<any>("msbcr.json", "cr");
  const crRows = challengeRatings.map((item) => {
    const cr = String(item._cr);
    return {
      id: slugify(`cr-${cr}`),
      cr,
      proficiencyBonus: item.pb,
      armorClass: item.ac,
      hpMin: item.hpMin,
      hpMax: item.hpMax,
      attackBonus: item.attackBonus,
      dprMin: item.dprMin,
      dprMax: item.dprMax,
      saveDc: item.saveDc,
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < crRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.challengeRatings)
      .values(crRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${challengeRatings.length} challenge rating benchmark rows.`);

  // 13. Psionics
  const psionics = readArray<BaseItem>("psionics.json", "psionic").filter((item) =>
    isSourceAllowed(item.source),
  );
  const psionicRows = psionics.map((item) => {
    const id = slugify(`${item.name}-${item.source}`);
    return {
      id,
      name: item.name,
      source: item.source,
      page: item.page || null,
      type: (item.type as string) || null,
      order: (item.order as string) || null,
      focus: item.focus ? renderEntries(item.focus) : null,
      modesJson: JSON.stringify(item.modes || []),
      description: descriptionFor(item),
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < psionicRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.psionics)
      .values(psionicRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${psionics.length} psionics rows.`);

  // 14. Creature builder reference entries
  const creatureTraits = readArray<BaseItem>("makebrew-creature.json", "makebrewCreatureTrait")
    .filter((item) => isSourceAllowed(item.source))
    .map((item) => ({ ...item, kind: "trait" }));
  const creatureActions = readArray<BaseItem>("makebrew-creature.json", "makebrewCreatureAction")
    .filter((item) => isSourceAllowed(item.source))
    .map((item) => ({ ...item, kind: "action" }));
  const creatureBuilderEntries = [...creatureTraits, ...creatureActions].sort((a, b) =>
    `${a.kind}:${a.name}`.localeCompare(`${b.kind}:${b.name}`),
  );
  const builderRows = creatureBuilderEntries.map((item) => {
    const id = slugify(`creature-builder-${item.kind}-${item.name}-${item.source}`);
    return {
      id,
      name: item.name,
      source: item.source,
      kind: item.kind,
      description: descriptionFor(item),
      rawJson: JSON.stringify(item),
    };
  });
  for (let i = 0; i < builderRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.creatureBuilderEntries)
      .values(builderRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${creatureBuilderEntries.length} creature builder entries.`);
}
