import { z } from "zod";

// THE UNBREAKABLE WALL OF PERFECTION
// These Zod schemas are used by the Auditor Subagent to guarantee the LLM didn't hallucinate.

export const ActiveEffectSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["Buff", "Debuff", "Aura"]),
  target: z.enum(["Self", "Ally", "Enemy", "Area"]),
  durationValue: z.number().optional(),
  durationUnit: z.string().optional(),
  changes: z.array(
    z.object({
      key: z.string(),
      mode: z.enum(["Add", "Multiply", "Override", "Upgrade", "Downgrade"]),
      value: z.union([z.number(), z.string()]),
    }),
  ),
  grantsAdvantageOn: z.array(z.string()).optional(),
  grantsDisadvantageOn: z.array(z.string()).optional(),
  grantsResistances: z.array(z.string()).optional(),
  grantsImmunities: z.array(z.string()).optional(),
});

export const SpellSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number().min(0).max(9),
  school: z.string(),
  castingTime: z.string(),
  range: z.string(),
  duration: z.string(),
  concentration: z.boolean(),
  ritual: z.boolean(),
  description: z.string(),
  components: z.object({
    v: z.boolean(),
    s: z.boolean(),
    m: z.boolean(),
    materialDescription: z.string().optional(),
    materialCost: z.number().optional(),
    consumed: z.boolean().optional(),
  }),
  damage: z
    .array(
      z.object({
        dice: z.string(),
        type: z.string(),
        scalingType: z.enum(["spellLevel", "characterLevel", "none"]).optional(),
        scalingFormula: z.string().optional(),
      }),
    )
    .optional(),
  savingThrow: z
    .object({
      ability: z.enum([
        "Strength",
        "Dexterity",
        "Constitution",
        "Intelligence",
        "Wisdom",
        "Charisma",
      ]),
      halfOnSuccess: z.boolean(),
    })
    .optional(),
  areaOfEffect: z
    .object({
      type: z.enum(["Sphere", "Cone", "Cube", "Line", "Cylinder", "Emanation"]),
      size: z.number(),
    })
    .optional(),
  attackRoll: z.boolean().optional(),
  summonsStatBlockIds: z.array(z.string()).optional(),
  source: z.string().optional(),
  page: z.number().optional(),
});

export const WeaponSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["Simple", "Martial"]),
  type: z.enum(["Melee", "Ranged"]),
  costGp: z.number(),
  damage: z.object({
    dice: z.string(),
    type: z.string(),
    versatileDice: z.string().optional(),
  }),
  range: z
    .object({
      normal: z.number(),
      long: z.number(),
    })
    .optional(),
  properties: z.array(z.string()),
  mastery: z.enum(["Cleave", "Graze", "Nick", "Push", "Sap", "Slow", "Topple", "Vex"]).optional(),
  weight: z.number(),
});

export const OriginFeatSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["Origin", "General", "Fighting Style", "Epic Boon"]),
  description: z.string(),
  prerequisite: z.string().optional(),
  levelRequirement: z.number().optional(),
  repeatable: z.boolean().default(false),
});

export const BackgroundSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  abilityScoreIncreases: z.object({
    choose: z.number(),
    options: z.array(z.string()),
    amount: z.number(),
  }),
  skillProficiencies: z.array(z.string()),
  toolProficiencies: z.array(z.string()),
  startingEquipment: z.array(z.string()),
  originFeatId: z.string(),
});
