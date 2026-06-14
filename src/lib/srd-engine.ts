import { SRDRule, SRDSpecies, SRDClass, SRDRace } from "../data/srd";
import { races } from "../data/srd/races";
import { classes } from "../data/srd/classes";

export type { SRDRule, SRDSpecies, SRDClass, SRDRace };

export function getRule(id: string): SRDRule | undefined {
  return undefined;
}

export function getAllRules(): SRDRule[] {
  return [];
}

export function getRace(id: string): SRDRace | undefined {
  return races.find((r) => r.id === id);
}

export function getAllRaces(): SRDRace[] {
  return races;
}

export function getClass(id: string): SRDClass | undefined {
  return classes.find((c) => c.id === id);
}

export function getAllClasses(): SRDClass[] {
  return classes;
}

export function getLevelFeatures(classId: string, level: number) {
  const cls = getClass(classId);
  if (!cls) return [];
  return cls.featuresByLevel[level] || [];
}
