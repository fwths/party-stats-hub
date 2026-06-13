import { rules, races, classes, SRDRule, SRDRace, SRDClass } from "../data/srd";

export function getRule(id: string): SRDRule | undefined {
  return rules.find(r => r.id === id);
}

export function getAllRules(): SRDRule[] {
  return rules;
}

export function getRace(id: string): SRDRace | undefined {
  return races.find(r => r.id === id);
}

export function getAllRaces(): SRDRace[] {
  return races;
}

export function getClass(id: string): SRDClass | undefined {
  return classes.find(c => c.id === id);
}

export function getAllClasses(): SRDClass[] {
  return classes;
}

export function getLevelFeatures(classId: string, level: number) {
  const cls = getClass(classId);
  if (!cls) return [];
  return cls.featuresByLevel[level] || [];
}
