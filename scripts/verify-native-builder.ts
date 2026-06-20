import Database from "better-sqlite3";
import { createNativePartyMember } from "../src/lib/native-engine";

const db = new Database("sqlite.db");
const all = (table: string) => db.prepare(`select * from ${table}`).all() as any[];
const byId = (rows: any[]) => new Map(rows.map((row) => [row.id, row]));

const classes = byId(all("classes"));
const species = byId(all("species"));
const backgrounds = byId(all("backgrounds"));
const subclasses = byId(all("subclasses"));
const feats = byId(all("feats"));
const spells = byId(all("spells"));
const features = all("class_features").map((row) => ({
  ...row,
  classId: row.class_id,
  subclassId: row.subclass_id,
  levelRequired: row.level_required,
  optionsJson: row.options_json,
}));

function camelClass(row: any) {
  return {
    ...row,
    hitDice: row.hit_dice,
    proficienciesJson: row.proficiencies_json,
    startingEquipmentJson: row.starting_equipment_json,
    spellcastingJson: row.spellcasting_json,
  };
}

function camelBackground(row: any) {
  return {
    ...row,
    originFeatId: row.origin_feat_id,
    skillProficienciesJson: row.skill_proficiencies_json,
    toolProficienciesJson: row.tool_proficiencies_json,
    startingEquipmentJson: row.starting_equipment_json,
  };
}

function camelSpecies(row: any) {
  return {
    ...row,
    featuresJson: row.features_json,
    proficienciesJson: row.proficiencies_json,
    languagesJson: row.languages_json,
    sensesJson: row.senses_json,
    resistancesJson: row.resistances_json,
    immunitiesJson: row.immunities_json,
  };
}

function camelSubclass(row: any) {
  return row ? { ...row, classId: row.class_id, levelChosen: row.level_chosen } : undefined;
}

const abilities = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };
const baseState = {
  name: "Test Hero",
  raceId: "human",
  backgroundId: "guard",
  level: 1,
  abilities,
  abilityBonuses: { STR: 2, DEX: 1, CON: 0, INT: 0, WIS: 0, CHA: 0 },
  featChoices: { cantrips: [], spells: [], skills: [], tools: [] },
  classSkillChoices: ["Athletics"],
  classToolChoices: [],
  classEquipmentOption: null,
  featureChoices: {},
  cantripChoices: [],
  preparedSpellChoices: [],
};

function featureChoiceId(classId: string, name: string) {
  const feature = features.find((item) => item.classId === classId && item.name === name);
  if (!feature) throw new Error(`Missing feature ${classId}:${name}`);
  return `${feature.id}:0`;
}

function make(state: any, spellIds: string[] = []) {
  const classData = camelClass(classes.get(state.classId));
  const raceData = camelSpecies(species.get(state.raceId || "human"));
  const backgroundData = camelBackground(backgrounds.get(state.backgroundId || "guard"));
  const subclassData = camelSubclass(subclasses.get(state.subclassId));
  const originFeat = backgroundData?.originFeatId ? feats.get(backgroundData.originFeatId) : null;
  const selectedSpells = spellIds.map((id) => spells.get(id)).filter(Boolean);
  return createNativePartyMember(
    state,
    raceData,
    classData,
    backgroundData,
    subclassData,
    originFeat,
    selectedSpells,
    features,
  );
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const bardExpertise = featureChoiceId("bard", "Expertise");
const bard = make(
  {
    ...baseState,
    name: "Bard Test",
    classId: "bard",
    level: 2,
    classSkillChoices: ["Performance", "Persuasion"],
    featureChoices: { [bardExpertise]: ["Performance", "Persuasion"] },
    cantripChoices: ["vicious-mockery-xphb", "dancing-lights-xphb"],
    preparedSpellChoices: ["charm-person-xphb"],
  },
  ["vicious-mockery-xphb", "dancing-lights-xphb", "charm-person-xphb"],
);
assert(
  bard.skills.filter((skill) => skill.proficiency === "expertise").length >= 2,
  "Bard expertise did not persist mechanically.",
);

const fighterStyle = featureChoiceId("fighter", "Fighting Style");
const fighterMastery = featureChoiceId("fighter", "Weapon Mastery");
const fighter = make({
  ...baseState,
  name: "Fighter Test",
  classId: "fighter",
  level: 1,
  classSkillChoices: ["Athletics", "Perception"],
  classEquipmentOption: "a",
  featureChoices: {
    [fighterStyle]: ["Defense"],
    [fighterMastery]: ["Longsword", "Longbow", "Dagger"],
  },
});
assert(fighter.weaponMasteries.length === 3, "Fighter weapon masteries did not persist.");

const warlockInvocations = featureChoiceId("warlock", "Eldritch Invocation Options");
const warlock = make(
  {
    ...baseState,
    name: "Warlock Test",
    classId: "warlock",
    level: 5,
    abilities: { ...abilities, CHA: 16 },
    cantripChoices: ["eldritch-blast-xphb", "prestidigitation-xphb", "mage-hand-xphb"],
    preparedSpellChoices: ["hex-xphb", "charm-person-xphb"],
    featureChoices: {
      [warlockInvocations]: [
        "Pact of the Blade",
        "Thirsting Blade",
        "Eldritch Mind",
        "Agonizing Blast",
        "Armor of Shadows",
      ],
    },
  },
  ["eldritch-blast-xphb", "prestidigitation-xphb", "mage-hand-xphb", "hex-xphb", "charm-person-xphb"],
);
assert(warlock.pactSlots.length === 1 && warlock.spellSlots.length === 0, "Warlock pact slots are wrong.");
assert(
  warlock.features.some((feature) => feature.description.includes("Thirsting Blade")),
  "Warlock invocation choices did not persist.",
);

const sorcererMetamagic = featureChoiceId("sorcerer", "Metamagic Options");
const sorcerer = make(
  {
    ...baseState,
    name: "Sorcerer Test",
    classId: "sorcerer",
    level: 2,
    abilities: { ...abilities, CHA: 16 },
    cantripChoices: ["fire-bolt-xphb", "mage-hand-xphb", "prestidigitation-xphb", "ray-of-frost-xphb"],
    preparedSpellChoices: ["shield-xphb"],
    featureChoices: { [sorcererMetamagic]: ["Quickened Spell", "Subtle Spell"] },
  },
  ["fire-bolt-xphb", "mage-hand-xphb", "prestidigitation-xphb", "ray-of-frost-xphb", "shield-xphb"],
);
assert(sorcerer.metamagic.length === 2, "Sorcerer metamagic did not persist.");

const artificerSubclass = [...subclasses.values()].find(
  (row: any) => row.class_id === "artificer" && /cartographer/i.test(row.name),
);
const artificer = make(
  {
    ...baseState,
    name: "Artificer Test",
    classId: "artificer",
    subclassId: artificerSubclass?.id,
    level: 3,
    abilities: { ...abilities, INT: 16 },
    cantripChoices: ["mending-xphb", "prestidigitation-xphb"],
    preparedSpellChoices: ["cure-wounds-xphb", "grease-xphb"],
  },
  ["mending-xphb", "prestidigitation-xphb", "cure-wounds-xphb", "grease-xphb"],
);
assert(artificer.subclasses.length === 1, "Artificer subclass did not persist.");
assert(
  artificer.features.some((feature) => /Cartographer|Adventurer's Atlas/.test(feature.name)),
  "Artificer EFA subclass features did not persist.",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      bardExpertise: bard.skills.filter((skill) => skill.proficiency === "expertise").map((skill) => skill.name),
      fighterWeaponMasteries: fighter.weaponMasteries.map((mastery) => mastery.name),
      warlockPactSlots: warlock.pactSlots,
      sorcererMetamagic: sorcerer.metamagic.map((item) => item.name),
      artificerSubclass: artificer.subclasses,
      artificerFeatureSample: artificer.features
        .filter((feature) => /Cartographer|Adventurer's Atlas/.test(feature.name))
        .map((feature) => feature.name),
    },
    null,
    2,
  ),
);
