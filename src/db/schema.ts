import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

// ENGINES & EFFECTS
export const contentSources = sqliteTable("content_sources", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  group: text("group"),
  kind: text("kind").notNull(), // book / adventure
  published: text("published"),
  rawJson: text("raw_json").notNull(),
});

export const compendiumEntries = sqliteTable("compendium_entries", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  sourceGroup: text("source_group"),
  sourceFile: text("source_file").notNull(),
  page: integer("page"),
  official: integer("official", { mode: "boolean" }).notNull().default(true),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
  searchText: text("search_text").notNull(),
});

export const compendiumFiles = sqliteTable("compendium_files", {
  id: text("id").primaryKey(),
  sourceFile: text("source_file").notNull(),
  source: text("source"),
  sourceGroup: text("source_group"),
  official: integer("official", { mode: "boolean" }).notNull().default(true),
  rawJson: text("raw_json").notNull(),
});

export const activeEffects = sqliteTable("active_effects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'Buff', 'Debuff', 'Aura'
  target: text("target").notNull(),
  durationValue: integer("duration_value"),
  durationUnit: text("duration_unit"),
  changesJson: text("changes_json").notNull(),
  grantsAdvantageOn: text("grants_advantage_on"),
  grantsDisadvantageOn: text("grants_disadvantage_on"),
  grantsResistances: text("grants_resistances"),
  grantsImmunities: text("grants_immunities"),
});

// ENTITIES
export const spells = sqliteTable("spells", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  school: text("school").notNull(),
  castingTime: text("casting_time").notNull(),
  range: text("range").notNull(),
  duration: text("duration").notNull(),
  concentration: integer("concentration", { mode: "boolean" }).notNull().default(false),
  ritual: integer("ritual", { mode: "boolean" }).notNull().default(false),
  description: text("description").notNull(),
  componentsJson: text("components_json").notNull(),
  damageJson: text("damage_json"),
  healingJson: text("healing_json"),
  savingThrowJson: text("saving_throw_json"),
  areaOfEffectJson: text("area_of_effect_json"),
  attackRoll: integer("attack_roll", { mode: "boolean" }).notNull().default(false),
  summonsStatBlockIds: text("summons_stat_block_ids"),
  source: text("source"),
});

export const classes = sqliteTable("classes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  hitDice: integer("hit_dice").notNull(),
  hitDiceType: text("hit_dice_type").notNull(),
  hpFirstLevel: integer("hp_first_level").notNull(),
  hpHigherLevels: integer("hp_higher_levels").notNull(),
  subclassTitle: text("subclass_title"),
  primaryAbilityJson: text("primary_ability_json"),
  proficienciesJson: text("proficiencies_json"),
  startingEquipmentJson: text("starting_equipment_json"),
  acCalculationJson: text("ac_calculation_json"),
  speedJson: text("speed_json"),
  sensesJson: text("senses_json"),
  spellcastingJson: text("spellcasting_json"),
  infusionsJson: text("infusions_json"),
  wildShapeJson: text("wild_shape_json"),
  optionsProgressionJson: text("options_progression_json"),
});

export const subclasses = sqliteTable("subclasses", {
  id: text("id").primaryKey(),
  classId: text("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  levelChosen: integer("level_chosen").notNull(),
  alwaysPreparedSpellsJson: text("always_prepared_spells_json"),
  expandedSpellListJson: text("expanded_spell_list_json"),
  spellcastingJson: text("spellcasting_json"),
});

export const classFeatures = sqliteTable("class_features", {
  id: text("id").primaryKey(),
  classId: text("class_id").references(() => classes.id, { onDelete: "cascade" }),
  subclassId: text("subclass_id").references(() => subclasses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  levelRequired: integer("level_required"),
  actionType: text("action_type"),
  mathematicalRecoveryJson: text("mathematical_recovery_json"),
  usesJson: text("uses_json"),
  numericalModifiersJson: text("numerical_modifiers_json"),
  optionsJson: text("options_json"),
});

// ORIGINS (SPECIES, BACKGROUNDS, FEATS)

export const species = sqliteTable("species", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  size: text("size").notNull(),
  speed: integer("speed").notNull(),
  description: text("description").notNull(),
  featuresJson: text("features_json").notNull(), // array of traits/features
  source: text("source"),
  page: integer("page"),
  abilityScoreIncreasesJson: text("ability_score_increases_json"),
  languagesJson: text("languages_json"),
  resistancesJson: text("resistances_json"),
  immunitiesJson: text("immunities_json"),
  sensesJson: text("senses_json"),
  proficienciesJson: text("proficiencies_json"),
  isLineage: integer("is_lineage", { mode: "boolean" }).default(false),
});

export const backgrounds = sqliteTable("backgrounds", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  abilityScoreIncreasesJson: text("ability_score_increases_json").notNull(),
  skillProficienciesJson: text("skill_proficiencies_json").notNull(),
  toolProficienciesJson: text("tool_proficiencies_json").notNull(),
  startingEquipmentJson: text("starting_equipment_json").notNull(),
  originFeatId: text("origin_feat_id"), // Will reference feats.id in app logic
  source: text("source"),
  page: integer("page"),
});

export const feats = sqliteTable("feats", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'Origin', 'General', 'Fighting Style', 'Epic Boon'
  description: text("description").notNull(),
  prerequisite: text("prerequisite"),
  levelRequirement: integer("level_requirement"),
  repeatable: integer("repeatable", { mode: "boolean" }).notNull().default(false),
  abilityScoreImprovementJson: text("ability_score_improvement_json"),
  source: text("source"),
  page: integer("page"),
});

// EQUIPMENT
export const weapons = sqliteTable("weapons", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(),
  costGp: integer("cost_gp").notNull(),
  damageDice: text("damage_dice").notNull(),
  damageType: text("damage_type").notNull(),
  versatileDice: text("versatile_dice"),
  rangeNormal: integer("range_normal"),
  rangeLong: integer("range_long"),
  mastery: text("mastery"),
  propertiesJson: text("properties_json"),
  weight: integer("weight").notNull(),
});

export const armor = sqliteTable("armor", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  costGp: integer("cost_gp").notNull(),
  acBase: integer("ac_base").notNull(),
  acModifier: text("ac_modifier"),
  acMaxModifier: integer("ac_max_modifier"),
  strengthRequirement: integer("strength_requirement"),
  stealthDisadvantage: integer("stealth_disadvantage", { mode: "boolean" })
    .notNull()
    .default(false),
  weight: integer("weight").notNull(),
});

export const magicItems = sqliteTable("magic_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  rarity: text("rarity").notNull(),
  requiresAttunement: integer("requires_attunement", { mode: "boolean" }).notNull().default(false),
  attunementConditions: text("attunement_conditions"),
  description: text("description").notNull(),
  weight: integer("weight"),
  chargesJson: text("charges_json"),
});

// SUBSYSTEMS & MONSTERS
export const monsters = sqliteTable("monsters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  size: text("size").notNull(),
  type: text("type").notNull(),
  alignment: text("alignment").notNull(),
  acJson: text("ac_json").notNull(),
  hpJson: text("hp_json").notNull(),
  speedJson: text("speed_json").notNull(),
  statsJson: text("stats_json").notNull(),
  savesJson: text("saves_json"),
  skillsJson: text("skills_json"),
  resistancesJson: text("resistances_json"),
  immunitiesJson: text("immunities_json"),
  vulnerabilitiesJson: text("vulnerabilities_json"),
  conditionImmunitiesJson: text("condition_immunities_json"),
  sensesJson: text("senses_json").notNull(),
  languagesJson: text("languages_json").notNull(),
  challengeRating: integer("challenge_rating").notNull(),
  proficiencyBonus: integer("proficiency_bonus").notNull(),
  traitsJson: text("traits_json"),
  actionsJson: text("actions_json").notNull(),
  bonusActionsJson: text("bonus_actions_json"),
  reactionsJson: text("reactions_json"),
  legendaryActionsJson: text("legendary_actions_json"),
  mythicActionsJson: text("mythic_actions_json"),
  lairActionsJson: text("lair_actions_json"),
});

export const vehicles = sqliteTable("vehicles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  costGp: integer("cost_gp").notNull(),
  speed: integer("speed").notNull(),
  capacityJson: text("capacity_json").notNull(),
  ac: integer("ac").notNull(),
  hp: integer("hp").notNull(),
  damageThreshold: integer("damage_threshold").notNull(),
  weaponsJson: text("weapons_json"),
});

export const bastions = sqliteTable("bastions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  levelRequired: integer("level_required").notNull(),
  prerequisite: text("prerequisite"),
  costToBuild: integer("cost_to_build").notNull(),
  daysToBuild: integer("days_to_build").notNull(),
  ordersJson: text("orders_json").notNull(),
});

export const hazards = sqliteTable("hazards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  perceptionDc: integer("perception_dc"),
  disableDc: integer("disable_dc"),
  saveJson: text("save_json"),
  damageJson: text("damage_json"),
});

// THE AGGREGATOR: CHARACTERS
export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  playerName: text("player_name").notNull(),
  speciesId: text("species_id").notNull(),
  backgroundId: text("background_id").notNull(),

  classesJson: text("classes_json").notNull(), // Array of { classId, subclassId, level }
  baseStatsJson: text("base_stats_json").notNull(),
  currencyJson: text("currency_json").notNull(),

  inventoryJson: text("inventory_json").notNull(),
  equippedWeaponIdsJson: text("equipped_weapon_ids_json").notNull(),
  equippedArmorId: text("equipped_armor_id").references(() => armor.id),
  attunedItemIdsJson: text("attuned_item_ids_json").notNull(),

  currentHp: integer("current_hp").notNull(),
  temporaryHp: integer("temporary_hp").notNull().default(0),
  exhaustionLevel: integer("exhaustion_level").notNull().default(0),
  heroicInspiration: integer("heroic_inspiration", { mode: "boolean" }).notNull().default(false),

  deathSavesJson: text("death_saves_json").notNull(),
  hitDiceExpendedJson: text("hit_dice_expended_json").notNull(),
  spellSlotsExpendedJson: text("spell_slots_expended_json").notNull(),
  featureUsesExpendedJson: text("feature_uses_expended_json").notNull(),

  activeEffectIdsJson: text("active_effect_ids_json").notNull(),
});

// JUNCTION TABLES
export const spellActiveEffects = sqliteTable(
  "spell_active_effects",
  {
    spellId: text("spell_id")
      .notNull()
      .references(() => spells.id, { onDelete: "cascade" }),
    effectId: text("effect_id")
      .notNull()
      .references(() => activeEffects.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.spellId, t.effectId] }),
  }),
);

export const featureActiveEffects = sqliteTable(
  "feature_active_effects",
  {
    featureId: text("feature_id")
      .notNull()
      .references(() => classFeatures.id, { onDelete: "cascade" }),
    effectId: text("effect_id")
      .notNull()
      .references(() => activeEffects.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.featureId, t.effectId] }),
  }),
);

export const itemActiveEffects = sqliteTable(
  "item_active_effects",
  {
    itemId: text("item_id").notNull(),
    effectId: text("effect_id")
      .notNull()
      .references(() => activeEffects.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.itemId, t.effectId] }),
  }),
);

export const classSpells = sqliteTable(
  "class_spells",
  {
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    spellId: text("spell_id")
      .notNull()
      .references(() => spells.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.classId, t.spellId] }),
  }),
);
