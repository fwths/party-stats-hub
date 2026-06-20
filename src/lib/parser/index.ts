import { mapDdbModifiersToGrants } from "./grants-mapper";
import {
  AbilityScore,
  CharacterCharacteristics,
  CreatureInfo,
  DeathSaves,
  FeatureInfo,
  PartyMember,
  SpellcastingInfo,
} from "../dndbeyond.types";
import { ALIGNMENT_MAP, ABILITY_NAMES, WIS_INDEX, DEX_INDEX } from "./constants";
import { mod, computeFinalScore, computeHitDice, flattenModifiers } from "./abilities";
import { computeArmorClass } from "./armor-class";
import { computeSenses } from "./senses";
import { computeSkills, computeSaves } from "./skills-saves";
import { computeSpellSlots, computeSpellsList } from "./spells";
import { computeAttacks } from "./attacks";
import { computeWeightCarried, computeCarryingCapacity, computeInventory } from "./inventory";
import { computeDefenses } from "./defenses";
import { computeActions } from "./actions";
import { errorMember } from "./creatures";

export function parseCharacterPayload(id: number, payload: any): PartyMember {
  try {
    // Clone inventory and modifiers.item to prevent mutating the original cached payload
    const data = {
      ...payload.data,
      inventory: payload.data.inventory
        ? payload.data.inventory.map((item: any) => ({
            ...item,
            definition: item.definition ? { ...item.definition } : undefined,
          }))
        : undefined,
      modifiers: payload.data.modifiers
        ? {
            ...payload.data.modifiers,
            item: payload.data.modifiers.item ? [...payload.data.modifiers.item] : undefined,
          }
        : undefined,
    };

    // Prevent illegal stacking of multiple body armors or multiple shields
    const inv: any[] = data.inventory ?? [];
    const equippedArmor = inv.filter((i) => i.equipped && i.definition?.filterType === "Armor");
    const body = equippedArmor.filter((i) => (i.definition?.armorTypeId ?? 0) <= 3);
    const shields = equippedArmor.filter((i) => i.definition?.armorTypeId === 4);

    // Helper to calculate magic AC bonus for a definition ID
    const getItemAcBonus = (defId: number) => {
      const itemMods = data.modifiers?.item ?? [];
      return itemMods
        .filter(
          (m: any) =>
            m.componentId === defId &&
            m.componentTypeId === 112130694 &&
            m.subType === "armor-class" &&
            m.type === "bonus",
        )
        .reduce((sum: number, m: any) => sum + (typeof m.value === "number" ? m.value : 0), 0);
    };

    let bestBodyArmor: any = null;
    if (body.length > 0) {
      bestBodyArmor = body.reduce((a, b) => {
        const aEff = (a.definition.armorClass ?? 0) + getItemAcBonus(a.definition.id);
        const bEff = (b.definition.armorClass ?? 0) + getItemAcBonus(b.definition.id);
        return bEff > aEff ? b : a;
      });
    }

    let bestShield: any = null;
    if (shields.length > 0) {
      bestShield = shields.reduce((a, b) => {
        const aEff = (a.definition.armorClass ?? 0) + getItemAcBonus(a.definition.id);
        const bEff = (b.definition.armorClass ?? 0) + getItemAcBonus(b.definition.id);
        return bEff > aEff ? b : a;
      });
    }

    const modifiersToRemove = new Map<string, number>();

    const markItemUnequipped = (item: any) => {
      item.equipped = false;
      const granted = item.definition?.grantedModifiers ?? [];
      for (const m of granted) {
        if (m.id) {
          const idStr = String(m.id);
          modifiersToRemove.set(idStr, (modifiersToRemove.get(idStr) ?? 0) + 1);
        }
      }
    };

    body.forEach((item) => {
      if (item !== bestBodyArmor) {
        markItemUnequipped(item);
      }
    });

    shields.forEach((item) => {
      if (item !== bestShield) {
        markItemUnequipped(item);
      }
    });

    if (data.modifiers?.item && modifiersToRemove.size > 0) {
      data.modifiers.item = data.modifiers.item.filter((m: any) => {
        if (m.id) {
          const idStr = String(m.id);
          const count = modifiersToRemove.get(idStr) ?? 0;
          if (count > 0) {
            modifiersToRemove.set(idStr, count - 1);
            return false; // remove this copy of the modifier
          }
        }
        return true;
      });
    }

    const modifiers = flattenModifiers(data);
    const generatedGrants = mapDdbModifiersToGrants(modifiers);

    const abilities: AbilityScore[] = ABILITY_NAMES.map((name, i) => {
      const score = computeFinalScore(
        data.stats,
        data.bonusStats,
        data.overrideStats,
        modifiers,
        i + 1,
      );
      return { name, score, modifier: mod(score) };
    });

    const totalLevel = (data.classes ?? []).reduce(
      (sum: number, c: any) => sum + (c.level ?? 0),
      0,
    );
    const pb = Math.ceil((totalLevel || 1) / 4) + 1;
    const classes = (data.classes ?? [])
      .map((c: any) => `${c.definition?.name ?? "?"} ${c.level ?? ""}`.trim())
      .join(" / ");
    const subclasses: string[] = (data.classes ?? [])
      .map((c: any) => {
        const sub =
          c?.subclassDefinition?.name ??
          c?.definition?.subclassDefinition?.name ??
          c?.subClassDefinition?.name ??
          c?.subclass?.name ??
          "";
        return typeof sub === "string" ? sub.trim() : "";
      })
      .filter((s: string) => s.length > 0);

    const conMod = abilities[2].modifier;
    const baseHp = data.baseHitPoints ?? 0;
    const bonusHp = data.bonusHitPoints ?? 0;
    const overrideHp = data.overrideHitPoints;
    const removedHp = data.removedHitPoints ?? 0;
    const tempHp = data.temporaryHitPoints ?? 0;

    let hpPerLevelBonus = 0;
    for (const m of modifiers) {
      if (
        m?.type === "bonus" &&
        m?.subType === "hit-points-per-level" &&
        typeof m?.value === "number"
      ) {
        hpPerLevelBonus += m.value;
      }
    }

    const hpMax =
      typeof overrideHp === "number"
        ? overrideHp
        : baseHp + bonusHp + (conMod + hpPerLevelBonus) * totalLevel;
    const hpCurrent = Math.max(0, hpMax - removedHp);

    const dexMod = abilities[DEX_INDEX].modifier;
    const armorClass = computeArmorClass(data, dexMod, modifiers, abilities);

    // Calculate Initiative
    let initiative = dexMod;
    let initBonus = 0;
    for (const m of modifiers) {
      if (m?.subType === "initiative") {
        if (m?.type === "bonus") {
          if (typeof m.value === "number") initBonus += m.value;
          if (typeof m.statId === "number" && m.statId >= 1 && m.statId <= 6) {
            initBonus += abilities[m.statId - 1].modifier;
          }
        } else if (m?.type === "half-proficiency") {
          initBonus += Math.floor(pb / 2);
        } else if (m?.type === "proficiency") {
          initBonus += pb;
        }
      }
    }
    initiative += initBonus;

    // Calculate Speeds (walk, fly, swim, climb, burrow)
    const rawSpeeds = data.race?.weightSpeeds?.normal || {};

    // Walk speed
    let speed = rawSpeeds.walk ?? 30;
    let walkSpeedBonus = 0;
    for (const m of modifiers) {
      if (
        m?.type === "bonus" &&
        (m?.subType === "speed" ||
          m?.subType === "unarmored-movement" ||
          m?.subType === "innate-speed-walking")
      ) {
        if (typeof m.value === "number") walkSpeedBonus += m.value;
      }
      if (
        m?.type === "set" &&
        m?.subType === "innate-speed-walking" &&
        typeof m.value === "number"
      ) {
        if (m.value > speed) speed = m.value;
      }
    }
    speed += walkSpeedBonus;
    if (data.customSpeeds) {
      const walkCustom = data.customSpeeds.find(
        (cs: { speedId: number; value: number | null }) => cs.speedId === 1,
      );
      if (walkCustom && typeof walkCustom.value === "number") speed = walkCustom.value;
    }

    // Special speeds
    const specialSpeeds: Array<{ type: string; value: number }> = [];
    const speedTypes = [
      {
        key: "fly",
        label: "Fly",
        customId: 2,
        subtypes: ["speed-flying", "innate-speed-flying", "flying-speed"],
      },
      {
        key: "swim",
        label: "Swim",
        customId: 3,
        subtypes: ["speed-swimming", "innate-speed-swimming", "swimming-speed"],
      },
      {
        key: "climb",
        label: "Climb",
        customId: 4,
        subtypes: ["speed-climbing", "innate-speed-climbing", "climbing-speed"],
      },
      {
        key: "burrow",
        label: "Burrow",
        customId: 5,
        subtypes: ["speed-burrowing", "innate-speed-burrowing", "burrowing-speed"],
      },
    ];

    for (const st of speedTypes) {
      let baseVal = rawSpeeds[st.key] ?? 0;
      let bonusVal = 0;
      for (const m of modifiers) {
        if (m?.type === "bonus" && st.subtypes.includes(m.subType) && typeof m.value === "number") {
          bonusVal += m.value;
        }
        if (m?.type === "set" && st.subtypes.includes(m.subType) && typeof m.value === "number") {
          if (m.value > baseVal) baseVal = m.value;
        }
      }
      let finalVal = baseVal + bonusVal;
      if (data.customSpeeds) {
        const custom = data.customSpeeds.find(
          (cs: { speedId: number; value: number | null }) => cs.speedId === st.customId,
        );
        if (custom && typeof custom.value === "number") finalVal = custom.value;
      }
      if (finalVal > 0) {
        specialSpeeds.push({ type: st.label, value: finalVal });
      }
    }

    const senses = computeSenses(modifiers, data.customSenses ?? []);
    const skills = computeSkills(modifiers, abilities, pb, data.characterValues ?? []);
    const saves = computeSaves(modifiers, abilities, pb);
    const { spellSlots, pactSlots } = computeSpellSlots(data);

    // Calculate Spellcasting Save DC and Attack Modifiers
    let spellSaveDcBonus = 0;
    let spellAttackBonus = 0;
    let spellSaveDcSet: number | null = null;
    let spellAttackSet: number | null = null;

    for (const m of modifiers) {
      if (m?.subType === "spell-save-dc" && typeof m?.value === "number") {
        if (m.type === "bonus") spellSaveDcBonus += m.value;
        else if (m.type === "set") spellSaveDcSet = m.value;
      }
      if (m?.subType === "spell-attacks" && typeof m?.value === "number") {
        if (m.type === "bonus") spellAttackBonus += m.value;
        else if (m.type === "set") spellAttackSet = m.value;
      }
    }

    const spellcasting: SpellcastingInfo[] = [];
    for (const c of data.classes ?? []) {
      const isCaster =
        c.definition?.canCastSpells ||
        c.subclassDefinition?.canCastSpells ||
        (c.definition?.spellCastingAbilityId != null && c.definition.spellCastingAbilityId > 0) ||
        (c.subclassDefinition?.spellCastingAbilityId != null &&
          c.subclassDefinition.spellCastingAbilityId > 0);

      if (!isCaster) continue;

      const abilityId =
        c.definition?.spellCastingAbilityId || c.subclassDefinition?.spellCastingAbilityId;
      if (typeof abilityId === "number" && abilityId >= 1 && abilityId <= 6) {
        const abilityIndex = abilityId - 1;
        const abilityName = ABILITY_NAMES[abilityIndex];
        const abilityMod = abilities[abilityIndex].modifier;
        const saveDc =
          spellSaveDcSet !== null ? spellSaveDcSet : 8 + pb + abilityMod + spellSaveDcBonus;
        const attackBonus =
          spellAttackSet !== null ? spellAttackSet : pb + abilityMod + spellAttackBonus;
        spellcasting.push({
          className: c.definition?.name ?? "Caster",
          ability: abilityName,
          saveDc,
          attackBonus,
        });
      }
    }

    const defenses = computeDefenses(modifiers);
    const actions = computeActions(data, abilities, pb);
    const inventory = computeInventory(data);
    let exhaustion = 0;
    const conditions: string[] = [];
    let languages: string[] = [];
    let tools: string[] = [];
    let armorProficiencies: string[] = [];
    let weaponProficiencies: string[] = [];

    for (const m of modifiers) {
      if (m?.type === "language" && m?.friendlySubtypeName) {
        languages.push(m.friendlySubtypeName);
      }
      if (m?.type === "proficiency") {
        const name = m?.friendlySubtypeName;
        if (name) {
          const isTool =
            m?.entityTypeId === 2103445194 ||
            name.toLowerCase().includes("tool") ||
            name.toLowerCase().includes("kit") ||
            name.toLowerCase().includes("supplies") ||
            name.toLowerCase().includes("gaming set") ||
            name.toLowerCase().includes("instruments") ||
            name.toLowerCase().includes("instrument") ||
            name.toLowerCase().includes("vehicles") ||
            name.toLowerCase().includes("vehicle");
          if (isTool) {
            tools.push(name);
          } else if (m?.entityTypeId === 174869515) {
            armorProficiencies.push(name);
          } else if (m?.entityTypeId === 660121713) {
            weaponProficiencies.push(name);
          }
        }
      }
    }

    if (Array.isArray(data.customProficiencies)) {
      for (const cp of data.customProficiencies) {
        const name = cp?.name;
        if (!name) continue;
        const type = String(cp?.type ?? "").toLowerCase();
        if (type === "language") {
          languages.push(name);
        } else if (
          type === "tool" ||
          type.includes("tool") ||
          name.toLowerCase().includes("tool") ||
          name.toLowerCase().includes("kit") ||
          name.toLowerCase().includes("supplies") ||
          name.toLowerCase().includes("gaming set") ||
          name.toLowerCase().includes("instruments") ||
          name.toLowerCase().includes("instrument") ||
          name.toLowerCase().includes("vehicles") ||
          name.toLowerCase().includes("vehicle")
        ) {
          tools.push(name);
        } else if (
          type === "armor" ||
          type === "shield" ||
          type.includes("armor") ||
          type.includes("shield")
        ) {
          armorProficiencies.push(name);
        } else if (type === "weapon" || type.includes("weapon")) {
          weaponProficiencies.push(name);
        }
      }
    }

    languages = Array.from(new Set(languages)).sort();
    tools = Array.from(new Set(tools)).sort();
    armorProficiencies = Array.from(new Set(armorProficiencies)).sort();
    weaponProficiencies = Array.from(new Set(weaponProficiencies)).sort();

    if (Array.isArray(data.conditions)) {
      for (const c of data.conditions) {
        const name: string | undefined = c?.definition?.name ?? c?.name;
        if (!name) continue;
        if (/exhaustion/i.test(name)) {
          exhaustion = Math.max(exhaustion, c?.level ?? 1);
          continue;
        }
        conditions.push(name);
      }
    }

    const ds = data.deathSaves ?? {};
    const deathSaves: DeathSaves = {
      successes: ds.successCount ?? 0,
      failures: ds.failCount ?? 0,
      stabilized: !!ds.isStabilized,
    };

    const background =
      data.background?.definition?.name ?? data.background?.customBackground?.name ?? "";

    const perceptionSkill = skills.find((s) => s.key === "perception");
    const investigationSkill = skills.find((s) => s.key === "investigation");
    const insightSkill = skills.find((s) => s.key === "insight");

    let passivePerceptionBonus = 0;
    let passiveInvestigationBonus = 0;
    let passiveInsightBonus = 0;

    for (const m of modifiers) {
      if (m?.type === "bonus" && typeof m?.value === "number") {
        if (m.subType === "passive-perception") passivePerceptionBonus += m.value;
        if (m.subType === "passive-investigation") passiveInvestigationBonus += m.value;
        if (m.subType === "passive-insight") passiveInsightBonus += m.value;
      }
    }

    const passivePerception =
      10 + (perceptionSkill?.modifier ?? abilities[WIS_INDEX].modifier) + passivePerceptionBonus;
    const passiveInvestigation =
      10 + (investigationSkill?.modifier ?? abilities[3].modifier) + passiveInvestigationBonus;
    const passiveInsight =
      10 + (insightSkill?.modifier ?? abilities[WIS_INDEX].modifier) + passiveInsightBonus;

    const hitDice = computeHitDice(data);
    const optionLabels = new Map<number, string>();
    for (const def of data.choices?.choiceDefinitions ?? []) {
      for (const opt of def.options ?? []) {
        if (opt.id != null && opt.label) {
          optionLabels.set(Number(opt.id), opt.label);
        }
      }
    }

    const featsMap = new Map<string, { name: string; description: string; choices: string[] }>();
    for (const f of data.feats ?? []) {
      const def = f.definition;
      if (!def) continue;

      // Filter out internal system placeholder / disguise feats (starting with double underscore)
      const categories = def.categories ?? [];
      const isHidden = categories.some((c: any) => c.tagName && c.tagName.startsWith("__"));
      if (isHidden) continue;

      const name = (def.name ?? "").replace(/^\d+:\s*/, "");
      if (!name) continue;
      const desc = def.snippet || def.description || "";

      const featChoices: string[] = [];
      const featId = def.id;
      if (data.choices?.feat) {
        for (const choice of data.choices.feat) {
          if (choice.componentId === featId && choice.optionValue != null) {
            const label = optionLabels.get(Number(choice.optionValue));
            if (label) {
              const cleanLabel = label.endsWith(" Score") ? label.replace(" Score", "") : label;
              featChoices.push(cleanLabel);
            }
          }
        }
      }
      featsMap.set(name, { name, description: desc, choices: featChoices });
    }
    const feats = Array.from(featsMap.values())
      .map(({ name, description, choices }) => ({ name, description, choices }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const alignment = ALIGNMENT_MAP[data.alignmentId ?? 0] ?? null;

    const currencies = {
      cp: data.currencies?.cp ?? 0,
      sp: data.currencies?.sp ?? 0,
      ep: data.currencies?.ep ?? 0,
      gp: data.currencies?.gp ?? 0,
      pp: data.currencies?.pp ?? 0,
    };

    const weightCarried = computeWeightCarried(data.inventory);
    const carryingCapacity = computeCarryingCapacity(abilities[0].score, modifiers);

    const attacks = computeAttacks(data, abilities, pb, modifiers);
    const { cantrips, preparedSpells, allSpells } = computeSpellsList(data);

    // Parse Features & Traits
    const features: FeatureInfo[] = [];
    let activeArmorModel: string | null = null;
    const activeInfusions: string[] = [];
    const infusions: Array<{ name: string; description: string }> = [];
    const metamagic: Array<{ name: string; description: string }> = [];
    const totemAspects: Array<{ name: string; description: string }> = [];
    const weaponMasteries: Array<{ name: string; description: string }> = [];

    // Class Features
    for (const c of data.classes ?? []) {
      const className = c.definition?.name ?? "Class";
      const classLevel = c.level ?? 0;
      for (const cf of c.classFeatures ?? []) {
        const def = cf.definition;
        if (!def || def.hideInSheet) continue;
        const name = def.name;
        const description = def.description || def.snippet || "";
        const requiredLevel = def.requiredLevel;
        if (name && !features.some((f) => f.name === name)) {
          features.push({
            name,
            description,
            source: "class",
            sourceName: className,
            level: requiredLevel ?? undefined,
            isUnlocked: requiredLevel ? classLevel >= requiredLevel : true,
          });
        }
      }
    }

    // Racial Traits
    const raceName = data.race?.fullName ?? data.race?.baseName ?? "Race";
    for (const rt of data.race?.racialTraits ?? []) {
      const def = rt.definition;
      if (!def || def.hideInSheet) continue;
      const name = def.name;
      const description = def.description || def.snippet || "";
      if (name && !features.some((f) => f.name === name)) {
        features.push({
          name,
          description,
          source: "race",
          sourceName: raceName,
        });
      }
    }

    // Parse Option Selections (e.g. Artificer Infusions, Armorer Models, Sorcerer Metamagic, Totem Aspects, Custom Feat Choices)
    const IGNORED_NAMES = new Set([
      "strength",
      "dexterity",
      "constitution",
      "intelligence",
      "wisdom",
      "charisma",
      "increase two scores (+2 / +1)",
      "increase one score (+1)",
      "ability score increase",
    ]);

    const optionTypes = ["class", "race", "feat", "background"] as const;
    for (const type of optionTypes) {
      const list = data.options?.[type] ?? [];
      for (const opt of list) {
        const def = opt.definition;
        if (!def) continue;

        const name = def.name;
        if (!name) continue;

        // Filter out generic stat increases and choices
        const lowerName = name.toLowerCase();
        if (IGNORED_NAMES.has(lowerName)) continue;
        if (lowerName.includes("increase") && lowerName.includes("score")) continue;

        const description = def.description || def.snippet || "";

        // Determine source and sourceName
        const source =
          type === "feat"
            ? "feat"
            : type === "race"
              ? "race"
              : type === "background"
                ? "background"
                : "class";
        let sourceName = "";
        let level: number | undefined;
        let isUnlocked = true;

        let isArmorModel = false;
        let isInfusion = false;
        let isMetamagic = false;
        let isTotem = false;
        let isWeaponMastery = false;

        if (type === "class") {
          let matchedClassName = "";
          for (const c of data.classes ?? []) {
            const classLevel = c.level ?? 0;
            for (const cf of c.classFeatures ?? []) {
              if (cf.definition?.id === opt.componentId) {
                matchedClassName = c.definition?.name ?? "";
                level = cf.definition?.requiredLevel ?? undefined;
                isUnlocked = level ? classLevel >= level : true;

                const parentName = cf.definition?.name ?? "";
                if (parentName === "Armor Model" || opt.componentId === 12497161) {
                  isArmorModel = true;
                } else if (parentName === "Magic Item Plans" || opt.componentId === 12497143) {
                  isInfusion = true;
                } else if (
                  parentName === "Metamagic" ||
                  parentName === "Metamagic Options" ||
                  parentName.toLowerCase().includes("metamagic")
                ) {
                  isMetamagic = true;
                } else if (
                  parentName === "Aspect of the Wilds" ||
                  parentName === "Aspect of the Beast" ||
                  parentName === "Totem Spirit" ||
                  parentName.toLowerCase().includes("totem")
                ) {
                  isTotem = true;
                }
                break;
              }
            }
            if (matchedClassName) break;
          }
          sourceName = matchedClassName || (data.classes?.[0]?.definition?.name ?? "Class");
        } else if (type === "race") {
          sourceName = data.race?.fullName ?? data.race?.baseName ?? "Race";
        } else if (type === "feat") {
          const feat = data.feats?.find(
            (f: { definition?: { id?: number } }) => f.definition?.id === opt.componentId,
          );
          sourceName = feat?.definition?.name ?? "Feat";

          const parentName = feat?.definition?.name ?? "";
          if (parentName.toLowerCase().includes("weapon mastery")) {
            isWeaponMastery = true;
          }
        } else if (type === "background") {
          sourceName =
            data.background?.definition?.name ??
            data.background?.customBackground?.name ??
            "Background";
        }

        if (isArmorModel) {
          activeArmorModel = name;
        } else if (isInfusion) {
          infusions.push({ name, description });
        } else if (isMetamagic) {
          metamagic.push({ name, description });
        } else if (isTotem) {
          totemAspects.push({ name, description });
        } else if (isWeaponMastery) {
          weaponMasteries.push({ name, description });
        } else {
          if (!features.some((f) => f.name === name)) {
            features.push({
              name,
              description,
              source,
              sourceName,
              level,
              isUnlocked,
            });
          }
        }
      }
    }

    // Populate active infusions from inventory items infused in DDB
    for (const item of data.inventory ?? []) {
      if (item.originEntityTypeId === 258900837) {
        const name = item.definition?.name;
        if (name) {
          activeInfusions.push(name);
        }
      }
    }

    // Sort features: first by source, then level (if class), then name
    features.sort((a, b) => {
      if (a.source !== b.source) return a.source.localeCompare(b.source);
      if (a.level !== undefined && b.level !== undefined && a.level !== b.level) {
        return a.level - b.level;
      }
      return a.name.localeCompare(b.name);
    });

    const characteristics: CharacterCharacteristics = {
      personalityTraits: data.traits?.personalityTraits ?? "",
      ideals: data.traits?.ideals ?? "",
      bonds: data.traits?.bonds ?? "",
      flaws: data.traits?.flaws ?? "",
      appearance: data.traits?.appearance ?? "",
      gender: data.gender ?? "",
      age: data.age != null ? String(data.age) : "",
      height: data.height ?? "",
      weight: data.weight ?? "",
      eyes: data.eyes ?? "",
      skin: data.skin ?? "",
      hair: data.hair ?? "",
      backstory: data.notes?.backstory ?? "",
      allies: data.notes?.allies ?? "",
      enemies: data.notes?.enemies ?? "",
      organizations: data.notes?.organizations ?? "",
      otherNotes: data.notes?.other ?? "",
    };

    const STAT_ID_TO_NAME: Record<number, string> = {
      1: "STR",
      2: "DEX",
      3: "CON",
      4: "INT",
      5: "WIS",
      6: "CHA",
    };
    const SKILL_ID_TO_NAME: Record<number, string> = {
      2: "Athletics",
      3: "Acrobatics",
      4: "Sleight of Hand",
      5: "Stealth",
      6: "Arcana",
      8: "History",
      9: "Investigation",
      10: "Nature",
      11: "Animal Handling",
      12: "Insight",
      13: "Medicine",
      14: "Perception",
      15: "Religion",
      16: "Deception",
      17: "Intimidation",
      18: "Performance",
      19: "Persuasion",
      20: "Survival",
    };

    const creatures: CreatureInfo[] = (data.creatures ?? []).map((c: any) => {
      const def = c.definition ?? {};
      const creatureStats = (def.stats ?? []).map((s: any) => ({
        statId: s.statId,
        name: s.name ?? null,
        value: s.value ?? 10,
      }));

      const getCreatureStatMod = (statId: number) => {
        const s = creatureStats.find((x: any) => x.statId === statId);
        const val = s ? s.value : 10;
        return Math.floor((val - 10) / 2);
      };

      const cSavingThrows = (def.savingThrows ?? []).map((st: any) => {
        const name = STAT_ID_TO_NAME[st.statId] ?? `Stat ${st.statId}`;
        const statMod = getCreatureStatMod(st.statId);
        const bonus = st.bonusModifier ?? 0;
        const total = statMod + pb + bonus;
        return { name, value: total };
      });

      const cSkills = (def.skills ?? []).map((sk: any) => {
        const name = SKILL_ID_TO_NAME[sk.skillId] ?? `Skill ${sk.skillId}`;
        const total = (sk.value ?? 0) + (sk.additionalBonus ?? 0);
        return { name, value: total };
      });

      return {
        id: c.id,
        name: c.name ?? null,
        description: c.description ?? null,
        isActive: !!c.isActive,
        removedHitPoints: c.removedHitPoints ?? 0,
        temporaryHitPoints: c.temporaryHitPoints ?? null,
        definition: {
          id: def.id,
          name: def.name ?? "Unknown Creature",
          armorClass: def.armorClass ?? 0,
          armorClassDescription: def.armorClassDescription ?? null,
          averageHitPoints: def.averageHitPoints ?? 0,
          hitPointDice: def.hitPointDice
            ? {
                diceCount: def.hitPointDice.diceCount ?? 0,
                diceValue: def.hitPointDice.diceValue ?? 0,
                diceString: def.hitPointDice.diceString ?? "",
              }
            : null,
          movements: (def.movements ?? []).map((m: any) => ({
            movementId: m.movementId,
            speed: m.speed,
            notes: m.notes ?? "",
          })),
          passivePerception: def.passivePerception ?? 10,
          avatarUrl: def.avatarUrl ?? null,
          stats: creatureStats,
          senses: (def.senses ?? []).map((s: any) => ({
            senseId: s.senseId,
            notes: s.notes ?? "",
          })),
          specialTraitsDescription: def.specialTraitsDescription ?? "",
          actionsDescription: def.actionsDescription ?? "",
          reactionsDescription: def.reactionsDescription ?? "",
          bonusActionsDescription: def.bonusActionsDescription ?? "",
          characteristicsDescription: def.characteristicsDescription ?? "",
          skills: cSkills,
          savingThrows: cSavingThrows,
        },
      };
    });

    return {
      id: data.id,
      name: data.name ?? "Unnamed",
      avatarUrl: data.decorations?.avatarUrl ?? null,
      race: data.race?.fullName ?? data.race?.baseName ?? "Unknown",
      background,
      classes: classes || "—",
      subclasses,
      level: totalLevel,
      hpMax,
      hpCurrent,
      tempHp,
      inspiration: !!data.inspiration,
      exhaustion,
      deathSaves,
      passivePerception,
      passiveInvestigation,
      passiveInsight,
      armorClass,
      initiative,
      speed,
      proficiencyBonus: pb,
      senses,
      skills,
      saves,
      spellSlots,
      pactSlots,
      abilities,
      conditions,
      languages,
      tools,
      armorProficiencies,
      weaponProficiencies,
      specialSpeeds,
      spellcasting,
      hitDice,
      feats,
      alignment,
      currencies,
      weightCarried,
      carryingCapacity,
      attacks,
      cantrips,
      preparedSpells,
      allSpells,
      defenses,
      actions,
      inventory,
      features,
      characteristics,
      activeArmorModel,
      activeInfusions,
      infusions,
      metamagic,
      totemAspects,
      weaponMasteries,
      creatures,
      _generatedGrants: generatedGrants,
      readonlyUrl: data.readonlyUrl ?? `https://www.dndbeyond.com/characters/${id}`,
    };
  } catch (err: any) {
    return errorMember(id, err?.message ?? "Fetch failed");
  }
}
