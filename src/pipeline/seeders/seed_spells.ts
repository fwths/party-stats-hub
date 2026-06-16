import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import { SpellSchema } from "../zodSchemas";

export async function seedSpells(db: any) {
  console.log("Seeding spells from raw data...");

  const spellsFile = path.join(process.cwd(), "src/data/raw/spells/spells.json");
  if (fs.existsSync(spellsFile)) {
    try {
      const rawSpells = fs.readFileSync(spellsFile, "utf-8");
      const spellsData = JSON.parse(rawSpells);
      const spellsList = Array.isArray(spellsData) ? spellsData : spellsData.spells || [];

      let count = 0;
      for (const spell of spellsList) {
        
        // Map raw Open5e format to Zod strict format
        const mappedSpell = {
          id: spell.slug || spell.name.toLowerCase().replace(/\s+/g, "-"),
          name: spell.name,
          level: spell.level_int !== undefined ? spell.level_int : (parseInt(spell.level) || 0),
          school: spell.school || "Unknown",
          castingTime: spell.casting_time || "1 action",
          range: spell.range || "Unknown",
          duration: spell.duration || "Instantaneous",
          concentration: spell.requires_concentration === true || spell.concentration === "yes",
          ritual: spell.can_be_cast_as_ritual === true || spell.ritual === "yes",
          description: spell.desc || spell.description || "",
          components: {
            v: !!spell.requires_verbal_components,
            s: !!spell.requires_somatic_components,
            m: !!spell.requires_material_components,
            materialDescription: spell.material || undefined,
          },
          // Flat JSON doesn't provide structured damage/saves, we leave them undefined
          damage: undefined,
          savingThrow: undefined,
          areaOfEffect: undefined,
          attackRoll: undefined,
          summonsStatBlockIds: undefined,
          source: spell.document__title || spell.source || "",
        };

        // Robust Schema Validation
        const parsedSpell = SpellSchema.safeParse(mappedSpell);
        if (!parsedSpell.success) {
          console.error(`Validation failed for spell ${spell.name || "Unknown"}:`, parsedSpell.error.message);
          continue; // Skip invalid entries to maintain absolute robustness
        }
        
        const validSpell = parsedSpell.data;

        await db
          .insert(schema.spells)
          .values({
            id: validSpell.id,
            name: validSpell.name,
            level: validSpell.level,
            school: validSpell.school,
            castingTime: validSpell.castingTime,
            range: validSpell.range,
            duration: validSpell.duration,
            concentration: validSpell.concentration,
            ritual: validSpell.ritual,
            description: validSpell.description,
            componentsJson: JSON.stringify(validSpell.components || {}),
            damageJson: JSON.stringify([]),
            healingJson: JSON.stringify({}), 
            savingThrowJson: JSON.stringify({}),
            areaOfEffectJson: JSON.stringify({}),
            attackRoll: false,
            summonsStatBlockIds: JSON.stringify([]),
            source: validSpell.source,
          })
          .onConflictDoUpdate({
            target: schema.spells.id,
            set: {
              name: validSpell.name,
              level: validSpell.level,
              school: validSpell.school,
              castingTime: validSpell.castingTime,
              range: validSpell.range,
              duration: validSpell.duration,
              concentration: validSpell.concentration,
              ritual: validSpell.ritual,
              description: validSpell.description,
              componentsJson: JSON.stringify(validSpell.components || {}),
              damageJson: JSON.stringify([]),
              healingJson: JSON.stringify({}),
              savingThrowJson: JSON.stringify({}),
              areaOfEffectJson: JSON.stringify({}),
              attackRoll: false,
              summonsStatBlockIds: JSON.stringify([]),
              source: validSpell.source,
            },
          });
        count++;
      }
      console.log(`Seeded ${count} spells perfectly.`);
    } catch (e) {
      console.error("Error seeding spells:", e);
    }
  }
}
