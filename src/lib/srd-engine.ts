import { rules, SRDRule } from "../data/srd";
export type { SRDRule } from "../data/srd";

export function getRule(id: string): SRDRule | undefined {
  return rules.find((r) => r.id === id);
}

export function getAllRules(): SRDRule[] {
  return rules;
}
