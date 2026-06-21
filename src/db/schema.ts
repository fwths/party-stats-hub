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

export const sourceDocuments = sqliteTable("source_documents", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  kind: text("kind").notNull(), // book / adventure
  name: text("name").notNull(),
  sourceFile: text("source_file").notNull(),
  group: text("group"),
  published: text("published"),
  contentsJson: text("contents_json").notNull().default("[]"),
  rawJson: text("raw_json").notNull(),
  searchText: text("search_text").notNull(),
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

export const rulesActions = sqliteTable("rules_actions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  timeJson: text("time_json").notNull().default("[]"),
  activation: text("activation"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  foundryJson: text("foundry_json"),
});

export const conditions = sqliteTable("conditions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  kind: text("kind").notNull().default("condition"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
});

export const languages = sqliteTable("languages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  type: text("type"),
  script: text("script"),
  typicalSpeakersJson: text("typical_speakers_json").notNull().default("[]"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
});

export const languageScripts = sqliteTable("language_scripts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  fontsJson: text("fonts_json").notNull().default("[]"),
  rawJson: text("raw_json").notNull(),
});

export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  ability: text("ability").notNull(),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
});

export const senses = sqliteTable("senses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
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
  page: integer("page"),
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
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
  source: text("source"),
  page: integer("page"),
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
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
  source: text("source"),
  page: integer("page"),
  classSource: text("class_source"),
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
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
  source: text("source"),
  page: integer("page"),
  classSource: text("class_source"),
  subclassSource: text("subclass_source"),
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
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
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const backgrounds = sqliteTable("backgrounds", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  abilityScoreIncreasesJson: text("ability_score_increases_json").notNull(),
  skillProficienciesJson: text("skill_proficiencies_json").notNull(),
  toolProficienciesJson: text("tool_proficiencies_json").notNull(),
  languageProficienciesJson: text("language_proficiencies_json").notNull().default("[]"),
  startingEquipmentJson: text("starting_equipment_json").notNull(),
  originFeatId: text("origin_feat_id"), // Will reference feats.id in app logic
  source: text("source"),
  page: integer("page"),
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const feats = sqliteTable("feats", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'Origin', 'General', 'Fighting Style', 'Epic Boon'
  description: text("description").notNull(),
  prerequisite: text("prerequisite"),
  levelRequirement: integer("level_requirement"),
  prerequisitesJson: text("prerequisites_json"),
  repeatable: integer("repeatable", { mode: "boolean" }).notNull().default(false),
  abilityScoreImprovementJson: text("ability_score_improvement_json"),
  source: text("source"),
  page: integer("page"),
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
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
  source: text("source"),
  page: integer("page"),
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
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
  source: text("source"),
  page: integer("page"),
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
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
  source: text("source"),
  page: integer("page"),
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
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
  source: text("source"),
  page: integer("page"),
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const vehicles = sqliteTable("vehicles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  costGp: integer("cost_gp").notNull(),
  speed: integer("speed").notNull(),
  capacityJson: text("capacity_json").notNull(),
  ac: integer("ac").notNull(),
  hp: integer("hp").notNull(),
  damageThreshold: integer("damage_threshold").notNull(),
  weaponsJson: text("weapons_json"),
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const bastions = sqliteTable("bastions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  facilityType: text("facility_type").notNull().default("basic"),
  levelRequired: integer("level_required").notNull(),
  prerequisite: text("prerequisite"),
  description: text("description").notNull().default(""),
  costToBuild: integer("cost_to_build").notNull(),
  daysToBuild: integer("days_to_build").notNull(),
  ordersJson: text("orders_json").notNull(),
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const hazards = sqliteTable("hazards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  kind: text("kind").notNull().default("hazard"),
  hazardType: text("hazard_type"),
  ratingJson: text("rating_json"),
  description: text("description").notNull(),
  perceptionDc: integer("perception_dc"),
  disableDc: integer("disable_dc"),
  saveJson: text("save_json"),
  damageJson: text("damage_json"),
  rawJson: text("raw_json"),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const charOptions = sqliteTable("char_options", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  optionTypeJson: text("option_type_json").notNull().default("[]"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const optionalFeatures = sqliteTable("optional_features", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  featureTypeJson: text("feature_type_json").notNull().default("[]"),
  prerequisite: text("prerequisite"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const deities = sqliteTable("deities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  pantheon: text("pantheon"),
  alignmentJson: text("alignment_json").notNull().default("[]"),
  category: text("category"),
  domainsJson: text("domains_json").notNull().default("[]"),
  province: text("province"),
  symbol: text("symbol"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const rewards = sqliteTable("rewards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  type: text("type"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const objects = sqliteTable("objects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  sizeJson: text("size_json").notNull().default("[]"),
  objectType: text("object_type"),
  ac: integer("ac"),
  hp: integer("hp"),
  speed: integer("speed"),
  str: integer("str"),
  dex: integer("dex"),
  con: integer("con"),
  int: integer("int"),
  wis: integer("wis"),
  cha: integer("cha"),
  sensesJson: text("senses_json").notNull().default("[]"),
  immuneJson: text("immune_json").notNull().default("[]"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  type: text("type"),
  dishTypesJson: text("dish_types_json").notNull().default("[]"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const decks = sqliteTable("decks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  deckId: text("deck_id"),
  name: text("name").notNull(),
  suit: text("suit"),
  value: integer("value"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
});

export const rollTables = sqliteTable("roll_tables", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  caption: text("caption"),
  colLabelsJson: text("col_labels_json").notNull().default("[]"),
  rowsJson: text("rows_json").notNull().default("[]"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const variantRules = sqliteTable("variant_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  ruleType: text("rule_type"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const cultsBoons = sqliteTable("cults_boons", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  kind: text("kind").notNull(), // "cult" or "boon"
  type: text("type"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const itemProperties = sqliteTable("item_properties", {
  abbreviation: text("abbreviation").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
});

export const itemTypes = sqliteTable("item_types", {
  abbreviation: text("abbreviation").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  rawJson: text("raw_json").notNull(),
});

export const itemTypeAdditionalEntries = sqliteTable("item_type_additional_entries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  appliesTo: text("applies_to").notNull(),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
});

export const mundaneGear = sqliteTable("mundane_gear", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  type: text("type"),
  costGp: integer("cost_gp").notNull().default(0),
  weight: integer("weight"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const weaponMasteries = sqliteTable("weapon_masteries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const itemGroups = sqliteTable("item_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  itemsJson: text("items_json").notNull().default("[]"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const magicVariants = sqliteTable("magic_variants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  requiresJson: text("requires_json").notNull().default("[]"),
  inheritsJson: text("inherits_json").notNull().default("{}"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const lootTables = sqliteTable("loot_tables", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  type: text("type").notNull(), // gems, artObjects, magicItems
  value: integer("value"),
  tableJson: text("table_json").notNull().default("[]"),
  rawJson: text("raw_json").notNull(),
});

export const treasureTables = sqliteTable("treasure_tables", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  kind: text("kind").notNull(), // individual, hoard, dragon
  crMin: integer("cr_min"),
  crMax: integer("cr_max"),
  coinsJson: text("coins_json"),
  tableJson: text("table_json").notNull().default("[]"),
  rawJson: text("raw_json").notNull(),
});

export const vehicleUpgrades = sqliteTable("vehicle_upgrades", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  upgradeTypeJson: text("upgrade_type_json").notNull().default("[]"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const speciesVariants = sqliteTable("species_variants", {
  id: text("id").primaryKey(),
  speciesId: text("species_id").notNull(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  raceName: text("race_name").notNull(),
  raceSource: text("race_source").notNull(),
  abilityJson: text("ability_json"),
  featuresJson: text("features_json").notNull().default("[]"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
  fluffJson: text("fluff_json"),
  foundryJson: text("foundry_json"),
});

export const monsterFeatures = sqliteTable("monster_features", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  example: text("example"),
  effect: text("effect").notNull(),
  attackBonus: text("attack_bonus"),
  dpr: text("dpr"),
  rawJson: text("raw_json").notNull(),
});

export const creatureBuilderEntries = sqliteTable("creature_builder_entries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  kind: text("kind").notNull(), // trait / action
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
});

export const encounters = sqliteTable("encounters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  tablesJson: text("tables_json").notNull().default("[]"),
  rawJson: text("raw_json").notNull(),
});

export const lifeNameTables = sqliteTable("life_name_tables", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  kind: text("kind").notNull(), // class, background, trinket, name
  tablesJson: text("tables_json").notNull().default("[]"),
  rawJson: text("raw_json").notNull(),
});

export const encounterShapes = sqliteTable("encounter_shapes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  shapeTemplateJson: text("shape_template_json").notNull().default("[]"),
  rawJson: text("raw_json").notNull(),
});

export const challengeRatings = sqliteTable("challenge_ratings", {
  id: text("id").primaryKey(),
  cr: text("cr").notNull(),
  proficiencyBonus: integer("proficiency_bonus").notNull(),
  armorClass: integer("armor_class").notNull(),
  hpMin: integer("hp_min").notNull(),
  hpMax: integer("hp_max").notNull(),
  attackBonus: integer("attack_bonus").notNull(),
  dprMin: integer("dpr_min").notNull(),
  dprMax: integer("dpr_max").notNull(),
  saveDc: integer("save_dc").notNull(),
  rawJson: text("raw_json").notNull(),
});

export const itemCardReferences = sqliteTable("item_card_references", {
  id: text("id").primaryKey(),
  abbreviation: text("abbreviation").notNull(),
  source: text("source").notNull(),
  kind: text("kind").notNull(), // property / type
  name: text("name"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
});

export const psionics = sqliteTable("psionics", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  page: integer("page"),
  type: text("type"),
  order: text("order"),
  focus: text("focus"),
  modesJson: text("modes_json").notNull().default("[]"),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull(),
});

// USER AUTHENTICATION & CAMPAIGNS
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("player"), // admin, dm, player
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
});

export const kvStore = sqliteTable("kv_store", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: integer("updated_at").notNull(),
});

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  dmUserId: text("dm_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  description: text("description").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});

export const campaignMembers = sqliteTable(
  "campaign_members",
  {
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.campaignId, t.userId] }),
  }),
);

// THE AGGREGATOR: CHARACTERS
export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  playerName: text("player_name").notNull(),
  speciesId: text("species_id").notNull(),
  backgroundId: text("background_id").notNull(),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),

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
  builderStateJson: text("builder_state_json"),
  rawJson: text("raw_json"),
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

export const characterClasses = sqliteTable("character_classes", {
  id: text("id").primaryKey(),
  characterId: text("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  classId: text("class_id").notNull(),
  subclassId: text("subclass_id"),
  level: integer("level").notNull(),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
});

export const characterChoices = sqliteTable("character_choices", {
  id: text("id").primaryKey(),
  characterId: text("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  groupId: text("group_id").notNull(),
  choiceId: text("choice_id").notNull(),
});

export const characterInventory = sqliteTable("character_inventory", {
  id: text("id").primaryKey(),
  characterId: text("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  isEquipped: integer("is_equipped", { mode: "boolean" }).notNull().default(false),
  isAttuned: integer("is_attuned", { mode: "boolean" }).notNull().default(false),
});

export const characterSpells = sqliteTable("character_spells", {
  id: text("id").primaryKey(),
  characterId: text("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  spellId: text("spell_id").notNull(),
  classId: text("class_id"), // Source class for the spell
  isPrepared: integer("is_prepared", { mode: "boolean" }).notNull().default(false),
  isAlwaysPrepared: integer("is_always_prepared", { mode: "boolean" }).notNull().default(false),
});

export const characterSources = sqliteTable("character_sources", {
  id: text("id").primaryKey(),
  characterId: text("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  sourceId: text("source_id").notNull(), // A book or source abbreviation
});

export const characterOverrides = sqliteTable("character_overrides", {
  id: text("id").primaryKey(),
  characterId: text("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  entityId: text("entity_id").notNull(), // e.g. a skill ID, or ability score
  overrideType: text("override_type").notNull(), // e.g. "set_score", "set_proficiency"
  value: text("value").notNull(),
});
