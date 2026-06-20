import type { ForgeData } from "./forge-data";
import { normalizeChoiceName } from "../../components/builder/BuilderUtils";

export interface ForgeLookupIndexes {
  speciesById: Map<string, any>;
  speciesVariantsBySpeciesId: Map<string, any[]>;
  backgroundsById: Map<string, any>;
  classesById: Map<string, any>;
  subclassesByClassId: Map<string, any[]>;
  classFeaturesByIndex: Map<string, any[]>; // e.g., classId_subclassId_level or classId_level
  featsById: Map<string, any>;
  spellsById: Map<string, any>;
  classSpellsByClassId: Map<string, any[]>;
  skillsByName: Map<string, any>;
  skillsById: Map<string, any>;
  languagesByName: Map<string, any>;
  languagesById: Map<string, any>;
  toolsByName: Map<string, any>;
  activeEffectsBySourceEntity: Map<string, any[]>;
}

function normalize(name: string) {
  return normalizeChoiceName(name).toLowerCase();
}

export function createForgeIndexes(data: ForgeData): ForgeLookupIndexes {
  const indexes: ForgeLookupIndexes = {
    speciesById: new Map(),
    speciesVariantsBySpeciesId: new Map(),
    backgroundsById: new Map(),
    classesById: new Map(),
    subclassesByClassId: new Map(),
    classFeaturesByIndex: new Map(),
    featsById: new Map(),
    spellsById: new Map(),
    classSpellsByClassId: new Map(),
    skillsByName: new Map(),
    skillsById: new Map(),
    languagesByName: new Map(),
    languagesById: new Map(),
    toolsByName: new Map(),
    activeEffectsBySourceEntity: new Map(),
  };

  if (data.species) {
    for (const item of data.species) {
      if (item.id) indexes.speciesById.set(item.id, item);
    }
  }

  if (data.speciesVariants) {
    for (const item of data.speciesVariants) {
      if (item.speciesId) {
        if (!indexes.speciesVariantsBySpeciesId.has(item.speciesId)) {
          indexes.speciesVariantsBySpeciesId.set(item.speciesId, []);
        }
        indexes.speciesVariantsBySpeciesId.get(item.speciesId)!.push(item);
      }
    }
  }

  if (data.backgrounds) {
    for (const item of data.backgrounds) {
      if (item.id) indexes.backgroundsById.set(item.id, item);
    }
  }

  if (data.classes) {
    for (const item of data.classes) {
      if (item.id) indexes.classesById.set(item.id, item);
    }
  }

  if (data.subclasses) {
    for (const item of data.subclasses) {
      if (item.classId) {
        if (!indexes.subclassesByClassId.has(item.classId)) {
          indexes.subclassesByClassId.set(item.classId, []);
        }
        indexes.subclassesByClassId.get(item.classId)!.push(item);
      }
    }
  }

  if (data.classFeatures) {
    for (const item of data.classFeatures) {
      const classId = item.classId || "unknown";
      const subclassId = item.subclassId || "none";
      const level = item.level || 0;
      const key = `${classId}_${subclassId}_${level}`;
      if (!indexes.classFeaturesByIndex.has(key)) {
        indexes.classFeaturesByIndex.set(key, []);
      }
      indexes.classFeaturesByIndex.get(key)!.push(item);
    }
  }

  if (data.feats) {
    for (const item of data.feats) {
      if (item.id) indexes.featsById.set(item.id, item);
    }
  }

  if (data.spells) {
    for (const item of data.spells) {
      if (item.id) indexes.spellsById.set(item.id, item);
    }
  }

  if (data.classSpells) {
    for (const item of data.classSpells) {
      if (item.classId) {
        if (!indexes.classSpellsByClassId.has(item.classId)) {
          indexes.classSpellsByClassId.set(item.classId, []);
        }
        indexes.classSpellsByClassId.get(item.classId)!.push(item);
      }
    }
  }

  if (data.skills) {
    for (const item of data.skills) {
      if (item.id) indexes.skillsById.set(item.id, item);
      if (item.name) indexes.skillsByName.set(normalize(item.name), item);
    }
  }

  if (data.languages) {
    for (const item of data.languages) {
      if (item.id) indexes.languagesById.set(item.id, item);
      if (item.name) indexes.languagesByName.set(normalize(item.name), item);
    }
  }

  const indexTool = (item: any) => {
    if (item.name) {
      indexes.toolsByName.set(normalize(item.name), item);
    }
  };

  if (data.mundaneGear) data.mundaneGear.forEach(indexTool);
  if (data.itemTypes) data.itemTypes.forEach(indexTool);

  const indexEffect = (item: any) => {
    if (item.sourceEntity) {
      if (!indexes.activeEffectsBySourceEntity.has(item.sourceEntity)) {
        indexes.activeEffectsBySourceEntity.set(item.sourceEntity, []);
      }
      indexes.activeEffectsBySourceEntity.get(item.sourceEntity)!.push(item);
    }
  };

  if (data.activeEffects) data.activeEffects.forEach(indexEffect);
  if (data.featureActiveEffects) data.featureActiveEffects.forEach(indexEffect);
  if (data.itemActiveEffects) data.itemActiveEffects.forEach(indexEffect);
  if (data.spellActiveEffects) data.spellActiveEffects.forEach(indexEffect);

  return indexes;
}
