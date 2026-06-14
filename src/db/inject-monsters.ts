import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import * as path from "path";
import * as fs from "fs";

// Locate the sqlite.db file at the root of the project
const dbPath = path.join(process.cwd(), "sqlite.db");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

// Helper to convert names to lowercase hyphenated slugified string
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special characters
    .replace(/\s+/g, "-") // replace spaces with hyphens
    .replace(/-+/g, "-"); // collapse multiple hyphens
}

// Helper to convert ALL CAPS to Title Case
function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Clean alignment
function cleanAlignment(alignmentStr: string): string {
  let clean = alignmentStr.trim();
  clean = clean
    .replace(/e[l11]j[i1]l/gi, "Evil")
    .replace(/e1ji!/gi, "Evil")
    .replace(/elJil/gi, "Evil")
    .replace(/elli!/gi, "Evil")
    .replace(/e1jil/gi, "Evil")
    .replace(/fl\)il/gi, "Evil")
    .replace(/f\[\)fl/gi, "Evil")
    .replace(/fl\)il/gi, "Evil")
    .replace(/g00d/gi, "Good")
    .replace(/go0d/gi, "Good")
    .replace(/g0od/gi, "Good")
    .replace(/neutral/gi, "Neutral")
    .replace(/lawful/gi, "Lawful")
    .replace(/chaotic/gi, "Chaotic")
    .replace(/unaligned/gi, "Unaligned")
    .replace(/any alignment/gi, "Any Alignment");

  // Keep only letters and spaces
  clean = clean.replace(/[^a-zA-Z\s-]/g, "").trim();
  return titleCase(clean) || "Neutral";
}

// Helper to correct mangled stat values using modifiers
function cleanStatValue(statName: string, rawVal: number, rawModStr: string | undefined): number {
  if (!rawModStr) return rawVal;

  const modStr = rawModStr.trim().replace(/\s+/g, "");
  const isNegative = modStr.startsWith("-");
  let numPart = modStr.substring(1);
  numPart = numPart.replace(/[Oo]/g, "0").replace(/[lIi]/g, "1");
  const modVal = parseInt(numPart) * (isNegative ? -1 : 1);

  if (isNaN(modVal)) return rawVal;

  const expectedMin = 10 + 2 * modVal;
  const expectedMax = expectedMin + 1;

  if (rawVal >= expectedMin && rawVal <= expectedMax) {
    return rawVal;
  }

  // It's mangled. Let's fix it!
  const lastDigitVal = rawVal % 10;
  if (Math.abs(expectedMin % 10) === lastDigitVal) {
    return expectedMin;
  }
  if (Math.abs(expectedMax % 10) === lastDigitVal) {
    return expectedMax;
  }
  return expectedMin; // default fallback
}

// XP to CR Mapping
const xpToCrMap: Record<number, number> = {
  0: 0,
  10: 0,
  25: 0,
  50: 0,
  100: 0,
  200: 1,
  450: 2,
  700: 3,
  1100: 4,
  1800: 5,
  2300: 6,
  2900: 7,
  3900: 8,
  5000: 9,
  5900: 10,
  7200: 11,
  8400: 12,
  10000: 13,
  11500: 14,
  13000: 15,
  15000: 16,
  18000: 17,
  20000: 18,
  22000: 19,
  25000: 20,
  33000: 21,
  41000: 22,
  50000: 23,
  62000: 24,
  75000: 25,
  90000: 26,
  105000: 27,
  120000: 28,
  135000: 29,
  155000: 30,
};

// CR and PB Parser (handles mangled CRs using XP or PB)
function parseCRAndPB(lines: string[]): { challengeRating: number; proficiencyBonus: number } {
  let declaredCRStr = "";
  let xpVal = -1;
  let pbVal = -1;

  for (const line of lines) {
    const crMatch = line.match(/CR\s*([0-9/]+)/i);
    if (crMatch) {
      declaredCRStr = crMatch[1];
    }
    const xpMatch = line.match(/XP\s*([0-9,.]+)/i);
    if (xpMatch) {
      xpVal = parseInt(xpMatch[1].replace(/[,.]/g, ""));
    }
    const pbMatch = line.match(/PB\s*([+-]\s*\d+)/i);
    if (pbMatch) {
      pbVal = parseInt(pbMatch[1].replace(/\s+/g, ""));
    }
  }

  let cr = 0;
  if (declaredCRStr.includes("/")) {
    cr = 0; // fractional CR mapped to 0
  } else {
    cr = parseInt(declaredCRStr) || 0;
  }

  // Correct using XP
  if (xpVal !== -1 && xpToCrMap[xpVal] !== undefined) {
    const correctCR = xpToCrMap[xpVal];
    if (cr !== correctCR) {
      cr = correctCR;
    }
  } else if (pbVal !== -1) {
    // Correct using PB
    const pbToCRRange = [
      { pb: 2, min: 0, max: 4 },
      { pb: 3, min: 5, max: 8 },
      { pb: 4, min: 9, max: 12 },
      { pb: 5, min: 13, max: 16 },
      { pb: 6, min: 17, max: 20 },
      { pb: 7, min: 21, max: 24 },
      { pb: 8, min: 25, max: 28 },
      { pb: 9, min: 29, max: 30 },
    ];
    const range = pbToCRRange.find((r) => r.pb === pbVal);
    if (range && (cr < range.min || cr > range.max)) {
      cr = range.min;
    }
  }

  if (pbVal === -1) {
    if (cr <= 4) pbVal = 2;
    else if (cr <= 8) pbVal = 3;
    else if (cr <= 12) pbVal = 4;
    else if (cr <= 16) pbVal = 5;
    else if (cr <= 20) pbVal = 6;
    else if (cr <= 24) pbVal = 7;
    else if (cr <= 28) pbVal = 8;
    else pbVal = 9;
  }

  return { challengeRating: cr, proficiencyBonus: pbVal };
}

// Parses items (traits/actions) from section lines
function parseSectionItems(lines: string[]): { name: string; description: string }[] | null {
  const items: { name: string; description: string }[] = [];
  let currentItem: { name: string; description: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const itemStartMatch = trimmed.match(/^([A-Z][A-Za-z0-9\s-()'/+]+?)\.\s*(.*)/);
    if (itemStartMatch) {
      if (currentItem) {
        items.push(currentItem);
      }
      currentItem = {
        name: itemStartMatch[1].trim(),
        description: itemStartMatch[2].trim(),
      };
    } else {
      if (currentItem) {
        currentItem.description += " " + trimmed;
      } else {
        currentItem = {
          name: "Detail",
          description: trimmed,
        };
      }
    }
  }

  if (currentItem) {
    items.push(currentItem);
  }

  return items.length > 0 ? items : null;
}

interface MonsterBlock {
  name: string;
  startIndex: number;
  sizeTypeLine: string;
  lines?: string[];
}

// Main processing function
async function main() {
  console.log("Reading raw book Monster Manual 5e 2024.md...");
  const bookPath = path.join(process.cwd(), "raw_books/Monster Manual 5e 2024.md");
  const content = fs.readFileSync(bookPath, "utf-8");
  const lines = content.split("\n");

  const monstersList: MonsterBlock[] = [];
  const sizeRegex =
    /^(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+(Aberration|Beast|Celestial|Construct|Dragon|Elemental|Fey|Fiend|Giant|Humanoid|Monstrosity|Ooze|Plant|Undead)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (sizeRegex.test(line)) {
      let name = "";
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].trim()) {
          name = lines[j].trim();
          break;
        }
      }

      // Skip page headers or table of contents lines
      if (
        name.includes("PAGE") ||
        name.startsWith("#") ||
        name.includes("---") ||
        name.includes("..")
      ) {
        continue;
      }

      monstersList.push({
        name,
        startIndex: i,
        sizeTypeLine: line,
      });
    }
  }

  // Slice individual monster sections
  for (let k = 0; k < monstersList.length; k++) {
    const current = monstersList[k];
    const start = current.startIndex;
    const nextStart =
      k + 1 < monstersList.length ? monstersList[k + 1].startIndex - 2 : lines.length;
    current.lines = lines.slice(start, nextStart);
  }

  console.log(`Found ${monstersList.length} candidate monster blocks in text.`);

  let insertedCount = 0;

  for (const m of monstersList) {
    try {
      if (!m.lines) {
        continue;
      }
      const speedLineIdx = m.lines.findIndex((l: string) => /speed/i.test(l));
      if (speedLineIdx === -1) {
        // console.log(`Skipping ${m.name}: No Speed line found.`);
        continue;
      }

      let endIdx = m.lines.length;
      for (let idx = speedLineIdx + 1; idx < m.lines.length; idx++) {
        const l = m.lines[idx].trim();
        if (
          /^(Skills|Senses|Languages|CR|Resistances|Immunities|Vulnerabilities|Condition|Gear|ACTIONS|REACTIONS|BONUS|LEGENDARY|TRAITS)/i.test(
            l,
          )
        ) {
          endIdx = idx;
          break;
        }
      }

      // 1. Basic properties
      const id = slugify(m.name);
      const name = titleCase(m.name);

      const sizeMatch = m.sizeTypeLine.match(/(Tiny|Small|Medium|Large|Huge|Gargantuan)/i);
      const size = sizeMatch ? titleCase(sizeMatch[1]) : "Medium";

      const typeMatch = m.sizeTypeLine.match(
        /(Aberration|Beast|Celestial|Construct|Dragon|Elemental|Fey|Fiend|Giant|Humanoid|Monstrosity|Ooze|Plant|Undead)/i,
      );
      const type = typeMatch ? titleCase(typeMatch[1]) : "Humanoid";

      const parts = m.sizeTypeLine.split(",");
      const alignment = parts[1] ? cleanAlignment(parts[1]) : "Neutral";

      // 2. AC, HP, Speed
      const ac = (() => {
        for (const line of m.lines) {
          const match = line.match(/AC\s*(\d+)(?:\s*\(([^)]+)\))?/i);
          if (match) {
            return {
              base: parseInt(match[1]),
              source: match[2] ? match[2].trim() : "",
            };
          }
        }
        return { base: 10, source: "" };
      })();

      const hp = (() => {
        for (const line of m.lines) {
          const match = line.match(/HP\s*(\d+)(?:\s*\(([^)]+)\))?/i);
          if (match) {
            let formula = match[2] ? match[2].trim() : "";
            formula = formula.replace(/l/g, "1").replace(/I/g, "1").replace(/o/g, "0");
            return {
              average: parseInt(match[1]),
              formula: formula,
            };
          }
        }
        return { average: 10, formula: "3d6" };
      })();

      const speed = (() => {
        const speedObj: Record<string, number> = {};
        for (const line of m.lines) {
          const match = line.match(/speed\s*([^.]+)/i);
          if (match) {
            const parts = match[1].split(/[,;]/);
            for (const part of parts) {
              const clean = part.trim().toLowerCase();
              const numMatch = clean.match(/(\d+)/);
              if (!numMatch) continue;
              const speedVal = parseInt(numMatch[1]);
              if (clean.includes("fly")) {
                speedObj.fly = speedVal;
              } else if (clean.includes("swim")) {
                speedObj.swim = speedVal;
              } else if (clean.includes("climb")) {
                speedObj.climb = speedVal;
              } else if (clean.includes("burrow")) {
                speedObj.burrow = speedVal;
              } else {
                speedObj.walk = speedVal;
              }
            }
          }
        }
        if (Object.keys(speedObj).length === 0) {
          speedObj.walk = 30;
        }
        return speedObj;
      })();

      // 3. Stats, Saves, Skills
      let statsBlockText = m.lines.slice(speedLineIdx + 1, endIdx).join("\n");
      statsBlockText = statsBlockText
        .replace(/['`]/g, "")
        .replace(/s\s*t\s*r/gi, "STR")
        .replace(/d\s*e\s*x/gi, "DEX")
        .replace(/c\s*o\s*n/gi, "CON")
        .replace(/i\s*n\s*t/gi, "INT")
        .replace(/w\s*i\s*s/gi, "WIS")
        .replace(/w\s*,\s*s/gi, "WIS")
        .replace(/w\s*\.\s*s/gi, "WIS")
        .replace(/w\s*[t,.]\s*s/gi, "WIS")
        .replace(/w\s*t\s*s/gi, "WIS")
        .replace(/c\s*h\s*a/gi, "CHA")
        .replace(/(STR|DEX|CON|INT|WIS|CHA)([0-9lI]+)/gi, "$1 $2");

      const stats: Record<string, number> = {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
      };
      const statRegex = /\b(STR|DEX|CON|INT|WIS|CHA)\b\s*([0-9lI]+)\s*([+-]\s*[0-9a-zA-Z+-]+)?/gi;

      let match;
      let hasAllStats = true;
      const parsedStatNames = new Set<string>();
      while ((match = statRegex.exec(statsBlockText)) !== null) {
        const name = match[1].toLowerCase();
        const valStr = match[2].replace(/l/g, "1").replace(/I/g, "1");
        const rawVal = parseInt(valStr);
        const rawModStr = match[3];
        stats[name] = cleanStatValue(name, rawVal, rawModStr);
        parsedStatNames.add(name);
      }

      // Check if we parsed all 6 stats
      for (const k of ["str", "dex", "con", "int", "wis", "cha"]) {
        if (!parsedStatNames.has(k)) {
          hasAllStats = false;
        }
      }

      if (!hasAllStats) {
        // console.log(`Skipping ${m.name}: Missing ability scores.`);
        continue;
      }

      const saves = (() => {
        const savesObj: Record<string, number> = {};
        const saveRegex =
          /\b(STR|DEX|CON|INT|WIS|CHA)\b\s*[0-9lI]+\s*[+-]\s*[0-9a-zA-Z+-]+\s*([+-]\s*[0-9a-zA-Z+-]+)/gi;
        let sMatch;
        let hasSaves = false;
        while ((sMatch = saveRegex.exec(statsBlockText)) !== null) {
          const name = sMatch[1].toLowerCase();
          const saveStr = sMatch[2].trim().replace(/\s+/g, "");
          const isNegative = saveStr.startsWith("-");
          const numPart = saveStr.substring(1).replace(/[Oo]/g, "0").replace(/[lIi]/g, "1");
          const saveVal = parseInt(numPart) * (isNegative ? -1 : 1);
          if (!isNaN(saveVal)) {
            savesObj[name] = saveVal;
            hasSaves = true;
          }
        }
        return hasSaves ? savesObj : null;
      })();

      const skills = (() => {
        for (const line of m.lines) {
          const skMatch = line.match(/^Skills\s+(.+)/i);
          if (skMatch) {
            const skillsObj: Record<string, number> = {};
            const parts = skMatch[1].split(",");
            for (const part of parts) {
              const clean = part.trim();
              const skillMatch = clean.match(/^([a-zA-Z\s]+)(?:[+-]?\s*([0-9sS]+))/i);
              if (skillMatch) {
                const skillName = skillMatch[1].trim().toLowerCase();
                let valStr = skillMatch[2] ? skillMatch[2].trim() : "0";
                valStr = valStr.replace(/[sS]/g, "5");
                skillsObj[skillName] = parseInt(valStr) || 0;
              }
            }
            return Object.keys(skillsObj).length > 0 ? skillsObj : null;
          }
        }
        return null;
      })();

      // 4. Resistances, Immunities, Vulnerabilities, Senses, Languages
      let resistances: string[] | null = null;
      let vulnerabilities: string[] | null = null;
      let immunities: string[] | null = null;
      let conditionImmunities: string[] | null = null;

      const conditions = [
        "blinded",
        "charmed",
        "deafened",
        "exhaustion",
        "frightened",
        "grappled",
        "incapacitated",
        "invisible",
        "paralyzed",
        "petrified",
        "poisoned",
        "prone",
        "restrained",
        "stunned",
        "unconscious",
      ];

      for (const line of m.lines) {
        const resMatch = line.match(/^Resistances\s+(.+)/i);
        if (resMatch) {
          resistances = resMatch[1]
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        const vulMatch = line.match(/^Vulnerabilities\s+(.+)/i);
        if (vulMatch) {
          vulnerabilities = vulMatch[1]
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        const immMatch = line.match(/^Immunities\s+(.+)/i);
        if (immMatch) {
          const parts = immMatch[1]
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);
          const immList: string[] = [];
          const condList: string[] = [];
          for (const part of parts) {
            const lower = part.toLowerCase();
            if (conditions.some((c) => lower.includes(c))) {
              condList.push(part);
            } else {
              immList.push(part);
            }
          }
          if (immList.length > 0) immunities = immList;
          if (condList.length > 0) conditionImmunities = condList;
        }
      }

      const senses = (() => {
        const sensesObj: Record<string, number> = { passivePerception: 10 };
        for (const line of m.lines) {
          const sMatch = line.match(/Senses\s+(.+)/i);
          if (sMatch) {
            const parts = sMatch[1].split(/[,;]/);
            for (const part of parts) {
              const clean = part.trim().toLowerCase();
              const numMatch = clean.match(/(\d+)/);
              if (!numMatch) continue;
              const val = parseInt(numMatch[1]);
              if (clean.includes("passive perception")) {
                sensesObj.passivePerception = val;
              } else if (clean.includes("darkvision")) {
                sensesObj.darkvision = val;
              } else if (clean.includes("blindsight")) {
                sensesObj.blindsight = val;
              } else if (clean.includes("tremorsense")) {
                sensesObj.tremorsense = val;
              } else if (clean.includes("truesight")) {
                sensesObj.truesight = val;
              }
            }
          }
        }
        return sensesObj;
      })();

      const languages = (() => {
        for (const line of m.lines) {
          const lMatch = line.match(/Languages\s+(.+)/i);
          if (lMatch) {
            return lMatch[1]
              .split(/[,;]/)
              .map((s) => s.trim())
              .filter(Boolean);
          }
        }
        return ["None"];
      })();

      // 5. CR and PB
      const { challengeRating, proficiencyBonus } = parseCRAndPB(m.lines);

      // 6. Section Parsing (Traits, Actions, Reactions, etc.)
      const sectionLines: Record<string, string[]> = {
        traits: [],
        actions: [],
        bonusActions: [],
        reactions: [],
        legendaryActions: [],
        mythicActions: [],
        lairActions: [],
      };

      let currentSec: string | null = null;
      for (const line of m.lines) {
        const trimmed = line.trim();
        if (/^TRAITS$/i.test(trimmed)) {
          currentSec = "traits";
        } else if (/^ACTIONS$/i.test(trimmed)) {
          currentSec = "actions";
        } else if (/^BONUS\s*ACTIONS$/i.test(trimmed)) {
          currentSec = "bonusActions";
        } else if (/^REACTIONS$/i.test(trimmed)) {
          currentSec = "reactions";
        } else if (/^LEGENDARY\s*ACTIONS$/i.test(trimmed)) {
          currentSec = "legendaryActions";
        } else if (/^MYTHIC\s*ACTIONS$/i.test(trimmed)) {
          currentSec = "mythicActions";
        } else if (/^LAIR\s*ACTIONS$/i.test(trimmed)) {
          currentSec = "lairActions";
        } else if (currentSec && trimmed) {
          // If we hit any other main details line or section header that is not part of this, we can stop
          if (
            /^(Skills|Senses|Languages|CR|Resistances|Immunities|Vulnerabilities|Gear)/i.test(
              trimmed,
            )
          ) {
            currentSec = null;
          } else {
            sectionLines[currentSec].push(line);
          }
        }
      }

      const traits = parseSectionItems(sectionLines.traits);
      const actions = parseSectionItems(sectionLines.actions) || [];
      const bonusActions = parseSectionItems(sectionLines.bonusActions);
      const reactions = parseSectionItems(sectionLines.reactions);
      const legendaryActions = parseSectionItems(sectionLines.legendaryActions);
      const mythicActions = parseSectionItems(sectionLines.mythicActions);
      const lairActions = parseSectionItems(sectionLines.lairActions);

      // 7. Inject into SQLite
      await db
        .insert(schema.monsters)
        .values({
          id,
          name,
          size,
          type,
          alignment,
          acJson: JSON.stringify(ac),
          hpJson: JSON.stringify(hp),
          speedJson: JSON.stringify(speed),
          statsJson: JSON.stringify(stats),
          savesJson: saves ? JSON.stringify(saves) : null,
          skillsJson: skills ? JSON.stringify(skills) : null,
          resistancesJson: resistances ? JSON.stringify(resistances) : null,
          immunitiesJson: immunities ? JSON.stringify(immunities) : null,
          vulnerabilitiesJson: vulnerabilities ? JSON.stringify(vulnerabilities) : null,
          conditionImmunitiesJson: conditionImmunities ? JSON.stringify(conditionImmunities) : null,
          sensesJson: JSON.stringify(senses),
          languagesJson: JSON.stringify(languages),
          challengeRating,
          proficiencyBonus,
          traitsJson: traits ? JSON.stringify(traits) : null,
          actionsJson: JSON.stringify(actions),
          bonusActionsJson: bonusActions ? JSON.stringify(bonusActions) : null,
          reactionsJson: reactions ? JSON.stringify(reactions) : null,
          legendaryActionsJson: legendaryActions ? JSON.stringify(legendaryActions) : null,
          mythicActionsJson: mythicActions ? JSON.stringify(mythicActions) : null,
          lairActionsJson: lairActions ? JSON.stringify(lairActions) : null,
        })
        .onConflictDoUpdate({
          target: schema.monsters.id,
          set: {
            name,
            size,
            type,
            alignment,
            acJson: JSON.stringify(ac),
            hpJson: JSON.stringify(hp),
            speedJson: JSON.stringify(speed),
            statsJson: JSON.stringify(stats),
            savesJson: saves ? JSON.stringify(saves) : null,
            skillsJson: skills ? JSON.stringify(skills) : null,
            resistancesJson: resistances ? JSON.stringify(resistances) : null,
            immunitiesJson: immunities ? JSON.stringify(immunities) : null,
            vulnerabilitiesJson: vulnerabilities ? JSON.stringify(vulnerabilities) : null,
            conditionImmunitiesJson: conditionImmunities
              ? JSON.stringify(conditionImmunities)
              : null,
            sensesJson: JSON.stringify(senses),
            languagesJson: JSON.stringify(languages),
            challengeRating,
            proficiencyBonus,
            traitsJson: traits ? JSON.stringify(traits) : null,
            actionsJson: JSON.stringify(actions),
            bonusActionsJson: bonusActions ? JSON.stringify(bonusActions) : null,
            reactionsJson: reactions ? JSON.stringify(reactions) : null,
            legendaryActionsJson: legendaryActions ? JSON.stringify(legendaryActions) : null,
            mythicActionsJson: mythicActions ? JSON.stringify(mythicActions) : null,
            lairActionsJson: lairActions ? JSON.stringify(lairActions) : null,
          },
        });

      insertedCount++;
    } catch (err) {
      console.error(`Failed to insert monster ${m.name}:`, err);
    }
  }

  console.log(`Successfully parsed and injected ${insertedCount} monsters into the database.`);

  // Verify row count
  const countRes = sqlite.prepare("SELECT count(*) as count FROM monsters").get() as {
    count: number;
  };
  console.log(`Verification: Table 'monsters' has ${countRes.count} rows.`);
}

main().catch(console.error);
