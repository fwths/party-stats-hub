import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite, { schema });

function cleanName(name: string): string {
  let clean = name.trim();

  // Replace smart quotes and dashes
  clean = clean.replace(/[‘’‘]/g, "'").replace(/[“”]/g, '"');
  clean = clean.replace(/[———]/g, "-");

  // Custom manual replacements for known OCR typos
  const replacements: Record<string, string> = {
    "AEMOR 0E GLEAMING": "Armor of Gleaming",
    "BEAD or NOURISHMENT": "Bead of Nourishment",
    "BEAD OF REERESHMENT": "Bead of Refreshment",
    "BOOTS or FALSE TRACKS": "Boots of False Tracks",
    "CAST— OFF ARMOR": "Cast-Off Armor",
    "CLOAK or MANY FASHIONS": "Cloak of Many Fashions",
    "INSTRUMENT OF SGRIBING": "Instrument of Scribing",
    "MOON—TOUCHED SWORD": "Moon-Touched Sword",
    "ORB OF TiME": "Orb of Time",
    "SHIELD or EXPRESSION": "Shield of Expression",
    "STAFF or BIRDCALLS": "Staff of Birdcalls",
    "UNBREAKABLE ARROW": "Unbreakable Arrow",
    "WALLOPING AMM UNITION": "Walloping Ammunition",
    "WAND or CONDUCTING": "Wand of Conducting",
    "WAND or SCOWLS": "Wand of Scowls",
    "WAND or SMILES": "Wand of Smiles",
    "Bag ottricks": "Bag of Tricks",
    "Boots ofelvenkind": "Boots of Elvenkind",
    "Boots of striding and": "Boots of Striding and Springing",
    "Boots ofthe winterlands": "Boots of the Winterlands",
    "Bracers ofarchery": "Bracers of Archery",
    "Brooch otshielding": "Brooch of Shielding",
    "Broom offlying": "Broom of Flying",
    "Circlet of blasting": "Circlet of Blasting",
    "Cloak ofelvenkind": "Cloak of Elvenkind",
    "Cloak of protection": "Cloak of Protection",
    "Deck otillusions": "Deck of Illusions",
    "Eversmoking bottle": "Eversmoking Bottle",
    "Eyes ofcharming": "Eyes of Charming",
    "Eyes otthe eagle": "Eyes of the Eagle",
    "Gauntlets ofogre power": "Gauntlets of Ogre Power",
    "Gem of brightness": "Gem of Brightness",
    "Gloves of missile snaring": "Gloves of Missile Snaring",
    "Gloves of swimming and": "Gloves of Swimming and Climbing",
    "Gloves otthievery": "Gloves of Thievery",
    "Hat ofdisguise": "Hat of Disguise",
    "Headband otintellect": "Headband of Intellect",
    "Helm ottelepathy": "Helm of Telepathy",
    "Instrument otthe bards": "Instrument of the Bards",
    "Javelin oflightning": "Javelin of Lightning",
    "Medallion ofthoughts": "Medallion of Thoughts",
    "Necklace of adaptation": "Necklace of Adaptation",
    "Pearl of power": "Pearl of Power",
    "Periapt ofwound closure": "Periapt of Wound Closure",
    "Pipes of haunting": "Pipes of Haunting",
    "Pipes ofthe sewers": "Pipes of the Sewers",
    "Quiver of Ehlonna": "Quiver of Ehlonna",
    "Ring ofjumping": "Ring of Jumping",
    "Ring ofmind shielding": "Ring of Mind Shielding",
    "Ring otwarmth": "Ring of Warmth",
    "Ring otwater walking": "Ring of Water Walking",
    "Rod ofthe pact keeper": "Rod of the Pact Keeper",
    "Sentinel shield": "Sentinel Shield",
    "Shield, +1": "Shield, +1",
    "Slippers ofspider climbing": "Slippers of Spider Climbing",
    "Stai'lr otthe adder": "Staff of the Adder",
    "Staff otthe python": "Staff of the Python",
    "Stone ofgood luck (luck-": "Stone of Good Luck (Luckstone)",
    "Sword ofvengeance": "Sword of Vengeance",
    "Trident ofﬁsh command": "Trident of Fish Command",
    "Wand ofmagic missiles": "Wand of Magic Missiles",
    "Wand ofthe war mage": "Wand of the War Mage",
    "Wand ofweb": "Wand of Web",
    "Weapon ofwarning": "Weapon of Warning",
    "Weapon, +1": "Weapon, +1",
    "Wind fan": "Wind Fan",
    "Winged boots": "Winged Boots",
  };

  if (replacements[clean]) {
    return replacements[clean];
  }

  if (replacements[clean.toLowerCase()]) {
    return replacements[clean.toLowerCase()];
  }

  // General replacement of common OCR issues
  clean = clean
    .replace(/\b0E\b/gi, "of")
    .replace(/\bOF\b/gi, "of")
    .replace(/\bOR\b/gi, "of")
    .replace(/\bot\b/gi, "of")
    .replace(/\bof\s*the\b/gi, "of the")
    .replace(/\bthe\s*deep\b/gi, "the Deep")
    .replace(/\boﬂ\b/gi, "off")
    .replace(/\bﬁsh\b/gi, "fish")
    .replace(/\bﬁre\b/gi, "fire")
    .replace(/\bﬂowers\b/gi, "flowers")
    .replace(/\bﬂying\b/gi, "flying")
    .replace(/\bdeafened\b/gi, "Deafened")
    .replace(/\bcharmed\b/gi, "Charmed")
    .replace(/\bincapacitated\b/gi, "Incapacitated")
    .replace(/\bwariock\b/gi, "warlock")
    .replace(/\bspeilcaster\b/gi, "spellcaster");

  // Title case helper
  const titleCase = (str: string) => {
    return str
      .split(" ")
      .map((word, index) => {
        const lowercaseWords = [
          "of",
          "the",
          "in",
          "and",
          "or",
          "a",
          "an",
          "against",
          "by",
          "with",
          "to",
          "for",
          "at",
        ];
        const cleanWord = word.toLowerCase();
        if (lowercaseWords.includes(cleanWord) && index !== 0) {
          return cleanWord;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  };

  return titleCase(clean);
}

function getAttunementInfo(
  name: string,
  type: string,
): { requiresAttunement: boolean; attunementConditions: string | null } {
  const nameLower = name.toLowerCase();

  // Default for rings, staffs, wands, rods
  if (["ring", "staff", "wand", "rod"].includes(type.toLowerCase())) {
    let conditions: string | null = null;
    if (nameLower.includes("pact keeper")) {
      conditions = "warlock";
    } else if (
      nameLower.includes("wizardry") ||
      nameLower.includes("magi") ||
      nameLower.includes("wizard") ||
      nameLower.includes("stilled tongue")
    ) {
      conditions = "wizard";
    } else if (
      nameLower.includes("woodlands") ||
      nameLower.includes("python") ||
      nameLower.includes("adder")
    ) {
      conditions = "druid";
    } else if (nameLower.includes("cleric") || nameLower.includes("healing")) {
      conditions = "cleric";
    } else if (
      nameLower.includes("charming") ||
      nameLower.includes("fear") ||
      nameLower.includes("fire") ||
      nameLower.includes("frost") ||
      nameLower.includes("power") ||
      nameLower.includes("striking") ||
      nameLower.includes("swarming") ||
      nameLower.includes("thunder and lightning") ||
      nameLower.includes("withering") ||
      nameLower.includes("polymorph") ||
      nameLower.includes("war mage") ||
      nameLower.includes("web") ||
      nameLower.includes("wonder")
    ) {
      conditions = "spellcaster";
    }
    return { requiresAttunement: true, attunementConditions: conditions };
  }

  // Specific attunements
  if (
    nameLower.includes("amulet of health") ||
    nameLower.includes("amulet of proof") ||
    nameLower.includes("amulet of the planes") ||
    nameLower.includes("animated shield") ||
    nameLower.includes("belt of") ||
    nameLower.includes("bracers of") ||
    nameLower.includes("brooch of") ||
    nameLower.includes("cloak of arachnida") ||
    nameLower.includes("cloak of displacement") ||
    nameLower.includes("cloak of elvenkind") ||
    nameLower.includes("cloak of invisibility") ||
    nameLower.includes("cloak of protection") ||
    nameLower.includes("cloak of the bat") ||
    nameLower.includes("gauntlets of ogre power") ||
    nameLower.includes("headband of intellect") ||
    nameLower.includes("helm of brilliance") ||
    nameLower.includes("helm of telepathy") ||
    nameLower.includes("helm of teleportation") ||
    nameLower.includes("ioun stone") ||
    nameLower.includes("medallion of thoughts") ||
    nameLower.includes("slippers of spider climbing") ||
    nameLower.includes("winged boots") ||
    nameLower.includes("wings of flying") ||
    nameLower.includes("sun blade") ||
    nameLower.includes("life stealing") ||
    nameLower.includes("sharpness") ||
    nameLower.includes("vengeance") ||
    nameLower.includes("wounding") ||
    nameLower.includes("holy avenger") ||
    nameLower.includes("dwarven thrower") ||
    nameLower.includes("shield of missile attraction") ||
    nameLower.includes("armor of invulnerability") ||
    nameLower.includes("armor of resistance") ||
    nameLower.includes("armor of vulnerability") ||
    nameLower.includes("demon armor") ||
    nameLower.includes("giant slayer") ||
    nameLower.includes("dragon slayer") ||
    nameLower.includes("nine lives stealer") ||
    nameLower.includes("vorpal sword") ||
    nameLower.includes("sword of answering") ||
    nameLower.includes("berserker axe") ||
    nameLower.includes("defender") ||
    nameLower.includes("luck blade") ||
    nameLower.includes("scimitar of speed") ||
    nameLower.includes("mace of disruption") ||
    nameLower.includes("mace of terror") ||
    nameLower.includes("talisman of pure good") ||
    nameLower.includes("talisman of ultimate evil") ||
    nameLower.includes("tome of the stilled tongue") ||
    nameLower.includes("dark shard amulet") ||
    nameLower.includes("hat of wizardry") ||
    nameLower.includes("ruby of the war mage") ||
    nameLower.includes("charlatan") ||
    nameLower.includes("ersatz eye") ||
    nameLower.includes("instrument of") ||
    nameLower.includes("talking doll")
  ) {
    let conditions: string | null = null;
    if (nameLower.includes("holy avenger")) {
      conditions = "paladin";
    } else if (nameLower.includes("dwarven thrower")) {
      conditions = "dwarf";
    } else if (nameLower.includes("talisman of pure good")) {
      conditions = "good alignment";
    } else if (nameLower.includes("talisman of ultimate evil")) {
      conditions = "evil alignment";
    } else if (
      nameLower.includes("tome of the stilled tongue") ||
      nameLower.includes("hat of wizardry")
    ) {
      conditions = "wizard";
    } else if (nameLower.includes("dark shard amulet")) {
      conditions = "warlock";
    } else if (nameLower.includes("ruby of the war mage")) {
      conditions = "spellcaster";
    } else if (nameLower.includes("instrument of")) {
      conditions = "bard";
    }
    return { requiresAttunement: true, attunementConditions: conditions };
  }

  return { requiresAttunement: false, attunementConditions: null };
}

interface ParsedMagicItem {
  id: string;
  name: string;
  type: string;
  rarity: string;
  requiresAttunement: boolean;
  attunementConditions: string | null;
  description: string;
  weight: number | null;
  chargesJson: string | null;
}

// Famous item descriptions lookup
const famousDescriptions: Record<string, string> = {
  "bag of holding":
    "This bag has an interior space considerably larger than its outside dimensions, roughly 2 feet in diameter at the mouth and 4 feet deep. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. Retrieving an item from the bag requires an action. If the bag is overloaded, pierced, or torn, it ruptures and is destroyed, and its contents are scattered in the Astral Plane.",
  "boots of elvenkind":
    "While you wear these boots, your steps make no sound, regardless of the surface you are moving across. You also have advantage on Dexterity (Stealth) checks that rely on moving silently.",
  "cloak of protection": "While wearing this cloak, you gain a +1 bonus to AC and saving throws.",
  "goggles of night":
    "While wearing these dark lenses, you have darkvision out to a range of 60 feet. If you already have darkvision, wearing the goggles increases its range by 60 feet.",
  "stone of good luck":
    "While this polished agate is on your person, you gain a +1 bonus to ability checks and saving throws.",
  "immovable rod":
    "This flat iron rod has a button on one side. You can use an action to press the button, which causes the rod to become magically fixed in place. Until you or another creature uses an action to press the button again, the rod does not move, even if it is defying gravity. The rod can hold up to 8,000 pounds of weight before it falls.",
  "decanter of endless water":
    "This clean metal flask weighs 2 pounds. You can use an action to remove the stopper and speak a command word (Stream, Fountain, or Geyser) to produce fresh or salt water at varying rates, up to 30 gallons per round.",
  driftglobe:
    "This small stone sphere floats in the air. You can speak a command word to cause it to shed light (equivalent to the Light or Daylight spell). It can float and follow you around.",
  "slippers of spider climbing":
    "While wearing these slippers, you can move up, down, and across vertical surfaces and upside down along ceilings, while leaving your hands free. The slippers give you a climbing speed equal to your walking speed.",
  "winged boots":
    "While you wear these boots, you have a flying speed equal to your walking speed for up to 4 hours of use, all at once or in shorter flights.",
  "gem of brightness":
    "This prism has 50 charges. You can expend charges to shed bright light in a 60-foot cone, blind a creature within 30 feet, or flash a cone of blinding light to blind all creatures in a 15-foot cone.",
  "helm of telepathy":
    "While wearing this helm, you can use an action to cast the Detect Thoughts spell from it. You can also use an action to cast the Suggestion spell from it on a creature you are reading the thoughts of.",
  "ring of protection": "While wearing this ring, you gain a +1 bonus to AC and saving throws.",
  "potion of healing":
    "A character can drink this potion or administer it to another creature as a Bonus Action. Doing so restores 2d4 + 2 Hit Points. Once used, the potion is consumed.",
  "potion of greater healing":
    "A character can drink this potion or administer it to another creature as a Bonus Action. Doing so restores 4d4 + 4 Hit Points. Once used, the potion is consumed.",
  "potion of superior healing":
    "A character can drink this potion or administer it to another creature as a Bonus Action. Doing so restores 8d4 + 8 Hit Points. Once used, the potion is consumed.",
  "potion of supreme healing":
    "A character can drink this potion or administer it to another creature as a Bonus Action. Doing so restores 10d4 + 20 Hit Points. Once used, the potion is consumed.",
  "spell scroll":
    "A scroll contains the written form of a single spell. Reading the scroll casts the spell, bypassing normal spell slot and material component requirements. If the spell is on your class list, you can read it; otherwise, you must succeed on an ability check using your spellcasting modifier. Once read, the scroll crumbles to dust.",
  "portable hole":
    "A portable hole is a circular sheet of black cloth 6 feet in diameter. You can unfold and place it on a solid surface, creating a extradimensional hole 10 feet deep. The hole can be folded up from the outside, trapping anything inside.",
};

async function main() {
  console.log("--- STARTING MAGIC ITEMS EXTRACTION & INJECTION ---");

  const xanatharsPath = path.join(__dirname, "../../raw_books/xanathars.txt");
  const dmgPath = path.join(__dirname, "../../raw_books/dmg_2024.md");

  const allItemsMap = new Map<string, ParsedMagicItem>();

  // 1. Extract Common Items with descriptions from Xanathar's Guide to Everything
  if (fs.existsSync(xanatharsPath)) {
    console.log("Reading xanathars.txt...");
    const content = fs.readFileSync(xanatharsPath, "utf8");
    const startIdx = content.indexOf("COMMON MAGIC ITEMS\r\n");
    const endIdx = content.indexOf("CREATING ADDITIONAL COMMON ITEMS");

    if (startIdx !== -1 && endIdx !== -1) {
      const section = content.substring(startIdx, endIdx);
      const lines = section
        .split("\r\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      let currentItem: { name: string; meta: string; descLines: string[] } | null = null;
      let startParsing = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          line.includes("AEMOR 0E GLEAMING") ||
          line.includes("ARMOR OF GLEAMING") ||
          line.startsWith("AEMOR")
        ) {
          startParsing = true;
        }
        if (!startParsing) continue;

        // Metadata indicator regex
        const nextLine = lines[i + 1] || "";
        const isNextMetadata =
          /^(Wondrous item|Armor|Weapon|Wand|Staff|Ring|Potion|Scroll|Stall|Sraﬂf|Staf|Weapon\s*\(arrow\)|Weapon\s*\(any\s*ammunition\))/i.test(
            nextLine,
          ) &&
          (nextLine.toLowerCase().includes("common") || nextLine.toLowerCase().includes("rarity"));

        if (isNextMetadata) {
          if (currentItem) {
            const cleanItemName = cleanName(currentItem.name);
            const desc = currentItem.descLines
              .join(" ")
              .replace(/[ﬁ]/g, "fi")
              .replace(/[ﬂ]/g, "fl")
              .replace(/[—]/g, "-")
              .replace(/[‘’‘]/g, "'")
              .replace(/[“”]/g, '"')
              .trim();

            const type = currentItem.meta.split("(")[0].trim().split(",")[0].trim();
            const cleanType = cleanName(type);
            const attuneInfo = getAttunementInfo(cleanItemName, cleanType);

            // Extract charges if present in description
            let chargesJson: string | null = null;
            const chargesMatch = desc.match(/has (\d+) charges/i);
            if (chargesMatch) {
              chargesJson = JSON.stringify({ max: parseInt(chargesMatch[1]) });
            }

            const id = cleanItemName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");

            allItemsMap.set(id, {
              id,
              name: cleanItemName,
              type: cleanType,
              rarity: "Common",
              requiresAttunement: attuneInfo.requiresAttunement,
              attunementConditions: attuneInfo.attunementConditions,
              description: desc,
              weight: desc.includes("pound clay pot") ? 10 : desc.includes("15-pound") ? 15 : null,
              chargesJson,
            });
          }
          currentItem = {
            name: line,
            meta: nextLine,
            descLines: [],
          };
          i++; // Skip metadata line
        } else if (currentItem) {
          currentItem.descLines.push(line);
        }
      }

      // Push the last one
      if (currentItem) {
        const cleanItemName = cleanName(currentItem.name);
        const desc = currentItem.descLines
          .join(" ")
          .replace(/[ﬁ]/g, "fi")
          .replace(/[ﬂ]/g, "fl")
          .replace(/[—]/g, "-")
          .replace(/[‘’]/g, "'")
          .replace(/[“”]/g, '"')
          .trim();

        const type = currentItem.meta.split("(")[0].trim().split(",")[0].trim();
        const cleanType = cleanName(type);
        const attuneInfo = getAttunementInfo(cleanItemName, cleanType);

        let chargesJson: string | null = null;
        const chargesMatch = desc.match(/has (\d+) charges/i);
        if (chargesMatch) {
          chargesJson = JSON.stringify({ max: parseInt(chargesMatch[1]) });
        }

        const id = cleanItemName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        allItemsMap.set(id, {
          id,
          name: cleanItemName,
          type: cleanType,
          rarity: "Common",
          requiresAttunement: attuneInfo.requiresAttunement,
          attunementConditions: attuneInfo.attunementConditions,
          description: desc,
          weight: null,
          chargesJson,
        });
      }

      console.log(`Parsed ${allItemsMap.size} common items from xanathars.txt.`);
    } else {
      console.error("Could not find COMMON MAGIC ITEMS section in xanathars.txt");
    }
  } else {
    console.error("xanathars.txt does not exist at:", xanatharsPath);
  }

  // 2. Extract Items from DMG 2024 tables
  if (fs.existsSync(dmgPath)) {
    console.log("Reading dmg_2024.md...");
    const content = fs.readFileSync(dmgPath, "utf8");
    const lines = content.split("\n");

    let currentRarity: string | null = null;
    let tablesParsedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      const headerMatch = line.match(/^#####\s+([^-]+)\s*-\s*([A-Za-z\s]+)/i);
      if (headerMatch) {
        currentRarity = headerMatch[2].trim();
        continue;
      }

      if (line.startsWith("## ")) {
        currentRarity = null;
      }

      if (currentRarity && line.startsWith("|")) {
        const parts = line.split("|").map((p) => p.trim());
        if (parts.length >= 3) {
          const roll = parts[1];
          const itemNameRaw = parts[2];

          if (
            roll &&
            itemNameRaw &&
            roll !== "1d100" &&
            !roll.startsWith(":") &&
            !roll.startsWith("-")
          ) {
            const nameMatch = itemNameRaw.match(/[\*_]([^*_]+)[\*_]/);
            if (nameMatch) {
              const name = nameMatch[1].trim();
              const cleanItemName = cleanName(name);
              const id = cleanItemName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");

              // Normalize rarity
              let finalRarity = cleanName(currentRarity);
              if (finalRarity.toLowerCase() === "veryrare") finalRarity = "Very Rare";

              if (!allItemsMap.has(id)) {
                // Infer type
                let inferredType = "Wondrous Item";
                const lowerName = cleanItemName.toLowerCase();

                if (
                  lowerName.includes("armor") ||
                  lowerName.includes("shield") ||
                  lowerName.includes("chain mail") ||
                  lowerName.includes("plate") ||
                  lowerName.includes("leather") ||
                  lowerName.includes("scale")
                ) {
                  inferredType = "Armor";
                } else if (lowerName.includes("ring")) {
                  inferredType = "Ring";
                } else if (lowerName.includes("wand")) {
                  inferredType = "Wand";
                } else if (lowerName.includes("staff")) {
                  inferredType = "Staff";
                } else if (lowerName.includes("scroll")) {
                  inferredType = "Scroll";
                } else if (
                  lowerName.includes("potion") ||
                  lowerName.includes("oil") ||
                  lowerName.includes("philter") ||
                  lowerName.includes("elixir")
                ) {
                  inferredType = "Potion";
                } else if (lowerName.includes("rod")) {
                  inferredType = "Rod";
                } else if (
                  lowerName.includes("sword") ||
                  lowerName.includes("weapon") ||
                  lowerName.includes("axe") ||
                  lowerName.includes("bow") ||
                  lowerName.includes("arrow") ||
                  lowerName.includes("ammunition") ||
                  lowerName.includes("dagger") ||
                  lowerName.includes("spear") ||
                  lowerName.includes("talon") ||
                  lowerName.includes("javelin") ||
                  lowerName.includes("mace") ||
                  lowerName.includes("trident") ||
                  lowerName.includes("hammer") ||
                  lowerName.includes("scimitar") ||
                  lowerName.includes("blade") ||
                  lowerName.includes("club") ||
                  lowerName.includes("greatclub") ||
                  lowerName.includes("halberd") ||
                  lowerName.includes("quarterstaff") ||
                  lowerName.includes("sickle") ||
                  lowerName.includes("glaive") ||
                  lowerName.includes("lance") ||
                  lowerName.includes("whip") ||
                  lowerName.includes("crossbow") ||
                  lowerName.includes("sling")
                ) {
                  inferredType = "Weapon";
                }

                const attuneInfo = getAttunementInfo(cleanItemName, inferredType);

                // Construct detailed description
                let desc =
                  famousDescriptions[id] ||
                  famousDescriptions[id.replace(/-/g, " ")] ||
                  famousDescriptions[cleanItemName.toLowerCase()];
                if (!desc) {
                  if (inferredType === "Potion") {
                    desc = `A magical potion of rarity ${finalRarity}. Imbibing this potion or applying it requires a Bonus Action, conferring its magical effects. Once consumed, the potion loses its magic.`;
                  } else if (inferredType === "Scroll") {
                    desc = `A magical scroll of rarity ${finalRarity} containing the written form of a spell. Activating the scroll requires reading the spell, casting it at its lowest level without expending spell slots or material components. Once read, the scroll crumbles to dust.`;
                  } else if (inferredType === "Ring") {
                    desc = `A magical ring of rarity ${finalRarity}. ${attuneInfo.requiresAttunement ? "Requires attunement. " : ""}This ring must be worn on a finger or similar digit to grant its magical effects.`;
                  } else if (inferredType === "Wand") {
                    desc = `A magical wand of rarity ${finalRarity}. ${attuneInfo.requiresAttunement ? "Requires attunement. " : ""}This wand can be used as an Arcane Focus and contains charges that can be expended to cast spells or activate properties. It regains charges daily at dawn.`;
                  } else if (inferredType === "Staff") {
                    desc = `A magical staff of rarity ${finalRarity}. ${attuneInfo.requiresAttunement ? "Requires attunement. " : ""}This staff can be used as a Quarterstaff and an Arcane Focus, and it contains charges to cast spells or activate properties. It regains charges daily at dawn.`;
                  } else if (inferredType === "Rod") {
                    desc = `A magical rod of rarity ${finalRarity}. ${attuneInfo.requiresAttunement ? "Requires attunement. " : ""}This scepter can be used as an Arcane Focus, granting powerful benefits to spellcasting or command.`;
                  } else if (inferredType === "Weapon") {
                    desc = `A magic weapon of rarity ${finalRarity}. ${attuneInfo.requiresAttunement ? "Requires attunement. " : ""}Attacks made with this weapon are considered magical for the purpose of overcoming damage resistance and immunity.`;
                  } else if (inferredType === "Armor") {
                    desc = `A magical suit of armor of rarity ${finalRarity}. ${attuneInfo.requiresAttunement ? "Requires attunement. " : ""}While wearing this armor, you gain protective benefits and special magical defenses.`;
                  } else {
                    desc = `A wondrous item of rarity ${finalRarity}. ${attuneInfo.requiresAttunement ? "Requires attunement. " : ""}This item possesses unique magical properties, granting utility, combat enhancements, or special features to its bearer.`;
                  }
                }

                // Add some default weights for types
                let weight: number | null = null;
                if (inferredType === "Weapon") weight = 3;
                else if (inferredType === "Armor") weight = 20;
                else if (inferredType === "Rod") weight = 3;
                else if (inferredType === "Staff") weight = 4;
                else if (inferredType === "Wand") weight = 1;

                allItemsMap.set(id, {
                  id,
                  name: cleanItemName,
                  type: inferredType,
                  rarity: finalRarity,
                  requiresAttunement: attuneInfo.requiresAttunement,
                  attunementConditions: attuneInfo.attunementConditions,
                  description: desc,
                  weight,
                  chargesJson: null,
                });
                tablesParsedCount++;
              }
            }
          }
        }
      }
    }
    console.log(`Parsed ${tablesParsedCount} unique items from dmg_2024.md random tables.`);
  } else {
    console.error("dmg_2024.md does not exist at:", dmgPath);
  }

  // 3. Inject Magic Items into Database
  console.log(`Injecting ${allItemsMap.size} magic items into SQLite rules database...`);

  // Clear existing items to ensure clean seeding with updated descriptions
  await db.delete(schema.magicItems);

  let insertedCount = 0;
  for (const item of allItemsMap.values()) {
    try {
      await db
        .insert(schema.magicItems)
        .values({
          id: item.id,
          name: item.name,
          type: item.type,
          rarity: item.rarity,
          requiresAttunement: item.requiresAttunement,
          attunementConditions: item.attunementConditions,
          description: item.description,
          weight: item.weight,
          chargesJson: item.chargesJson,
        })
        .onConflictDoNothing();
      insertedCount++;
    } catch (err) {
      console.error(`Error inserting magic item ${item.name} (${item.id}):`, err);
    }
  }

  console.log(`✅ Finished injection! Successfully processed ${insertedCount} items.`);

  // Query final counts
  const finalCount = db.select().from(schema.magicItems).all();
  console.log(`Verification: magic_items table now contains ${finalCount.length} rows.`);

  sqlite.close();
}

main().catch(console.error);
