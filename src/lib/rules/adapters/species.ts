import { RuleChoiceGroup } from "../choices";
import { RuleGrant } from "../grants";
import { parseJsonValue, normalizeChoiceName } from "../../../components/builder/BuilderUtils";

export function speciesToRuleChoicesAndGrants(speciesEntity: any): { choices: RuleChoiceGroup[]; grants: RuleGrant[] } {
  if (!speciesEntity) return { choices: [], grants: [] };

  const choices: RuleChoiceGroup[] = [];
  const grants: RuleGrant[] = [];

  const sourceEntity = `species_${speciesEntity.id}`;
  const provenance = `Species: ${speciesEntity.name}`;

  // Fixed Senses
  const sensesJson = parseJsonValue(speciesEntity.sensesJson, []);
  if (Array.isArray(sensesJson)) {
    sensesJson.forEach((sense: any) => {
      grants.push({
        id: `${sourceEntity}_sense_${Object.keys(sense)[0]}`,
        type: "sense",
        value: sense,
        mode: "fixed",
        sourceEntity,
        provenance,
      });
    });
  } else if (sensesJson && typeof sensesJson === "object") {
    Object.entries(sensesJson).forEach(([key, val]) => {
      if (val) {
        grants.push({
          id: `${sourceEntity}_sense_${key}`,
          type: "sense",
          value: { [key]: val },
          mode: "fixed",
          sourceEntity,
          provenance,
        });
      }
    });
  }

  // Defenses
  const defensesPairs = [
    { key: "resistancesJson", type: "damage_resistance" },
    { key: "immunitiesJson", type: "damage_immunity" },
    { key: "vulnerabilitiesJson", type: "damage_vulnerability" },
    { key: "conditionImmunitiesJson", type: "condition_immunity" },
  ] as const;

  for (const { key, type } of defensesPairs) {
    const rawVal = speciesEntity[key] || speciesEntity[key.replace("Json", "_json")];
    if (rawVal) {
      const parsed = parseJsonValue(rawVal, []);
      if (Array.isArray(parsed)) {
        parsed.forEach((val: string) => {
          grants.push({
            id: `${sourceEntity}_${type}_${val}`,
            type: type as any,
            value: val,
            mode: "fixed",
            sourceEntity,
            provenance,
          });
        });
      }
    }
  }

  // Fixed Speeds
  if (speciesEntity.speed) {
    grants.push({
      id: `${sourceEntity}_speed`,
      type: "speed",
      value: speciesEntity.speed,
      mode: "fixed",
      sourceEntity,
      provenance,
    });
  }

  // Proficiencies (Fixed & Choices)
  const proficienciesJson = parseJsonValue(speciesEntity.proficienciesJson, {});
  
  if (Array.isArray(proficienciesJson)) {
     // Format: [ { any: 1 } ] or [ { choose: { from: ["Acrobatics"] } } ]
     proficienciesJson.forEach((prof: any, i: number) => {
       if (prof.any) {
         choices.push({
           id: `${sourceEntity}_skill_any_${i}`,
           sourceEntity,
           label: `Choose ${prof.any} skill${prof.any > 1 ? "s" : ""}`,
           min: prof.any,
           max: prof.any,
           exact: true,
           repeatable: false,
           optionType: "skill",
           options: "all",
           provenance,
         });
       } else if (prof.choose?.from) {
         choices.push({
           id: `${sourceEntity}_skill_choose_${i}`,
           sourceEntity,
           label: `Choose ${prof.choose.count || 1} skill${(prof.choose.count || 1) > 1 ? "s" : ""}`,
           min: prof.choose.count || 1,
           max: prof.choose.count || 1,
           exact: true,
           repeatable: false,
           optionType: "skill",
           options: prof.choose.from.map((sk: string) => ({
             id: normalizeChoiceName(sk),
             label: normalizeChoiceName(sk)
           })),
           provenance,
         });
       } else {
         Object.entries(prof).forEach(([key, val]) => {
            if (val === true) {
              grants.push({
                id: `${sourceEntity}_prof_${key}`,
                type: "skill_proficiency", // Assumes skills for simple array elements
                value: normalizeChoiceName(key),
                mode: "fixed",
                sourceEntity,
                provenance,
              });
            }
         });
       }
     });
  }

  // Parse Tool Proficiencies specifically if they exist in `proficienciesJson.starting.toolProficiencies`
  if (proficienciesJson && proficienciesJson.starting && Array.isArray(proficienciesJson.starting.toolProficiencies)) {
    proficienciesJson.starting.toolProficiencies.forEach((tool: any, i: number) => {
      if (typeof tool === "string") {
        grants.push({
          id: `${sourceEntity}_tool_${normalizeChoiceName(tool)}`,
          type: "tool_proficiency",
          value: tool,
          mode: "fixed",
          sourceEntity,
          provenance,
        });
      } else if (tool.choose?.from) {
        choices.push({
          id: `${sourceEntity}_tool_choose_${i}`,
          sourceEntity,
          label: `Choose ${tool.choose.count || 1} tool${(tool.choose.count || 1) > 1 ? "s" : ""}`,
          min: tool.choose.count || 1,
          max: tool.choose.count || 1,
          exact: true,
          repeatable: false,
          optionType: "tool",
          options: tool.choose.from.map((t: string) => ({
            id: normalizeChoiceName(t),
            label: normalizeChoiceName(t),
          })),
          provenance,
        });
      } else if (tool.any) {
        choices.push({
          id: `${sourceEntity}_tool_any_${i}`,
          sourceEntity,
          label: `Choose ${tool.any} tool${tool.any > 1 ? "s" : ""}`,
          min: tool.any,
          max: tool.any,
          exact: true,
          repeatable: false,
          optionType: "tool",
          options: "all",
          provenance,
        });
      }
    });
  }

  // Parse traits for choices
  const traitsJson = parseJsonValue(speciesEntity.traitsJson, []);
  if (Array.isArray(traitsJson)) {
    traitsJson.forEach((trait: any, i: number) => {
      if (trait.options) {
        choices.push({
          id: `${sourceEntity}_trait_${i}`,
          sourceEntity,
          label: trait.name || "Choose a Trait",
          min: 1,
          max: 1,
          exact: true,
          repeatable: false,
          optionType: "feature",
          options: trait.options.map((opt: any) => ({
            id: normalizeChoiceName(opt.name),
            label: opt.name,
            description: opt.description,
          })),
          provenance,
        });
      }
    });
  }

  // Languages (Fixed & Choices)
  const languagesJson = parseJsonValue(speciesEntity.languagesJson, []);
  if (Array.isArray(languagesJson)) {
    languagesJson.forEach((lang: any, i: number) => {
      if (lang.anyStandard || lang.any) {
        const count = Number(lang.anyStandard || lang.any);
        choices.push({
          id: `${sourceEntity}_language_any_${i}`,
          sourceEntity,
          label: `Choose ${count} language${count === 1 ? "" : "s"}`,
          min: count,
          max: count,
          exact: true,
          repeatable: false,
          optionType: "language",
          options: "all",
          provenance,
        });
      } else if (lang.choose?.from) {
        const count = Number(lang.choose.count || 1);
        choices.push({
          id: `${sourceEntity}_language_choose_${i}`,
          sourceEntity,
          label: `Choose ${count} language${count === 1 ? "" : "s"}`,
          min: count,
          max: count,
          exact: true,
          repeatable: false,
          optionType: "language",
          options: lang.choose.from.map((l: string) => ({
            id: normalizeChoiceName(l),
            label: normalizeChoiceName(l)
          })),
          provenance,
        });
      } else {
         Object.entries(lang).forEach(([key, val]) => {
           if (val === true && !["any", "anystandard", "other", "choose"].includes(key.toLowerCase())) {
             grants.push({
               id: `${sourceEntity}_language_${key}`,
               type: "language",
               value: normalizeChoiceName(key),
               mode: "fixed",
               sourceEntity,
               provenance,
             });
           }
         });
      }
    });
  }

  // Features
  const featuresJson = parseJsonValue(speciesEntity.featuresJson || speciesEntity.features_json, []);
  if (Array.isArray(featuresJson)) {
    featuresJson.forEach((feat: any, i: number) => {
      grants.push({
        id: `${sourceEntity}_feature_${i}`,
        type: "feature_reference",
        value: {
          name: feat.name,
          description: feat.description || "",
          source: "race",
          sourceName: speciesEntity.name,
          level: 1,
        },
        mode: "fixed",
        sourceEntity,
        provenance,
      });
    });
  }

  // Legacy Species Traits Injection
  addLegacySpeciesTraits(speciesEntity, choices, sourceEntity, provenance);

  return { choices, grants };
}

function addLegacySpeciesTraits(
  speciesEntity: any,
  choices: RuleChoiceGroup[],
  sourceEntity: string,
  provenance: string
) {
  const raceId = String(speciesEntity.id || "");

  if (raceId === "elf") {
    choices.push({
      id: `${sourceEntity}_elven_lineage`,
      sourceEntity,
      label: "Choose Elven Lineage",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "feature",
      provenance,
      options: [
        {
          id: "drow",
          label: "Drow",
          description: "Drow lineage selected.",
          grants: [
            { id: `${sourceEntity}_drow_sense`, type: "sense", value: { "Darkvision": 120 }, mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_drow_cantrip`, type: "spell_known", value: { name: "Dancing Lights", level: 0 }, mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_drow_spell_3`, type: "spell_known", value: { name: "Faerie Fire", level: 1 }, mode: "fixed", sourceEntity, provenance, level: 3 },
            { id: `${sourceEntity}_drow_spell_5`, type: "spell_known", value: { name: "Darkness", level: 2 }, mode: "fixed", sourceEntity, provenance, level: 5 },
            { id: `${sourceEntity}_drow_feature`, type: "feature_reference", value: { name: "Elven Lineage: Drow", description: "Drow lineage selected.", source: "race", sourceName: "Elf", level: 1 }, mode: "fixed", sourceEntity, provenance }
          ]
        },
        {
          id: "high elf",
          label: "High Elf",
          description: "High Elf lineage selected.",
          grants: [
            { id: `${sourceEntity}_high_cantrip`, type: "spell_known", value: { name: "Prestidigitation", level: 0 }, mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_high_spell_3`, type: "spell_known", value: { name: "Detect Magic", level: 1 }, mode: "fixed", sourceEntity, provenance, level: 3 },
            { id: `${sourceEntity}_high_spell_5`, type: "spell_known", value: { name: "Misty Step", level: 2 }, mode: "fixed", sourceEntity, provenance, level: 5 },
            { id: `${sourceEntity}_high_feature`, type: "feature_reference", value: { name: "Elven Lineage: High Elf", description: "High Elf lineage selected.", source: "race", sourceName: "Elf", level: 1 }, mode: "fixed", sourceEntity, provenance }
          ]
        },
        {
          id: "wood elf",
          label: "Wood Elf",
          description: "Wood Elf lineage selected.",
          grants: [
            { id: `${sourceEntity}_wood_speed`, type: "speed_bonus", value: { walk: 35 }, mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_wood_cantrip`, type: "spell_known", value: { name: "Druidcraft", level: 0 }, mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_wood_spell_3`, type: "spell_known", value: { name: "Longstrider", level: 1 }, mode: "fixed", sourceEntity, provenance, level: 3 },
            { id: `${sourceEntity}_wood_spell_5`, type: "spell_known", value: { name: "Pass without Trace", level: 2 }, mode: "fixed", sourceEntity, provenance, level: 5 },
            { id: `${sourceEntity}_wood_feature`, type: "feature_reference", value: { name: "Elven Lineage: Wood Elf", description: "Wood Elf lineage selected.", source: "race", sourceName: "Elf", level: 1 }, mode: "fixed", sourceEntity, provenance }
          ]
        }
      ]
    });
  }

  if (raceId === "gnome") {
    choices.push({
      id: `${sourceEntity}_gnomish_lineage`,
      sourceEntity,
      label: "Choose Gnomish Lineage",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "feature",
      provenance,
      options: [
        {
          id: "forest gnome",
          label: "Forest Gnome",
          description: "Forest Gnome lineage selected.",
          grants: [
            { id: `${sourceEntity}_forest_cantrip`, type: "spell_known", value: { name: "Minor Illusion", level: 0 }, mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_forest_spell`, type: "spell_known", value: { name: "Speak with Animals", level: 1 }, mode: "fixed", sourceEntity, provenance, level: 1 },
            { id: `${sourceEntity}_forest_feature`, type: "feature_reference", value: { name: "Gnomish Lineage: Forest Gnome", description: "Forest Gnome lineage selected.", source: "race", sourceName: "Gnome", level: 1 }, mode: "fixed", sourceEntity, provenance }
          ]
        },
        {
          id: "rock gnome",
          label: "Rock Gnome",
          description: "Rock Gnome lineage selected.",
          grants: [
            { id: `${sourceEntity}_rock_cantrip1`, type: "spell_known", value: { name: "Mending", level: 0 }, mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_rock_cantrip2`, type: "spell_known", value: { name: "Prestidigitation", level: 0 }, mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_rock_feature`, type: "feature_reference", value: { name: "Gnomish Lineage: Rock Gnome", description: "Rock Gnome lineage selected.", source: "race", sourceName: "Gnome", level: 1 }, mode: "fixed", sourceEntity, provenance }
          ]
        }
      ]
    });
  }

  if (raceId === "tiefling") {
    choices.push({
      id: `${sourceEntity}_fiendish_legacy`,
      sourceEntity,
      label: "Choose Fiendish Legacy",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "feature",
      provenance,
      options: [
        {
          id: "abyssal",
          label: "Abyssal",
          description: "Abyssal legacy selected.",
          grants: [
            { id: `${sourceEntity}_abyssal_res`, type: "damage_resistance", value: "Poison", mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_abyssal_can`, type: "spell_known", value: { name: "Poison Spray", level: 0 }, mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_abyssal_sp3`, type: "spell_known", value: { name: "Ray of Sickness", level: 1 }, mode: "fixed", sourceEntity, provenance, level: 3 },
            { id: `${sourceEntity}_abyssal_sp5`, type: "spell_known", value: { name: "Hold Person", level: 2 }, mode: "fixed", sourceEntity, provenance, level: 5 },
            { id: `${sourceEntity}_abyssal_feat`, type: "feature_reference", value: { name: "Fiendish Legacy: Abyssal", description: "Abyssal legacy selected.", source: "race", sourceName: "Tiefling", level: 1 }, mode: "fixed", sourceEntity, provenance }
          ]
        },
        {
          id: "chthonic",
          label: "Chthonic",
          description: "Chthonic legacy selected.",
          grants: [
            { id: `${sourceEntity}_chthonic_res`, type: "damage_resistance", value: "Necrotic", mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_chthonic_can`, type: "spell_known", value: { name: "Chill Touch", level: 0 }, mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_chthonic_sp3`, type: "spell_known", value: { name: "False Life", level: 1 }, mode: "fixed", sourceEntity, provenance, level: 3 },
            { id: `${sourceEntity}_chthonic_sp5`, type: "spell_known", value: { name: "Ray of Enfeeblement", level: 2 }, mode: "fixed", sourceEntity, provenance, level: 5 },
            { id: `${sourceEntity}_chthonic_feat`, type: "feature_reference", value: { name: "Fiendish Legacy: Chthonic", description: "Chthonic legacy selected.", source: "race", sourceName: "Tiefling", level: 1 }, mode: "fixed", sourceEntity, provenance }
          ]
        },
        {
          id: "infernal",
          label: "Infernal",
          description: "Infernal legacy selected.",
          grants: [
            { id: `${sourceEntity}_infernal_res`, type: "damage_resistance", value: "Fire", mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_infernal_can`, type: "spell_known", value: { name: "Fire Bolt", level: 0 }, mode: "fixed", sourceEntity, provenance },
            { id: `${sourceEntity}_infernal_sp3`, type: "spell_known", value: { name: "Hellish Rebuke", level: 1 }, mode: "fixed", sourceEntity, provenance, level: 3 },
            { id: `${sourceEntity}_infernal_sp5`, type: "spell_known", value: { name: "Darkness", level: 2 }, mode: "fixed", sourceEntity, provenance, level: 5 },
            { id: `${sourceEntity}_infernal_feat`, type: "feature_reference", value: { name: "Fiendish Legacy: Infernal", description: "Infernal legacy selected.", source: "race", sourceName: "Tiefling", level: 1 }, mode: "fixed", sourceEntity, provenance }
          ]
        }
      ]
    });
  }

  if (raceId?.startsWith("dragonborn")) {
    choices.push({
      id: `${sourceEntity}_draconic_ancestry`,
      sourceEntity,
      label: "Choose Draconic Ancestry",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "feature",
      provenance,
      options: [
        { id: "black", label: "Black (Acid)", grants: [{ id: `${sourceEntity}_black_res`, type: "damage_resistance", value: "Acid", mode: "fixed", sourceEntity, provenance }, { id: `${sourceEntity}_black_feat`, type: "feature_reference", value: { name: "Draconic Ancestry: Black", description: "Breath Weapon and resistance use Acid damage.", source: "race", sourceName: "Dragonborn", level: 1 }, mode: "fixed", sourceEntity, provenance }] },
        { id: "blue", label: "Blue (Lightning)", grants: [{ id: `${sourceEntity}_blue_res`, type: "damage_resistance", value: "Lightning", mode: "fixed", sourceEntity, provenance }, { id: `${sourceEntity}_blue_feat`, type: "feature_reference", value: { name: "Draconic Ancestry: Blue", description: "Breath Weapon and resistance use Lightning damage.", source: "race", sourceName: "Dragonborn", level: 1 }, mode: "fixed", sourceEntity, provenance }] },
        { id: "brass", label: "Brass (Fire)", grants: [{ id: `${sourceEntity}_brass_res`, type: "damage_resistance", value: "Fire", mode: "fixed", sourceEntity, provenance }, { id: `${sourceEntity}_brass_feat`, type: "feature_reference", value: { name: "Draconic Ancestry: Brass", description: "Breath Weapon and resistance use Fire damage.", source: "race", sourceName: "Dragonborn", level: 1 }, mode: "fixed", sourceEntity, provenance }] },
        { id: "bronze", label: "Bronze (Lightning)", grants: [{ id: `${sourceEntity}_bronze_res`, type: "damage_resistance", value: "Lightning", mode: "fixed", sourceEntity, provenance }, { id: `${sourceEntity}_bronze_feat`, type: "feature_reference", value: { name: "Draconic Ancestry: Bronze", description: "Breath Weapon and resistance use Lightning damage.", source: "race", sourceName: "Dragonborn", level: 1 }, mode: "fixed", sourceEntity, provenance }] },
        { id: "copper", label: "Copper (Acid)", grants: [{ id: `${sourceEntity}_copper_res`, type: "damage_resistance", value: "Acid", mode: "fixed", sourceEntity, provenance }, { id: `${sourceEntity}_copper_feat`, type: "feature_reference", value: { name: "Draconic Ancestry: Copper", description: "Breath Weapon and resistance use Acid damage.", source: "race", sourceName: "Dragonborn", level: 1 }, mode: "fixed", sourceEntity, provenance }] },
        { id: "gold", label: "Gold (Fire)", grants: [{ id: `${sourceEntity}_gold_res`, type: "damage_resistance", value: "Fire", mode: "fixed", sourceEntity, provenance }, { id: `${sourceEntity}_gold_feat`, type: "feature_reference", value: { name: "Draconic Ancestry: Gold", description: "Breath Weapon and resistance use Fire damage.", source: "race", sourceName: "Dragonborn", level: 1 }, mode: "fixed", sourceEntity, provenance }] },
        { id: "green", label: "Green (Poison)", grants: [{ id: `${sourceEntity}_green_res`, type: "damage_resistance", value: "Poison", mode: "fixed", sourceEntity, provenance }, { id: `${sourceEntity}_green_feat`, type: "feature_reference", value: { name: "Draconic Ancestry: Green", description: "Breath Weapon and resistance use Poison damage.", source: "race", sourceName: "Dragonborn", level: 1 }, mode: "fixed", sourceEntity, provenance }] },
        { id: "red", label: "Red (Fire)", grants: [{ id: `${sourceEntity}_red_res`, type: "damage_resistance", value: "Fire", mode: "fixed", sourceEntity, provenance }, { id: `${sourceEntity}_red_feat`, type: "feature_reference", value: { name: "Draconic Ancestry: Red", description: "Breath Weapon and resistance use Fire damage.", source: "race", sourceName: "Dragonborn", level: 1 }, mode: "fixed", sourceEntity, provenance }] },
        { id: "silver", label: "Silver (Cold)", grants: [{ id: `${sourceEntity}_silver_res`, type: "damage_resistance", value: "Cold", mode: "fixed", sourceEntity, provenance }, { id: `${sourceEntity}_silver_feat`, type: "feature_reference", value: { name: "Draconic Ancestry: Silver", description: "Breath Weapon and resistance use Cold damage.", source: "race", sourceName: "Dragonborn", level: 1 }, mode: "fixed", sourceEntity, provenance }] },
        { id: "white", label: "White (Cold)", grants: [{ id: `${sourceEntity}_white_res`, type: "damage_resistance", value: "Cold", mode: "fixed", sourceEntity, provenance }, { id: `${sourceEntity}_white_feat`, type: "feature_reference", value: { name: "Draconic Ancestry: White", description: "Breath Weapon and resistance use Cold damage.", source: "race", sourceName: "Dragonborn", level: 1 }, mode: "fixed", sourceEntity, provenance }] }
      ]
    });
  }

  if (raceId === "goliath") {
    choices.push({
      id: `${sourceEntity}_giant_ancestry`,
      sourceEntity,
      label: "Choose Giant Ancestry",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "feature",
      provenance,
      options: [
        "Cloud", "Fire", "Frost", "Hill", "Stone", "Storm"
      ].map(giant => ({
        id: giant.toLowerCase(),
        label: giant,
        description: `${giant} giant ancestry selected.`,
        grants: [
          { id: `${sourceEntity}_${giant.toLowerCase()}_feat`, type: "feature_reference", value: { name: `Giant Ancestry: ${giant}`, description: `${giant} selected.`, source: "race", sourceName: "Goliath", level: 1 }, mode: "fixed", sourceEntity, provenance }
        ]
      }))
    });
  }

  if (raceId === "shifter") {
    choices.push({
      id: `${sourceEntity}_shifting_form`,
      sourceEntity,
      label: "Choose Shifting Form",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "feature",
      provenance,
      options: [
        "Beasthide", "Longtooth", "Swiftstride", "Wildhunt"
      ].map(form => ({
        id: form.toLowerCase(),
        label: form,
        description: `${form} shifting form selected.`,
        grants: [
          { id: `${sourceEntity}_${form.toLowerCase()}_feat`, type: "feature_reference", value: { name: `Shifting: ${form}`, description: `${form} benefit selected.`, source: "race", sourceName: "Shifter", level: 1 }, mode: "fixed", sourceEntity, provenance }
        ]
      }))
    });
  }
}

