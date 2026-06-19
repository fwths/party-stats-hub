import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  User,
  Swords,
  Dices,
  Save,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Wand2,
} from "lucide-react";
import {
  getBackgroundsFromDb,
  getClassFeaturesFromDb,
  getClassSpellsFromDb,
  getClassesFromDb,
  getFeatsFromDb,
  getSpeciesFromDb,
  getSpellsFromDb,
  getSubclassesFromDb,
} from "@/lib/db-functions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/builder")({
  loader: async () => {
    const classes = await getClassesFromDb();
    const species = await getSpeciesFromDb();
    const subclasses = await getSubclassesFromDb();
    const backgrounds = await getBackgroundsFromDb();
    const feats = await getFeatsFromDb();
    const spells = await getSpellsFromDb();
    const classSpells = await getClassSpellsFromDb();
    const classFeatures = await getClassFeaturesFromDb();
    return { classes, species, subclasses, backgrounds, feats, spells, classSpells, classFeatures };
  },
  component: BuilderWizard,
});

type BuilderState = {
  name: string;
  raceId: string | null;
  backgroundId: string | null;
  classId: string | null;
  subclassId: string | null;
  level: number;
  abilities: Record<string, number>;
  abilityBonuses: Record<string, number>;
  speciesTraitChoices: Record<string, string>;
  speciesSkillChoices: string[];
  speciesToolChoices: string[];
  backgroundToolChoices: string[];
  backgroundEquipmentOption: string | null;
  featChoices: {
    spellList?: string;
    spellcastingAbility?: string;
    cantrips: string[];
    spells: string[];
    skills: string[];
    tools: string[];
  };
  classSkillChoices: string[];
  classToolChoices: string[];
  classEquipmentOption: string | null;
  featureChoices: Record<string, string[]>;
  cantripChoices: string[];
  preparedSpellChoices: string[];
};

function BuilderWizard() {
  const navigate = useNavigate();
  const { backgrounds, classes, feats, species, spells, subclasses, classFeatures } =
    Route.useLoaderData();
  const [step, setStep] = useState(1);
  const [character, setCharacter] = useState<BuilderState>({
    name: "Unnamed Hero",
    raceId: null,
    backgroundId: null,
    classId: null,
    subclassId: null,
    level: 1,
    abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    abilityBonuses: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
    speciesTraitChoices: {},
    speciesSkillChoices: [],
    speciesToolChoices: [],
    backgroundToolChoices: [],
    backgroundEquipmentOption: null,
    featChoices: { cantrips: [], spells: [], skills: [], tools: [] },
    classSkillChoices: [],
    classToolChoices: [],
    classEquipmentOption: null,
    featureChoices: {},
    cantripChoices: [],
    preparedSpellChoices: [],
  });

  const updateCharacter = (updates: Partial<BuilderState>) => {
    setCharacter((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => setStep((s) => Math.min(6, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));
  const validationIssues = getBuilderValidationIssues(character, {
    backgrounds,
    classes,
    feats,
    species,
    subclasses,
    classFeatures,
  });

  const saveCharacter = async () => {
    try {
      if (validationIssues.length > 0) {
        alert(`Finish these choices before saving:\n\n${validationIssues.join("\n")}`);
        return;
      }

      const { createNativePartyMember, saveNativeCharacter } = await import("@/lib/native-engine");
      const { STORAGE_KEY, COOKIE_KEY } = await import("@/lib/party");

      const raceData = species.find((r) => r.id === character.raceId);
      const backgroundData = backgrounds.find((b) => b.id === character.backgroundId);
      const classData = classes.find((c) => c.id === character.classId);
      const subclassData = subclasses.find((s) => s.id === character.subclassId);
      const originFeat = backgroundData?.originFeatId
        ? feats.find((feat) => feat.id === backgroundData.originFeatId)
        : null;
      const selectedSpells = spells.filter(
        (spell) =>
          character.cantripChoices.includes(spell.id) ||
          character.preparedSpellChoices.includes(spell.id) ||
          character.featChoices.cantrips.includes(spell.id) ||
          character.featChoices.spells.includes(spell.id),
      );

      const newMember = createNativePartyMember(
        character,
        raceData,
        classData,
        backgroundData,
        subclassData,
        originFeat,
        selectedSpells,
        classFeatures,
      );
      const newId = await saveNativeCharacter({ data: { character: newMember } });

      // Add to local storage
      const raw = localStorage.getItem(STORAGE_KEY);
      let ids: number[] = [];
      if (raw) {
        ids = JSON.parse(raw);
      }
      ids.push(newId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      document.cookie = `${COOKIE_KEY}=${ids.join(",")}; max-age=31536000; path=/`;

      alert("Character built natively and added to party!");
      navigate({ to: "/" });
    } catch (e) {
      console.error(e);
      alert("Failed to save character");
    }
  };

  const isStepValid = () => {
    if (step === 1) {
      const race = species.find((r) => r.id === character.raceId);
      return (
        character.name.trim() !== "" &&
        character.raceId !== null &&
        areTraitGroupsComplete(getSpeciesTraitGroups(race), character.speciesTraitChoices) &&
        areChoiceGroupsComplete(
          getProficiencyChoiceGroups(
            getJsonField(race, "proficienciesJson", "proficiencies_json"),
            "skills",
            SKILL_OPTIONS,
          ),
          character.speciesSkillChoices,
        ) &&
        areChoiceGroupsComplete(
          getProficiencyChoiceGroups(
            getJsonField(race, "proficienciesJson", "proficiencies_json"),
            "tools",
            TOOL_OPTIONS,
          ),
          character.speciesToolChoices,
        )
      );
    }
    if (step === 2) {
      const background = backgrounds.find((b) => b.id === character.backgroundId);
      const originFeat = background?.originFeatId
        ? feats.find((feat) => feat.id === background.originFeatId)
        : null;
      return (
        character.backgroundId !== null &&
        isValidAbilityBonusSet(character) &&
        areChoiceGroupsComplete(
          getToolChoiceGroups(
            getJsonField(background, "toolProficienciesJson", "tool_proficiencies_json"),
          ),
          character.backgroundToolChoices,
        ) &&
        getEquipmentOptions(
          getJsonField(background, "startingEquipmentJson", "starting_equipment_json"),
        ).some((option) => option.id === character.backgroundEquipmentOption) &&
        areOriginFeatChoicesComplete(originFeat, character)
      );
    }
    if (step === 3) {
      if (!character.classId) return false;
      const selectedClass = classes.find((c) => c.id === character.classId);
      const classProficiencies = parseJsonValue(selectedClass?.proficienciesJson, {});
      const classSubclasses = subclasses.filter((s) => s.classId === character.classId);
      const subclassLevel = getSubclassChoiceLevel(classSubclasses);
      const unlockedFeatureOptions = getUnlockedFeatureOptionGroups(character, classFeatures);
      return (
        areChoiceGroupsComplete(
          getProficiencyChoiceGroups(classProficiencies, "skills", SKILL_OPTIONS),
          character.classSkillChoices,
        ) &&
        areChoiceGroupsComplete(
          getToolChoiceGroups(classProficiencies?.starting?.toolProficiencies),
          character.classToolChoices,
        ) &&
        getEquipmentOptions(selectedClass?.startingEquipmentJson).some(
          (option) => option.id === character.classEquipmentOption,
        ) &&
        areFeatureChoicesComplete(unlockedFeatureOptions, character.featureChoices) &&
        (classSubclasses.length === 0 ||
          character.level < subclassLevel ||
          character.subclassId !== null)
      );
    }
    if (step === 4) return Object.values(character.abilities).every((val: number) => val > 0);
    if (step === 5) return isSpellStepValid(character, classes);
    return true;
  };

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen animate-in fade-in duration-700">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background -z-10" />

      <div className="flex items-center gap-4 mb-10 relative">
        <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-[50px] rounded-full -z-10" />
        <Link to="/">
          <Button
            variant="outline"
            size="sm"
            className="backdrop-blur-sm bg-background/50 border-border/50 hover:bg-primary/20 hover:border-primary/50 transition-all"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 bg-gradient-to-r from-primary via-purple-400 to-blue-500 bg-clip-text text-transparent">
          Character Forge
        </h1>
      </div>

      <div className="flex gap-4 mb-10 max-w-3xl mx-auto">
        {[
          { id: 1, label: "Heritage", icon: User },
          { id: 2, label: "Background", icon: BookOpen },
          { id: 3, label: "Path", icon: Swords },
          { id: 4, label: "Attributes", icon: Dices },
          { id: 5, label: "Spells", icon: Wand2 },
          { id: 6, label: "Review", icon: Save },
        ].map((s) => (
          <div
            key={s.id}
            className={`flex-1 flex flex-col items-center p-3 rounded-xl transition-all duration-500 relative overflow-hidden ${
              step === s.id
                ? "bg-primary/15 shadow-[0_0_20px_rgba(var(--primary),0.2)] text-primary scale-105"
                : step > s.id
                  ? "bg-secondary/30 text-foreground/80 cursor-pointer hover:bg-secondary/50"
                  : "opacity-40 grayscale"
            }`}
            onClick={() => step > s.id && setStep(s.id)}
          >
            {step === s.id && (
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
            )}
            <s.icon
              className={`h-7 w-7 mb-2 transition-transform duration-300 ${step === s.id ? "scale-110 drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" : ""}`}
            />
            <span className="text-xs font-black uppercase tracking-[0.2em]">{s.label}</span>
            {step > s.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary/50" />}
            {step === s.id && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-primary shadow-[0_0_10px_var(--primary)]" />
            )}
          </div>
        ))}
      </div>

      <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-8 shadow-2xl min-h-[50vh] relative overflow-hidden ring-1 ring-white/5">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        {step === 1 && <StepRace character={character} updateCharacter={updateCharacter} />}
        {step === 2 && <StepBackground character={character} updateCharacter={updateCharacter} />}
        {step === 3 && <StepClass character={character} updateCharacter={updateCharacter} />}
        {step === 4 && <StepAbilities character={character} updateCharacter={updateCharacter} />}
        {step === 5 && <StepSpells character={character} updateCharacter={updateCharacter} />}
        {step === 6 && <StepReview character={character} validationIssues={validationIssues} />}
      </div>

      <div className="flex justify-between mt-8 max-w-3xl mx-auto">
        <Button variant="outline" onClick={prevStep} disabled={step === 1}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        {step < 6 ? (
          <Button onClick={nextStep} disabled={!isStepValid()}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={saveCharacter} disabled={validationIssues.length > 0}>
            Save Character <Save className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Subcomponents for steps

const SOURCE_LABELS: Record<string, string> = {
  AAG: "Astral Adventurer's Guide",
  AI: "Acquisitions Incorporated",
  BAM: "Boo's Astral Menagerie",
  BGG: "Bigby Presents: Glory of the Giants",
  BMT: "The Book of Many Things",
  XPHB: "Player's Handbook",
  XDMG: "Dungeon Master's Guide",
  XMM: "Monster Manual",
  FTD: "Fizban's Treasury of Dragons",
  TCE: "Tasha's Cauldron of Everything",
  XGE: "Xanathar's Guide to Everything",
  EFA: "Eberron: Forge of the Artificer",
  ERLW: "Eberron: Rising from the Last War",
  EGW: "Explorer's Guide to Wildemount",
  GGR: "Guildmasters' Guide to Ravnica",
  MOT: "Mythic Odysseys of Theros",
  MPMM: "Mordenkainen Presents: Monsters of the Multiverse",
  MTF: "Mordenkainen's Tome of Foes",
  MPP: "Morte's Planar Parade",
  FRAIF: "Forgotten Realms: Adventures in Faerun",
  FRHOF: "Forgotten Realms: Heroes of Faerun",
  RHW: "Ravenloft: The Horrors Within",
  SATO: "Sigil and the Outlands",
  SCAG: "Sword Coast Adventurer's Guide",
  SCC: "Strixhaven: A Curriculum of Chaos",
  VGM: "Volo's Guide to Monsters",
  VRGR: "Van Richten's Guide to Ravenloft",
};

const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const ABILITY_NAMES: Record<string, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};
const SKILL_OPTIONS = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival",
];
const TOOL_OPTIONS = [
  "Alchemist's Supplies",
  "Brewer's Supplies",
  "Calligrapher's Supplies",
  "Carpenter's Tools",
  "Cartographer's Tools",
  "Cobbler's Tools",
  "Cook's Utensils",
  "Glassblower's Tools",
  "Jeweler's Tools",
  "Leatherworker's Tools",
  "Mason's Tools",
  "Painter's Supplies",
  "Potter's Tools",
  "Smith's Tools",
  "Thieves' Tools",
  "Tinker's Tools",
  "Weaver's Tools",
  "Woodcarver's Tools",
  "Disguise Kit",
  "Forgery Kit",
  "Herbalism Kit",
  "Navigator's Tools",
  "Poisoner's Kit",
];
const FIGHTING_STYLE_OPTIONS = [
  "Archery",
  "Blind Fighting",
  "Defense",
  "Dueling",
  "Great Weapon Fighting",
  "Interception",
  "Protection",
  "Thrown Weapon Fighting",
  "Two-Weapon Fighting",
  "Unarmed Fighting",
];
const WEAPON_MASTERY_OPTIONS = [
  "Battleaxe",
  "Club",
  "Dagger",
  "Dart",
  "Flail",
  "Glaive",
  "Greataxe",
  "Greatclub",
  "Greatsword",
  "Halberd",
  "Handaxe",
  "Javelin",
  "Lance",
  "Light Hammer",
  "Longbow",
  "Longsword",
  "Mace",
  "Maul",
  "Morningstar",
  "Pike",
  "Quarterstaff",
  "Rapier",
  "Scimitar",
  "Shortbow",
  "Shortsword",
  "Sickle",
  "Sling",
  "Spear",
  "Trident",
  "Warhammer",
  "Whip",
];
const PREPARED_SPELLS_BY_CLASS: Record<string, number[]> = {
  artificer: [2, 3, 4, 5, 6, 6, 7, 7, 9, 10, 10, 11, 11, 12, 13, 13, 14, 14, 15, 15],
  bard: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 15, 16, 16, 17, 18, 18, 19, 20, 22, 22],
  cleric: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 15, 16, 16, 17, 18, 18, 19, 20, 22, 22],
  druid: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 15, 16, 16, 17, 18, 18, 19, 20, 22, 22],
  paladin: [0, 2, 3, 3, 5, 6, 6, 7, 7, 9, 10, 10, 11, 11, 12, 13, 13, 14, 14, 15],
  ranger: [0, 2, 3, 3, 5, 6, 6, 7, 7, 9, 10, 10, 11, 11, 12, 13, 13, 14, 14, 15],
  sorcerer: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 15, 16, 16, 17, 18, 18, 19, 20, 22, 22],
  warlock: [2, 3, 4, 5, 6, 7, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 15, 15],
  wizard: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 15, 16, 16, 17, 18, 18, 19, 20, 22, 22],
};
const INVOCATION_LEVEL_PREREQUISITES: Record<string, number> = {
  "Ascendant Step": 5,
  "Devouring Blade": 12,
  Lifedrinker: 9,
  "Master of Myriad Forms": 5,
  "One with Shadows": 5,
  "Otherworldly Leap": 2,
  "Thirsting Blade": 5,
  "Visions of Distant Realms": 9,
  "Whispers of the Grave": 7,
  "Witch Sight": 15,
};
const INVOCATION_PACT_PREREQUISITES: Record<string, string> = {
  "Devouring Blade": "Pact of the Blade",
  "Eldritch Smite": "Pact of the Blade",
  "Gift of the Protectors": "Pact of the Tome",
  "Investment of the Chain Master": "Pact of the Chain",
  Lifedrinker: "Pact of the Blade",
  "Thirsting Blade": "Pact of the Blade",
};
const WARLOCK_INVOCATION_COUNTS = [1, 3, 3, 3, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10];

function parseJsonValue(value: string | null | undefined, fallback: any) {
  if (!value) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getSourceLabel(item: any): string {
  const source = String(item.source || "Unknown").toUpperCase();
  return SOURCE_LABELS[source] || item.source || "Unknown";
}

function getJsonField(item: any, camel: string, snake: string) {
  return item?.[camel] ?? item?.[snake];
}

function toAbilityKey(value: string): string {
  return value.slice(0, 3).toUpperCase();
}

function getBackgroundAbilityOptions(background: any): string[] {
  const raw = getJsonField(background, "abilityScoreIncreasesJson", "ability_score_increases_json");
  const entries = parseJsonValue(raw, []);
  const options = new Set<string>();

  const visit = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "string") {
      const ability = toAbilityKey(value);
      if (ABILITIES.includes(ability)) options.add(ability);
      return;
    }
    if (typeof value !== "object") return;
    if (value.from) visit(value.from);
    if (value.weighted?.from) visit(value.weighted.from);
    if (value.choose) visit(value.choose);
    Object.entries(value).forEach(([key, enabled]) => {
      const ability = toAbilityKey(key);
      if (ABILITIES.includes(ability) && (enabled === true || typeof enabled === "number")) {
        options.add(ability);
      }
      if (typeof enabled === "object") visit(enabled);
    });
  };

  visit(entries);
  return Array.from(options);
}

function getDefaultBackgroundBonuses(background: any): Record<string, number> {
  const bonuses = Object.fromEntries(ABILITIES.map((ab) => [ab, 0])) as Record<string, number>;
  const options = getBackgroundAbilityOptions(background);
  if (options[0]) bonuses[options[0]] = 2;
  if (options[1]) bonuses[options[1]] = 1;
  return bonuses;
}

function setBackgroundBonus(
  current: Record<string, number>,
  ability: string,
  amount: 1 | 2,
  options: string[],
): Record<string, number> {
  const next = Object.fromEntries(ABILITIES.map((ab) => [ab, 0])) as Record<string, number>;
  const otherAmount = amount === 2 ? 1 : 2;
  const currentOther = ABILITIES.find((ab) => current[ab] === otherAmount && ab !== ability);
  next[ability] = amount;
  if (currentOther && options.includes(currentOther)) {
    next[currentOther] = otherAmount;
  } else {
    const fallback = options.find((ab) => ab !== ability);
    if (fallback) next[fallback] = otherAmount;
  }
  return next;
}

function isValidAbilityBonusSet(character: BuilderState): boolean {
  const values = Object.values(character.abilityBonuses);
  return (
    values.filter((value) => value === 2).length === 1 &&
    values.filter((value) => value === 1).length === 1
  );
}

function getSubclassChoiceLevel(subclasses: any[]): number {
  return Math.min(...subclasses.map((sub) => sub.levelChosen || 3));
}

function formatList(raw: string | null | undefined): string {
  const value = parseJsonValue(raw, []);
  if (!value) return "";
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "object")
    return Object.values(value)
      .flat()
      .map((item) => String(item))
      .join(", ");
  return String(value);
}

function normalizeChoiceName(value: unknown): string {
  return String(value ?? "")
    .replace(/\{@(?:item|skill|filter)\s+([^}|]+)(?:\|[^}]*)?\}/g, "$1")
    .replace(/\{@[^}]+\}/g, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace("'S", "'s");
}

type ChoiceGroup = {
  id: string;
  label: string;
  count: number;
  options: string[];
};

type TraitChoiceGroup = {
  id: string;
  label: string;
  options: string[];
};

const DRAGON_DAMAGE_BY_ANCESTRY: Record<string, string> = {
  Black: "Acid",
  Blue: "Lightning",
  Brass: "Fire",
  Bronze: "Lightning",
  Copper: "Acid",
  Gold: "Fire",
  Green: "Poison",
  Red: "Fire",
  Silver: "Cold",
  White: "Cold",
  Amethyst: "Force",
  Crystal: "Radiant",
  Emerald: "Psychic",
  Sapphire: "Thunder",
  Topaz: "Necrotic",
};

function getSpeciesTraitGroups(species: any): TraitChoiceGroup[] {
  if (!species) return [];
  const id = species.id;
  if (id === "elf") {
    return [
      { id: "elvenLineage", label: "Elven Lineage", options: ["Drow", "High Elf", "Wood Elf"] },
    ];
  }
  if (id === "gnome") {
    return [
      { id: "gnomishLineage", label: "Gnomish Lineage", options: ["Forest Gnome", "Rock Gnome"] },
    ];
  }
  if (id === "tiefling") {
    return [
      {
        id: "fiendishLegacy",
        label: "Fiendish Legacy",
        options: ["Abyssal", "Chthonic", "Infernal"],
      },
    ];
  }
  if (id === "goliath") {
    return [
      {
        id: "giantAncestry",
        label: "Giant Ancestry",
        options: [
          "Cloud's Jaunt",
          "Fire's Burn",
          "Frost's Chill",
          "Hill's Tumble",
          "Stone's Endurance",
          "Storm's Thunder",
        ],
      },
    ];
  }
  if (id === "shifter") {
    return [
      {
        id: "shiftingForm",
        label: "Shifting Benefit",
        options: ["Beasthide", "Longtooth", "Swiftstride", "Wildhunt"],
      },
    ];
  }
  if (id === "dragonborn" || id === "dragonborn-metallic") {
    return [
      {
        id: "draconicAncestry",
        label: "Draconic Ancestry",
        options: [
          "Black",
          "Blue",
          "Brass",
          "Bronze",
          "Copper",
          "Gold",
          "Green",
          "Red",
          "Silver",
          "White",
        ],
      },
    ];
  }
  if (id === "dragonborn-chromatic") {
    return [
      {
        id: "draconicAncestry",
        label: "Chromatic Ancestry",
        options: ["Black", "Blue", "Green", "Red", "White"],
      },
    ];
  }
  if (id === "dragonborn-gem") {
    return [
      {
        id: "draconicAncestry",
        label: "Gem Ancestry",
        options: ["Amethyst", "Crystal", "Emerald", "Sapphire", "Topaz"],
      },
    ];
  }
  return [];
}

function areTraitGroupsComplete(
  groups: TraitChoiceGroup[],
  choices: Record<string, string>,
): boolean {
  return groups.every((group) => Boolean(choices[group.id]));
}

function TraitChoicePicker({
  groups,
  selected,
  onChange,
}: {
  groups: TraitChoiceGroup[];
  selected: Record<string, string>;
  onChange: (selected: Record<string, string>) => void;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="space-y-4 rounded-xl border border-border/30 bg-secondary/20 p-4">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Species Choices
      </div>
      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          <div className="text-sm font-bold">{group.label}</div>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onChange({ ...selected, [group.id]: option })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  selected[group.id] === option
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-background/50 text-muted-foreground border-border/40 hover:text-foreground"
                }`}
              >
                {option}
                {group.id === "draconicAncestry" && DRAGON_DAMAGE_BY_ANCESTRY[option]
                  ? ` (${DRAGON_DAMAGE_BY_ANCESTRY[option]})`
                  : ""}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function getProficiencyChoiceGroups(
  raw: unknown,
  type: "skills" | "tools",
  fallbackOptions: string[],
): ChoiceGroup[] {
  const parsed = parseJsonValue(raw as any, {});
  const entries = type && !Array.isArray(parsed) ? parsed?.[type] : parsed;
  if (!Array.isArray(entries)) return [];

  return entries.flatMap((entry: any, index: number) => {
    if (entry?.any) {
      return [
        {
          id: `${type}-any-${index}`,
          label: `Choose ${entry.any} ${type === "skills" ? "skill" : "tool"}${entry.any > 1 ? "s" : ""}`,
          count: Number(entry.any),
          options: fallbackOptions,
        },
      ];
    }
    const choose = entry?.choose;
    if (choose?.from) {
      const options = choose.from.map(normalizeChoiceName).filter(Boolean);
      return [
        {
          id: `${type}-choose-${index}`,
          label: `Choose ${choose.count || 1}`,
          count: Number(choose.count || 1),
          options,
        },
      ];
    }
    return [];
  });
}

function getToolChoiceGroups(raw: unknown): ChoiceGroup[] {
  const parsed = parseJsonValue(raw as any, []);
  const values = Array.isArray(parsed) ? parsed : [parsed];
  return values.flatMap((entry: any, index: number) => {
    if (typeof entry === "string" && /AnyArtisansTool/i.test(entry)) {
      return [
        {
          id: `artisan-tool-${index}`,
          label: "Choose one artisan's tool",
          count: 1,
          options: TOOL_OPTIONS.filter((tool) => /Supplies|Tools|Utensils/.test(tool)),
        },
      ];
    }
    if (entry?.anyArtisansTool) {
      return [
        {
          id: `artisan-tool-${index}`,
          label: `Choose ${entry.anyArtisansTool} artisan's tool`,
          count: Number(entry.anyArtisansTool),
          options: TOOL_OPTIONS.filter((tool) => /Supplies|Tools|Utensils/.test(tool)),
        },
      ];
    }
    if (entry?.any) {
      return [
        {
          id: `tool-any-${index}`,
          label: `Choose ${entry.any} tool${entry.any > 1 ? "s" : ""}`,
          count: Number(entry.any),
          options: TOOL_OPTIONS,
        },
      ];
    }
    return [];
  });
}

function areChoiceGroupsComplete(groups: ChoiceGroup[], selected: string[]): boolean {
  return selected.length >= groups.reduce((total, group) => total + group.count, 0);
}

function toggleChoice(selected: string[], choice: string, max: number): string[] {
  if (selected.includes(choice)) return selected.filter((item) => item !== choice);
  if (selected.length >= max) return [...selected.slice(1), choice];
  return [...selected, choice];
}

function ChoiceGroupPicker({
  groups,
  selected,
  onChange,
}: {
  groups: ChoiceGroup[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  if (groups.length === 0) return null;
  const max = groups.reduce((total, group) => total + group.count, 0);
  const options = Array.from(new Set(groups.flatMap((group) => group.options)));
  return (
    <div className="space-y-3 rounded-xl border border-border/30 bg-secondary/20 p-4">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {groups.map((group) => group.label).join(" + ")}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(toggleChoice(selected, option, max))}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              selected.includes(option)
                ? "bg-primary/20 text-primary border-primary/40"
                : "bg-background/50 text-muted-foreground border-border/40 hover:text-foreground"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        Selected {Math.min(selected.length, max)} / {max}
      </div>
    </div>
  );
}

function getEquipmentOptions(raw: unknown): Array<{ id: string; summary: string }> {
  const parsed = parseJsonValue(raw as any, {});
  const packages = Array.isArray(parsed) ? parsed[0] : parsed?.defaultData?.[0];
  if (!packages || typeof packages !== "object") return [];
  return Object.entries(packages).map(([id, items]) => ({
    id,
    summary: formatEquipmentPackage(items as any[]),
  }));
}

function formatEquipmentPackage(items: any[]): string {
  if (!Array.isArray(items)) return "";
  return items
    .map((item) => {
      if (item.value) return `${Math.floor(Number(item.value) / 100)} GP`;
      if (item.displayName) return normalizeChoiceName(item.displayName);
      if (item.item) {
        const [name] = String(item.item).split("|");
        return `${item.quantity && item.quantity > 1 ? `${item.quantity} ` : ""}${normalizeChoiceName(name)}`;
      }
      if (item.equipmentType) return normalizeChoiceName(item.equipmentType);
      if (item.special) return normalizeChoiceName(item.special);
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

function getSpellcastingInfo(cls: any) {
  return parseJsonValue(cls?.spellcastingJson, {});
}

function isSpellcaster(cls: any): boolean {
  const spellcasting = getSpellcastingInfo(cls);
  return Boolean(spellcasting?.progression || spellcasting?.cantrips?.length);
}

function getCantripLimit(character: BuilderState, cls: any): number {
  const cantrips = getSpellcastingInfo(cls)?.cantrips;
  if (!Array.isArray(cantrips)) return 0;
  return Number(cantrips[Math.max(0, character.level - 1)] || 0);
}

function getMaxSpellLevel(character: BuilderState, cls: any): number {
  const progression = getSpellcastingInfo(cls)?.progression;
  if (!progression) return 0;
  if (progression === "full") return Math.min(9, Math.ceil(character.level / 2));
  if (progression === "artificer" || progression === "half") {
    return Math.min(5, Math.max(1, Math.ceil(character.level / 4)));
  }
  if (progression === "third") return Math.min(4, Math.max(1, Math.ceil(character.level / 6)));
  return 1;
}

function getPreparedSpellLimit(character: BuilderState, cls: any): number {
  if (!isSpellcaster(cls)) return 0;
  const byClass = PREPARED_SPELLS_BY_CLASS[cls.id];
  if (byClass) return Number(byClass[Math.max(0, character.level - 1)] || 0);

  const ability = String(getSpellcastingInfo(cls)?.ability || "int")
    .slice(0, 3)
    .toUpperCase();
  const abilityScore =
    (character.abilities[ability] || 10) + (character.abilityBonuses[ability] || 0);
  return Math.max(1, character.level + Math.floor((abilityScore - 10) / 2));
}

function isSpellStepValid(character: BuilderState, classes: any[]): boolean {
  const cls = classes.find((candidate) => candidate.id === character.classId);
  if (!isSpellcaster(cls)) return true;
  const cantripLimit = getCantripLimit(character, cls);
  const preparedLimit = getPreparedSpellLimit(character, cls);
  return (
    character.cantripChoices.length === cantripLimit &&
    character.preparedSpellChoices.length >= Math.min(1, preparedLimit) &&
    character.preparedSpellChoices.length <= preparedLimit
  );
}

function getBuilderValidationIssues(
  character: BuilderState,
  data: {
    backgrounds: any[];
    classes: any[];
    feats: any[];
    species: any[];
    subclasses: any[];
    classFeatures: any[];
  },
): string[] {
  const issues: string[] = [];
  const race = data.species.find((item) => item.id === character.raceId);
  const background = data.backgrounds.find((item) => item.id === character.backgroundId);
  const cls = data.classes.find((item) => item.id === character.classId);
  const availableSubclasses = data.subclasses.filter((item) => item.classId === character.classId);
  const subclassLevel =
    availableSubclasses.length > 0 ? getSubclassChoiceLevel(availableSubclasses) : 0;
  const originFeat = background?.originFeatId
    ? data.feats.find((feat) => feat.id === background.originFeatId)
    : null;

  if (!character.name.trim()) issues.push("Enter a character name.");
  if (!race) {
    issues.push("Choose a species.");
  } else {
    getSpeciesTraitGroups(race)
      .filter((group) => !character.speciesTraitChoices[group.id])
      .forEach((group) => issues.push(`Choose ${group.label}.`));

    const speciesProficiencies = getJsonField(race, "proficienciesJson", "proficiencies_json");
    if (
      !areChoiceGroupsComplete(
        getProficiencyChoiceGroups(speciesProficiencies, "skills", SKILL_OPTIONS),
        character.speciesSkillChoices,
      )
    ) {
      issues.push("Complete species skill choices.");
    }
    if (
      !areChoiceGroupsComplete(
        getProficiencyChoiceGroups(speciesProficiencies, "tools", TOOL_OPTIONS),
        character.speciesToolChoices,
      )
    ) {
      issues.push("Complete species tool choices.");
    }
  }

  if (!background) {
    issues.push("Choose a background.");
  } else {
    if (!isValidAbilityBonusSet(character)) {
      issues.push("Choose one +2 and one +1 background ability bonus.");
    }
    if (
      !areChoiceGroupsComplete(
        getToolChoiceGroups(
          getJsonField(background, "toolProficienciesJson", "tool_proficiencies_json"),
        ),
        character.backgroundToolChoices,
      )
    ) {
      issues.push("Complete background tool choices.");
    }
    const backgroundEquipmentOptions = getEquipmentOptions(
      getJsonField(background, "startingEquipmentJson", "starting_equipment_json"),
    );
    if (
      backgroundEquipmentOptions.length > 0 &&
      !backgroundEquipmentOptions.some(
        (option) => option.id === character.backgroundEquipmentOption,
      )
    ) {
      issues.push("Choose a background equipment package.");
    }
    if (!areOriginFeatChoicesComplete(originFeat, character)) {
      issues.push(`Complete ${originFeat?.name || "origin feat"} choices.`);
    }
  }

  if (!cls) {
    issues.push("Choose a class.");
  } else {
    if (
      availableSubclasses.length > 0 &&
      character.level >= subclassLevel &&
      !availableSubclasses.some((subclass) => subclass.id === character.subclassId)
    ) {
      issues.push(`Choose a subclass for level ${subclassLevel} or higher.`);
    }
    const classProficiencies = parseJsonValue(cls.proficienciesJson, {});
    if (
      !areChoiceGroupsComplete(
        getProficiencyChoiceGroups(classProficiencies, "skills", SKILL_OPTIONS),
        character.classSkillChoices,
      )
    ) {
      issues.push("Complete class skill choices.");
    }
    if (
      !areChoiceGroupsComplete(
        getToolChoiceGroups(classProficiencies?.starting?.toolProficiencies),
        character.classToolChoices,
      )
    ) {
      issues.push("Complete class tool choices.");
    }
    const classEquipmentOptions = getEquipmentOptions(cls.startingEquipmentJson);
    if (
      classEquipmentOptions.length > 0 &&
      !classEquipmentOptions.some((option) => option.id === character.classEquipmentOption)
    ) {
      issues.push("Choose a class equipment package.");
    }
    if (
      !areFeatureChoicesComplete(
        getUnlockedFeatureOptionGroups(character, data.classFeatures),
        character.featureChoices,
      )
    ) {
      issues.push("Complete class feature choices.");
    }
  }

  if (!Object.values(character.abilities).every((value) => Number(value) > 0)) {
    issues.push("Assign every ability score.");
  }
  if (cls && !isSpellStepValid(character, data.classes)) {
    const cantripLimit = getCantripLimit(character, cls);
    const preparedLimit = getPreparedSpellLimit(character, cls);
    issues.push(
      `Choose ${cantripLimit} cantrip${cantripLimit === 1 ? "" : "s"} and up to ${preparedLimit} prepared/known spell${preparedLimit === 1 ? "" : "s"}.`,
    );
  }

  return issues;
}

function spellSummary(spell: any): string {
  return [spell.school, spell.castingTime, spell.range].filter(Boolean).join(" • ");
}

function emptyFeatChoices(): BuilderState["featChoices"] {
  return { cantrips: [], spells: [], skills: [], tools: [] };
}

function getClassSpellOptions(
  spellList: string | undefined,
  level: number,
  spells: any[],
  classSpells: any[],
) {
  if (!spellList) return [];
  const linkedSpellIds = new Set(
    classSpells
      .filter((link: any) => (link.classId ?? link.class_id) === spellList)
      .map((link: any) => link.spellId ?? link.spell_id),
  );
  return spells
    .filter((spell: any) => linkedSpellIds.has(spell.id) && spell.level === level)
    .sort((a: any, b: any) => a.name.localeCompare(b.name));
}

function areOriginFeatChoicesComplete(originFeat: any, character: BuilderState): boolean {
  if (!originFeat) return true;
  const choices = character.featChoices;
  if (originFeat.id === "magic-initiate") {
    return (
      Boolean(choices.spellList) &&
      Boolean(choices.spellcastingAbility) &&
      choices.cantrips.length === 2 &&
      choices.spells.length === 1
    );
  }
  if (originFeat.id === "aberrant-dragonmark") {
    return choices.cantrips.length === 1 && choices.spells.length === 1;
  }
  if (originFeat.id === "crafter") return choices.tools.length === 3;
  if (originFeat.id === "skilled") return choices.skills.length + choices.tools.length === 3;
  return true;
}

type FeatureOptionGroup = {
  featureId: string;
  featureName: string;
  count: number;
  options: string[];
};

function getUnlockedFeatureOptionGroups(
  character: BuilderState,
  classFeatures: any[],
): FeatureOptionGroup[] {
  if (!character.classId) return [];
  return classFeatures
    .filter((feature: any) => {
      const classId = feature.classId ?? feature.class_id;
      const subclassId = feature.subclassId ?? feature.subclass_id;
      const levelRequired = feature.levelRequired ?? feature.level_required ?? 0;
      return (
        classId === character.classId &&
        (!subclassId || subclassId === character.subclassId) &&
        Number(levelRequired || 0) <= character.level
      );
    })
    .flatMap((feature: any) => {
      const groups = parseJsonValue(feature.optionsJson ?? feature.options_json, []);
      const structuredGroups = Array.isArray(groups) ? groups : [];
      const syntheticGroups = getSyntheticFeatureOptionGroups(feature, character);
      return [...structuredGroups, ...syntheticGroups].flatMap((group: any, index: number) => {
        if (!Array.isArray(group.options) || group.options.length === 0) return [];
        const options = filterFeatureOptions(
          feature,
          group.options.map(normalizeChoiceName),
          character,
        );
        if (options.length === 0) return [];
        return [
          {
            featureId: `${feature.id}:${index}`,
            featureName: feature.name,
            count: getFeatureOptionCount(feature, Number(group.count || 1), character),
            options,
          },
        ];
      });
    });
}

function getFeatureOptionCount(
  feature: any,
  fallbackCount: number,
  character: BuilderState,
): number {
  const name = String(feature.name || "");
  if (/eldritch invocation/i.test(name)) {
    return WARLOCK_INVOCATION_COUNTS[Math.max(0, character.level - 1)] || fallbackCount;
  }
  return fallbackCount;
}

function filterFeatureOptions(feature: any, options: string[], character: BuilderState): string[] {
  const name = String(feature.name || "");
  if (!/eldritch invocation/i.test(name)) return options;

  const selectedInvocations = new Set(
    Object.entries(character.featureChoices)
      .filter(([featureChoiceId]) => featureChoiceId.startsWith(String(feature.id)))
      .flatMap(([, selected]) => selected),
  );

  return options.filter((option) => {
    const requiredLevel = INVOCATION_LEVEL_PREREQUISITES[option] || 0;
    if (requiredLevel && character.level < requiredLevel) return false;

    const requiredPact = INVOCATION_PACT_PREREQUISITES[option];
    if (requiredPact && !selectedInvocations.has(requiredPact)) return false;

    return true;
  });
}

function selectedSkillNames(character: BuilderState): string[] {
  return Array.from(
    new Set([
      ...character.speciesSkillChoices,
      ...character.featChoices.skills,
      ...character.classSkillChoices,
    ]),
  ).filter(Boolean);
}

function weaponMasteryCount(classId: string | null, level: number): number {
  if (classId === "fighter") return level >= 9 ? 4 : 3;
  if (["barbarian", "paladin", "ranger", "rogue"].includes(classId || "")) return 2;
  return 0;
}

function getSyntheticFeatureOptionGroups(feature: any, character: BuilderState) {
  const name = String(feature.name || "");
  const featureId = String(feature.id || "");
  const classId = feature.classId ?? feature.class_id;
  const levelRequired = Number(feature.levelRequired ?? feature.level_required ?? 0);

  if (name === "Expertise") {
    const options = selectedSkillNames(character);
    return options.length > 0 ? [{ count: 2, options }] : [{ count: 2, options: SKILL_OPTIONS }];
  }

  if (/fighting style/i.test(name)) {
    return [{ count: 1, options: FIGHTING_STYLE_OPTIONS }];
  }

  if (name === "Weapon Mastery" && /weapon-mastery/i.test(featureId)) {
    const count = weaponMasteryCount(classId, character.level || levelRequired);
    return count > 0 ? [{ count, options: WEAPON_MASTERY_OPTIONS }] : [];
  }

  return [];
}

function areFeatureChoicesComplete(
  groups: FeatureOptionGroup[],
  choices: Record<string, string[]>,
): boolean {
  return groups.every((group) => {
    const selected = choices[group.featureId] || [];
    return (
      selected.length >= group.count && selected.every((choice) => group.options.includes(choice))
    );
  });
}

function FeatureChoicePanel({
  groups,
  selected,
  onChange,
}: {
  groups: FeatureOptionGroup[];
  selected: Record<string, string[]>;
  onChange: (selected: Record<string, string[]>) => void;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="space-y-4 rounded-xl border border-border/30 bg-secondary/20 p-4 md:col-span-2">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Class Feature Choices
      </div>
      {groups.map((group) => (
        <div key={group.featureId} className="space-y-2">
          <div className="text-sm font-bold">
            {group.featureName}: choose {group.count}
          </div>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => {
              const current = selected[group.featureId] || [];
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...selected,
                      [group.featureId]: toggleChoice(current, option, group.count),
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    current.includes(option)
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-background/50 text-muted-foreground border-border/40 hover:text-foreground"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function OriginFeatChoicePanel({
  originFeat,
  character,
  updateCharacter,
}: {
  originFeat: any;
  character: BuilderState;
  updateCharacter: (updates: Partial<BuilderState>) => void;
}) {
  const { classSpells, spells } = Route.useLoaderData();
  if (!originFeat) return null;

  const setFeatChoices = (updates: Partial<BuilderState["featChoices"]>) =>
    updateCharacter({ featChoices: { ...character.featChoices, ...updates } });

  if (originFeat.id === "crafter") {
    const artisanTools = TOOL_OPTIONS.filter((tool) => /Supplies|Tools|Utensils/.test(tool));
    return (
      <ChoiceGroupPicker
        groups={[
          {
            id: "crafter-tools",
            label: "Crafter: choose 3 artisan tools",
            count: 3,
            options: artisanTools,
          },
        ]}
        selected={character.featChoices.tools}
        onChange={(choices) => setFeatChoices({ tools: choices })}
      />
    );
  }

  if (originFeat.id === "skilled") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChoiceGroupPicker
          groups={[
            { id: "skilled-skills", label: "Skilled: skills", count: 3, options: SKILL_OPTIONS },
          ]}
          selected={character.featChoices.skills}
          onChange={(choices) =>
            setFeatChoices({
              skills: choices.slice(0, Math.max(0, 3 - character.featChoices.tools.length)),
            })
          }
        />
        <ChoiceGroupPicker
          groups={[
            { id: "skilled-tools", label: "Skilled: tools", count: 3, options: TOOL_OPTIONS },
          ]}
          selected={character.featChoices.tools}
          onChange={(choices) =>
            setFeatChoices({
              tools: choices.slice(0, Math.max(0, 3 - character.featChoices.skills.length)),
            })
          }
        />
      </div>
    );
  }

  if (originFeat.id === "magic-initiate" || originFeat.id === "aberrant-dragonmark") {
    const spellList =
      originFeat.id === "aberrant-dragonmark" ? "sorcerer" : character.featChoices.spellList;
    const cantrips = getClassSpellOptions(spellList, 0, spells, classSpells);
    const firstLevelSpells = getClassSpellOptions(spellList, 1, spells, classSpells);
    const cantripLimit = originFeat.id === "magic-initiate" ? 2 : 1;

    return (
      <div className="space-y-4 rounded-xl border border-border/30 bg-secondary/20 p-4">
        <div>
          <h4 className="text-lg font-bold">{originFeat.name} Choices</h4>
          <p className="text-xs text-muted-foreground">
            These choices will be saved as feat-granted spells.
          </p>
        </div>

        {originFeat.id === "magic-initiate" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Spell List
              </label>
              <Select
                value={character.featChoices.spellList || ""}
                onValueChange={(value) =>
                  setFeatChoices({ spellList: value, cantrips: [], spells: [] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose list" />
                </SelectTrigger>
                <SelectContent>
                  {["cleric", "druid", "wizard"].map((list) => (
                    <SelectItem key={list} value={list}>
                      {normalizeChoiceName(list)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Spellcasting Ability
              </label>
              <Select
                value={character.featChoices.spellcastingAbility || ""}
                onValueChange={(value) => setFeatChoices({ spellcastingAbility: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose ability" />
                </SelectTrigger>
                <SelectContent>
                  {["INT", "WIS", "CHA"].map((ability) => (
                    <SelectItem key={ability} value={ability}>
                      {ABILITY_NAMES[ability]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {spellList && (
          <div className="space-y-4">
            <SpellChoiceList
              title="Feat Cantrips"
              spells={cantrips}
              selected={character.featChoices.cantrips}
              limit={cantripLimit}
              exact
              onChange={(choices) => setFeatChoices({ cantrips: choices })}
            />
            <SpellChoiceList
              title="Feat Level 1 Spell"
              spells={firstLevelSpells}
              selected={character.featChoices.spells}
              limit={1}
              exact
              onChange={(choices) => setFeatChoices({ spells: choices })}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}

function formatAbilitySummary(raw: string | null | undefined): string {
  const value = parseJsonValue(raw, []);
  if (!value || (Array.isArray(value) && value.length === 0)) return "";

  if (Array.isArray(value)) {
    return value
      .flatMap((entry: any) => {
        if (!entry || typeof entry !== "object") return [];
        return Object.entries(entry)
          .filter(([, enabled]) => enabled === true || typeof enabled === "number")
          .map(([ability, amount]) =>
            typeof amount === "number"
              ? `+${amount} ${ability.toUpperCase()}`
              : ability.toUpperCase(),
          );
      })
      .join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([ability, amount]) => `+${amount} ${ability.toUpperCase()}`)
      .join(", ");
  }

  return "";
}

function formatSensesSummary(raw: string | null | undefined): string {
  const value = parseJsonValue(raw, []);
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([sense, distance]) => `${sense} ${distance}ft`)
      .join(", ");
  }
  return "";
}

function formatPrimaryAbility(raw: string | null | undefined): string {
  const value = parseJsonValue(raw, []);
  if (!Array.isArray(value)) return "";

  return value
    .flatMap((entry: any) =>
      entry && typeof entry === "object"
        ? Object.entries(entry)
            .filter(([, enabled]) => enabled === true)
            .map(([ability]) => ability.toUpperCase())
        : [],
    )
    .join(" or ");
}

function StepRace({ character, updateCharacter }: any) {
  const { species } = Route.useLoaderData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Player's Handbook");
  const selectedRace = species.find((race: any) => race.id === character.raceId);
  const speciesSkillGroups = getProficiencyChoiceGroups(
    getJsonField(selectedRace, "proficienciesJson", "proficiencies_json"),
    "skills",
    SKILL_OPTIONS,
  );
  const speciesToolGroups = getProficiencyChoiceGroups(
    getJsonField(selectedRace, "proficienciesJson", "proficiencies_json"),
    "tools",
    TOOL_OPTIONS,
  );
  const speciesTraitGroups = getSpeciesTraitGroups(selectedRace);

  const uniqueCategories = Array.from(
    new Set(species.map((s: any) => getSourceLabel(s))),
  ).sort() as string[];
  const categories = [
    "Player's Handbook",
    ...uniqueCategories.filter((c) => c !== "Player's Handbook"),
    "All",
  ];

  const filteredSpecies = species.filter((s: any) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const cat = getSourceLabel(s);
    const matchesCategory = selectedCategory === "All" || cat === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-[1200px] mx-auto">
      <div className="bg-secondary/20 p-6 rounded-xl border border-border/30">
        <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          What is your name, hero?
        </label>
        <input
          type="text"
          value={character.name}
          onChange={(e) => updateCharacter({ name: e.target.value })}
          className="w-full max-w-md p-3 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm text-xl font-heading focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner"
          placeholder="Enter name..."
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-6">
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <User className="text-primary h-5 w-5" />
              Heritage Search
            </h3>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner"
              placeholder="Search by name or trait..."
            />
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Categories
            </h4>
            <div className="flex flex-col gap-1 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {categories.map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-left px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                    selectedCategory === cat
                      ? "bg-primary/20 text-primary font-bold border-l-4 border-primary"
                      : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground border-l-4 border-transparent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredSpecies.map((race: any) => {
              const traits = JSON.parse(race.featuresJson || "[]");
              const abilitySummary = formatAbilitySummary(race.abilityScoreIncreasesJson);
              const sensesSummary = formatSensesSummary(race.sensesJson);
              return (
                <Card
                  key={race.id}
                  className={`cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                    character.raceId === race.id
                      ? "border-primary shadow-[0_0_30px_rgba(var(--primary),0.15)] bg-primary/5 scale-[1.02] ring-1 ring-primary/30"
                      : "hover:border-primary/40 hover:bg-secondary/20 hover:-translate-y-1 bg-card/40 border-border/40"
                  }`}
                  onClick={() =>
                    updateCharacter({
                      raceId: race.id,
                      speciesTraitChoices: {},
                      speciesSkillChoices: [],
                      speciesToolChoices: [],
                    })
                  }
                >
                  {character.raceId === race.id && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl font-heading group-hover:text-primary transition-colors flex justify-between items-start">
                      {race.name}
                      {race.isLineage && (
                        <span className="text-xs font-sans font-bold bg-accent/20 text-accent px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                          Lineage
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-sm text-muted-foreground leading-relaxed min-h-[60px] line-clamp-3">
                      {race.description}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-border/30">
                      <span className="text-xs font-bold bg-accent/10 border border-accent/20 text-accent px-2.5 py-1 rounded-md shadow-sm">
                        Speed: {race.speed} ft
                      </span>
                      <span className="text-xs font-bold bg-accent/10 border border-accent/20 text-accent px-2.5 py-1 rounded-md shadow-sm">
                        {race.size}
                      </span>
                      {abilitySummary && (
                        <span className="text-xs font-bold bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-md shadow-sm">
                          ASI: {abilitySummary}
                        </span>
                      )}
                      {sensesSummary && (
                        <span className="text-xs font-bold bg-green-500/10 border border-green-500/20 text-green-500 px-2.5 py-1 rounded-md shadow-sm">
                          Senses: {sensesSummary}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filteredSpecies.length === 0 && (
            <div className="text-center py-20 text-muted-foreground bg-secondary/10 rounded-xl border border-border/20">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-xl">No heritages found matching your criteria.</p>
            </div>
          )}
          {selectedRace &&
            (speciesTraitGroups.length > 0 ||
              speciesSkillGroups.length > 0 ||
              speciesToolGroups.length > 0) && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <TraitChoicePicker
                  groups={speciesTraitGroups}
                  selected={character.speciesTraitChoices}
                  onChange={(choices) => updateCharacter({ speciesTraitChoices: choices })}
                />
                <ChoiceGroupPicker
                  groups={speciesSkillGroups}
                  selected={character.speciesSkillChoices}
                  onChange={(choices) => updateCharacter({ speciesSkillChoices: choices })}
                />
                <ChoiceGroupPicker
                  groups={speciesToolGroups}
                  selected={character.speciesToolChoices}
                  onChange={(choices) => updateCharacter({ speciesToolChoices: choices })}
                />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function StepBackground({ character, updateCharacter }: any) {
  const { backgrounds, feats } = Route.useLoaderData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Player's Handbook");
  const selectedBackground = backgrounds.find((bg: any) => bg.id === character.backgroundId);
  const abilityOptions = selectedBackground ? getBackgroundAbilityOptions(selectedBackground) : [];

  const uniqueCategories = Array.from(
    new Set(backgrounds.map((bg: any) => getSourceLabel(bg))),
  ).sort() as string[];
  const categories = [
    "Player's Handbook",
    ...uniqueCategories.filter((category) => category !== "Player's Handbook"),
    "All",
  ];

  const filteredBackgrounds = backgrounds.filter((bg: any) => {
    const matchesSearch =
      bg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bg.description && bg.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || getSourceLabel(bg) === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const plusTwo = ABILITIES.find((ab) => character.abilityBonuses[ab] === 2) || "";
  const plusOne = ABILITIES.find((ab) => character.abilityBonuses[ab] === 1) || "";
  const originFeat = selectedBackground?.originFeatId
    ? feats.find((feat: any) => feat.id === selectedBackground.originFeatId)
    : null;
  const backgroundToolGroups = getToolChoiceGroups(
    getJsonField(selectedBackground, "toolProficienciesJson", "tool_proficiencies_json"),
  );
  const backgroundEquipmentOptions = getEquipmentOptions(
    getJsonField(selectedBackground, "startingEquipmentJson", "starting_equipment_json"),
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-[1200px] mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 shrink-0 space-y-6">
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BookOpen className="text-primary h-5 w-5" />
              Background Search
            </h3>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner"
              placeholder="Search by origin, feat, or skill..."
            />
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Books
            </h4>
            <div className="flex flex-col gap-1 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {categories.map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-left px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                    selectedCategory === cat
                      ? "bg-primary/20 text-primary font-bold border-l-4 border-primary"
                      : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground border-l-4 border-transparent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          {selectedBackground && abilityOptions.length > 1 && (
            <div className="bg-secondary/20 p-6 rounded-xl border border-border/30">
              <h3 className="text-lg font-bold mb-4">Background Ability Bonuses</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    +2 Bonus
                  </label>
                  <Select
                    value={plusTwo}
                    onValueChange={(value) =>
                      updateCharacter({
                        abilityBonuses: setBackgroundBonus(
                          character.abilityBonuses,
                          value,
                          2,
                          abilityOptions,
                        ),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose ability" />
                    </SelectTrigger>
                    <SelectContent>
                      {abilityOptions.map((ability) => (
                        <SelectItem key={ability} value={ability} disabled={ability === plusOne}>
                          {ABILITY_NAMES[ability]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    +1 Bonus
                  </label>
                  <Select
                    value={plusOne}
                    onValueChange={(value) =>
                      updateCharacter({
                        abilityBonuses: setBackgroundBonus(
                          character.abilityBonuses,
                          value,
                          1,
                          abilityOptions,
                        ),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose ability" />
                    </SelectTrigger>
                    <SelectContent>
                      {abilityOptions.map((ability) => (
                        <SelectItem key={ability} value={ability} disabled={ability === plusTwo}>
                          {ABILITY_NAMES[ability]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {originFeat && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Origin feat: <span className="font-bold text-foreground">{originFeat.name}</span>
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredBackgrounds.map((background: any) => {
              const skills = formatList(
                getJsonField(background, "skillProficienciesJson", "skill_proficiencies_json"),
              );
              const tools = formatList(
                getJsonField(background, "toolProficienciesJson", "tool_proficiencies_json"),
              );
              const feat = background.originFeatId
                ? feats.find((candidate: any) => candidate.id === background.originFeatId)
                : null;
              const options = getBackgroundAbilityOptions(background);
              return (
                <Card
                  key={background.id}
                  className={`cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                    character.backgroundId === background.id
                      ? "border-primary shadow-[0_0_30px_rgba(var(--primary),0.15)] bg-primary/5 scale-[1.02] ring-1 ring-primary/30"
                      : "hover:border-primary/40 hover:bg-secondary/20 hover:-translate-y-1 bg-card/40 border-border/40"
                  }`}
                  onClick={() =>
                    updateCharacter({
                      backgroundId: background.id,
                      abilityBonuses: getDefaultBackgroundBonuses(background),
                      backgroundToolChoices: [],
                      featChoices: emptyFeatChoices(),
                      backgroundEquipmentOption:
                        getEquipmentOptions(
                          getJsonField(
                            background,
                            "startingEquipmentJson",
                            "starting_equipment_json",
                          ),
                        )[0]?.id || null,
                    })
                  }
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl font-heading group-hover:text-primary transition-colors">
                      {background.name}
                    </CardTitle>
                    <CardDescription>{getSourceLabel(background)}</CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-sm text-muted-foreground leading-relaxed min-h-[60px] line-clamp-3">
                      {background.description}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-border/30">
                      {options.length > 0 && (
                        <span className="text-xs font-bold bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-md shadow-sm">
                          ASI: {options.join(", ")}
                        </span>
                      )}
                      {skills && (
                        <span className="text-xs font-bold bg-accent/10 border border-accent/20 text-accent px-2.5 py-1 rounded-md shadow-sm">
                          Skills: {skills}
                        </span>
                      )}
                      {tools && (
                        <span className="text-xs font-bold bg-green-500/10 border border-green-500/20 text-green-500 px-2.5 py-1 rounded-md shadow-sm">
                          Tools: {tools}
                        </span>
                      )}
                      {feat && (
                        <span className="text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2.5 py-1 rounded-md shadow-sm">
                          Feat: {feat.name}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filteredBackgrounds.length === 0 && (
            <div className="text-center py-20 text-muted-foreground bg-secondary/10 rounded-xl border border-border/20">
              <p className="text-xl">No backgrounds found matching your criteria.</p>
            </div>
          )}
          {selectedBackground && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChoiceGroupPicker
                groups={backgroundToolGroups}
                selected={character.backgroundToolChoices}
                onChange={(choices) => updateCharacter({ backgroundToolChoices: choices })}
              />
              {backgroundEquipmentOptions.length > 0 && (
                <div className="space-y-3 rounded-xl border border-border/30 bg-secondary/20 p-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Background Equipment
                  </div>
                  <Select
                    value={character.backgroundEquipmentOption || ""}
                    onValueChange={(value) => updateCharacter({ backgroundEquipmentOption: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose equipment package" />
                    </SelectTrigger>
                    <SelectContent>
                      {backgroundEquipmentOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.id}: {option.summary}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          {originFeat && (
            <OriginFeatChoicePanel
              originFeat={originFeat}
              character={character}
              updateCharacter={updateCharacter}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StepClass({ character, updateCharacter }: any) {
  const { classes, subclasses, classFeatures } = Route.useLoaderData();
  const availableSubclasses = subclasses.filter((s: any) => s.classId === character.classId);
  const subclassChoiceLevel =
    availableSubclasses.length > 0 ? getSubclassChoiceLevel(availableSubclasses) : 3;
  const selectedClass = classes.find((cls: any) => cls.id === character.classId);
  const classProficiencies = parseJsonValue(selectedClass?.proficienciesJson, {});
  const classSkillGroups = getProficiencyChoiceGroups(classProficiencies, "skills", SKILL_OPTIONS);
  const classToolGroups = getToolChoiceGroups(classProficiencies?.starting?.toolProficiencies);
  const classEquipmentOptions = getEquipmentOptions(selectedClass?.startingEquipmentJson);
  const featureOptionGroups = getUnlockedFeatureOptionGroups(character, classFeatures);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-4xl mx-auto">
      <div>
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Swords className="text-primary h-6 w-6" />
          Choose your Calling
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls: any) => {
            const primary = formatPrimaryAbility(cls.primaryAbilityJson);
            return (
              <Card
                key={cls.id}
                className={`cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                  character.classId === cls.id
                    ? "border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.15)] bg-amber-500/5 scale-[1.02] ring-1 ring-amber-500/30"
                    : "hover:border-amber-500/40 hover:bg-secondary/20 hover:-translate-y-1 bg-card/40 border-border/40"
                }`}
                onClick={() =>
                  updateCharacter({
                    classId: cls.id,
                    subclassId: null,
                    classSkillChoices: [],
                    classToolChoices: [],
                    classEquipmentOption:
                      getEquipmentOptions(cls.startingEquipmentJson)[0]?.id || null,
                    featureChoices: {},
                    cantripChoices: [],
                    preparedSpellChoices: [],
                  })
                }
              >
                {character.classId === cls.id && (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-2xl font-heading group-hover:text-amber-500 transition-colors">
                    {cls.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-sm text-muted-foreground leading-relaxed min-h-[60px] line-clamp-3">
                    {cls.description}
                  </p>
                  <div className="mt-5 pt-4 border-t border-border/30 flex flex-wrap gap-2">
                    <span className="text-xs font-bold bg-muted text-foreground px-2 py-1 rounded flex items-center gap-1.5">
                      Hit Dice: d{cls.hitDice}
                    </span>
                    {primary && (
                      <span className="text-xs font-bold bg-accent/10 border border-accent/20 text-accent px-2 py-1 rounded flex items-center gap-1.5">
                        {primary}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {character.classId && (
        <div className="mt-8 bg-secondary/20 p-6 rounded-xl border border-border/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Starting Level
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="20"
              value={character.level}
              onChange={(e) => {
                const level = parseInt(e.target.value) || 1;
                updateCharacter({
                  level,
                  subclassId: level >= subclassChoiceLevel ? character.subclassId : null,
                  featureChoices: {},
                });
              }}
              className="flex-1 accent-amber-500 h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-3xl font-black text-amber-500 w-12 text-center bg-background border border-border rounded-lg py-1 shadow-inner">
              {character.level}
            </div>
          </div>

          {character.level >= subclassChoiceLevel && availableSubclasses.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 text-amber-500">
                Choose Subclass / Path (Level {subclassChoiceLevel}+)
              </label>
              <div className="max-w-md">
                <Select
                  value={character.subclassId || ""}
                  onValueChange={(val) => updateCharacter({ subclassId: val })}
                >
                  <SelectTrigger className="w-full bg-background/50 border-amber-500/30 focus:ring-amber-500 shadow-sm h-12">
                    <SelectValue placeholder="Select a subclass...">
                      {character.subclassId
                        ? availableSubclasses.find((s: any) => s.id === character.subclassId)?.name
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubclasses.map((sub: any) => (
                      <SelectItem
                        key={sub.id}
                        value={sub.id}
                        className="py-3 focus:bg-amber-500/10 cursor-pointer"
                      >
                        <div className="font-bold text-amber-500">{sub.name}</div>
                        <div className="text-xs text-muted-foreground/80 mt-1 max-w-xs whitespace-normal group-focus:text-muted-foreground">
                          {sub.description}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {(classSkillGroups.length > 0 ||
            classToolGroups.length > 0 ||
            classEquipmentOptions.length > 0 ||
            featureOptionGroups.length > 0) && (
            <div className="mt-8 pt-6 border-t border-border/30 grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChoiceGroupPicker
                groups={classSkillGroups}
                selected={character.classSkillChoices}
                onChange={(choices) => updateCharacter({ classSkillChoices: choices })}
              />
              <ChoiceGroupPicker
                groups={classToolGroups}
                selected={character.classToolChoices}
                onChange={(choices) => updateCharacter({ classToolChoices: choices })}
              />
              {classEquipmentOptions.length > 0 && (
                <div className="space-y-3 rounded-xl border border-border/30 bg-secondary/20 p-4 md:col-span-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Class Equipment
                  </div>
                  <Select
                    value={character.classEquipmentOption || ""}
                    onValueChange={(value) => updateCharacter({ classEquipmentOption: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose equipment package" />
                    </SelectTrigger>
                    <SelectContent>
                      {classEquipmentOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.id}: {option.summary}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <FeatureChoicePanel
                groups={featureOptionGroups}
                selected={character.featureChoices}
                onChange={(choices) => updateCharacter({ featureChoices: choices })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepAbilities({ character, updateCharacter }: any) {
  const [method, setMethod] = useState<"standard" | "pointbuy" | "roll">("standard");

  const updateStat = (ab: string, val: number) => {
    updateCharacter({ abilities: { ...character.abilities, [ab]: val } });
  };

  // Point Buy Logic
  const pointCosts: Record<number, number> = {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9,
  };
  const getPointsUsed = () => {
    let total = 0;
    for (const ab of ABILITIES) {
      const val = character.abilities[ab];
      if (val >= 8 && val <= 15) {
        total += pointCosts[val] || 0;
      } else if (val > 15) {
        total += 9 + (val - 15) * 2; // rough penalty for over 15 if manually entered before
      }
    }
    return total;
  };

  // Standard Array Logic
  const standardArray = [15, 14, 13, 12, 10, 8];

  // Roll Logic
  const roll4d6DropLowest = () => {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1).sort(
      (a, b) => a - b,
    );
    return rolls[1] + rolls[2] + rolls[3];
  };

  const rollAll = () => {
    const newAbilities = { ...character.abilities };
    ABILITIES.forEach((ab) => {
      newAbilities[ab] = roll4d6DropLowest();
    });
    updateCharacter({ abilities: newAbilities });
  };

  const setStandardArrayDefaults = () => {
    // Just reset them all to 0 so user can pick
    const newAbilities: any = {};
    ABILITIES.forEach((ab) => (newAbilities[ab] = 0));
    updateCharacter({ abilities: newAbilities });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-bold mb-3 flex items-center justify-center gap-3">
          <Dices className="text-emerald-500 h-8 w-8" />
          Determine Attributes
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose your generation method. Your background bonuses are applied automatically.
        </p>
      </div>

      <div className="flex justify-center gap-4 mb-8">
        <Button
          variant={method === "standard" ? "default" : "outline"}
          onClick={() => {
            setMethod("standard");
            setStandardArrayDefaults();
          }}
          className={method === "standard" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
        >
          Standard Array
        </Button>
        <Button
          variant={method === "pointbuy" ? "default" : "outline"}
          onClick={() => {
            setMethod("pointbuy");
            const newAbilities: any = {};
            ABILITIES.forEach((ab) => (newAbilities[ab] = 8));
            updateCharacter({ abilities: newAbilities });
          }}
          className={method === "pointbuy" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
        >
          Point Buy
        </Button>
        <Button
          variant={method === "roll" ? "default" : "outline"}
          onClick={() => setMethod("roll")}
          className={method === "roll" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
        >
          Roll / Manual
        </Button>
      </div>

      {method === "pointbuy" && (
        <div className="text-center mb-8 bg-secondary/30 py-3 rounded-lg border border-border/50 max-w-sm mx-auto">
          <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground block mb-1">
            Points Remaining
          </span>
          <span
            className={`text-3xl font-black ${27 - getPointsUsed() < 0 ? "text-destructive" : "text-emerald-500"}`}
          >
            {27 - getPointsUsed()}
          </span>
          <span className="text-sm text-muted-foreground ml-2">/ 27</span>
        </div>
      )}

      {method === "roll" && (
        <div className="flex justify-center mb-8">
          <Button
            onClick={rollAll}
            size="lg"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2"
          >
            <Dices className="h-5 w-5" />
            Roll All (4d6 Drop Lowest)
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {ABILITIES.map((ab) => {
          const base = character.abilities[ab];
          const backgroundBonus = character.abilityBonuses[ab] || 0;
          const total = base + backgroundBonus;
          // Calculate modifier normally unless base is 0 (unassigned in standard array)
          const mod = base === 0 ? 0 : Math.floor((total - 10) / 2);
          const isHigh = total >= 16;

          return (
            <div
              key={ab}
              className={`relative bg-card/50 p-6 rounded-2xl border flex flex-col items-center transition-all duration-300 hover:-translate-y-1 ${isHigh ? "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "border-border/40 hover:border-emerald-500/30 hover:shadow-md"}`}
            >
              {isHigh && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 blur-xl rounded-full" />
              )}

              <span className="font-bold text-sm tracking-widest uppercase text-muted-foreground mb-3">
                {ab}
              </span>

              <div
                className={`text-5xl font-black mb-4 tracking-tighter drop-shadow-md ${isHigh ? "text-emerald-400" : "text-foreground"}`}
              >
                {base === 0 ? "-" : total}
              </div>

              <div
                className={`text-base font-bold px-4 py-1.5 rounded-full mb-6 border shadow-sm ${mod > 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : mod < 0 ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-secondary text-foreground border-border"}`}
              >
                {base === 0 ? "-" : mod > 0 ? `+${mod}` : mod}
              </div>

              <div className="w-full mt-auto space-y-3 pt-4 border-t border-border/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider">
                    Base
                  </span>

                  {method === "standard" ? (
                    <Select
                      value={base.toString()}
                      onValueChange={(val) => updateStat(ab, parseInt(val))}
                    >
                      <SelectTrigger className="w-20 h-8 px-2 py-1 text-center font-mono font-bold bg-background border-border/60 focus:ring-emerald-500 rounded text-xs shadow-sm">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent className="min-w-[4rem]">
                        <SelectItem value="0" className="justify-center font-mono font-bold">
                          -
                        </SelectItem>
                        {standardArray.map((v) => {
                          const usedElsewhere = ABILITIES.some(
                            (otherAb) => otherAb !== ab && character.abilities[otherAb] === v,
                          );
                          if (!usedElsewhere || base === v) {
                            return (
                              <SelectItem
                                key={v}
                                value={v.toString()}
                                className="justify-center font-mono font-bold"
                              >
                                {v}
                              </SelectItem>
                            );
                          }
                          return null;
                        })}
                      </SelectContent>
                    </Select>
                  ) : method === "pointbuy" ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateStat(ab, Math.max(8, base - 1))}
                        className="w-5 h-5 flex items-center justify-center bg-secondary rounded hover:bg-primary/20 text-lg font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-mono font-bold">{base}</span>
                      <button
                        onClick={() => updateStat(ab, Math.min(15, base + 1))}
                        className="w-5 h-5 flex items-center justify-center bg-secondary rounded hover:bg-primary/20 text-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      max="18"
                      className="w-16 p-1.5 text-center font-mono font-bold bg-background border border-border/60 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                      value={base}
                      onChange={(e) => {
                        let val = parseInt(e.target.value);
                        if (isNaN(val)) val = 0;
                        if (val > 18) val = 18;
                        updateStat(ab, val);
                      }}
                    />
                  )}
                </div>
                {backgroundBonus > 0 && (
                  <div className="flex items-center justify-between text-xs animate-in fade-in zoom-in duration-500">
                    <span className="text-accent font-semibold uppercase tracking-wider">
                      Background
                    </span>
                    <span className="bg-accent/20 text-accent px-2 py-0.5 rounded font-bold">
                      +{backgroundBonus}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpellChoiceList({
  title,
  spells,
  selected,
  limit,
  exact,
  onChange,
}: {
  title: string;
  spells: any[];
  selected: string[];
  limit: number;
  exact?: boolean;
  onChange: (selected: string[]) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredSpells = spells.filter(
    (spell) =>
      spell.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spell.school.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  return (
    <div className="space-y-4 rounded-xl border border-border/30 bg-secondary/20 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h4 className="text-lg font-bold">{title}</h4>
          <p className="text-xs text-muted-foreground">
            Selected {selected.length} / {limit}
            {exact ? " required" : " maximum"}
          </p>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full md:w-64 p-2 rounded-lg border border-border/50 bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Search spells..."
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-2">
        {filteredSpells.map((spell) => {
          const isSelected = selected.includes(spell.id);
          return (
            <button
              key={spell.id}
              type="button"
              onClick={() => onChange(toggleChoice(selected, spell.id, limit))}
              className={`text-left p-3 rounded-lg border transition-all ${
                isSelected
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-background/50 border-border/40 hover:border-primary/30"
              }`}
            >
              <div className="font-bold">{spell.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{spellSummary(spell)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepSpells({ character, updateCharacter }: any) {
  const { classes, classSpells, spells } = Route.useLoaderData();
  const cls = classes.find((candidate: any) => candidate.id === character.classId);

  if (!isSpellcaster(cls)) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-3xl mx-auto text-center py-16">
        <Wand2 className="h-10 w-10 text-muted-foreground mx-auto" />
        <h3 className="text-2xl font-bold">No Spell Choices Needed</h3>
        <p className="text-muted-foreground">
          {cls?.name || "This class"} does not require spell selection during character creation.
        </p>
      </div>
    );
  }

  const linkedSpellIds = new Set(
    classSpells
      .filter((link: any) => (link.classId ?? link.class_id) === character.classId)
      .map((link: any) => link.spellId ?? link.spell_id),
  );
  const maxSpellLevel = getMaxSpellLevel(character, cls);
  const cantripLimit = getCantripLimit(character, cls);
  const preparedLimit = getPreparedSpellLimit(character, cls);
  const classSpellList = spells
    .filter((spell: any) => linkedSpellIds.has(spell.id))
    .sort((a: any, b: any) => a.level - b.level || a.name.localeCompare(b.name));
  const cantrips = classSpellList.filter((spell: any) => spell.level === 0);
  const leveledSpells = classSpellList.filter(
    (spell: any) => spell.level > 0 && spell.level <= maxSpellLevel,
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-5xl mx-auto">
      <div className="text-center">
        <h3 className="text-3xl font-bold mb-3 flex items-center justify-center gap-3">
          <Wand2 className="text-primary h-8 w-8" />
          Choose Spells
        </h3>
        <p className="text-sm text-muted-foreground">
          {cls.name} uses {getSpellcastingInfo(cls).ability?.toUpperCase()} for spellcasting. Level{" "}
          {character.level} spells up to level {maxSpellLevel} are available. Choose up to{" "}
          {preparedLimit} prepared/known spell{preparedLimit === 1 ? "" : "s"}.
        </p>
      </div>

      {cantripLimit > 0 && (
        <SpellChoiceList
          title="Cantrips"
          spells={cantrips}
          selected={character.cantripChoices}
          limit={cantripLimit}
          exact
          onChange={(choices) => updateCharacter({ cantripChoices: choices })}
        />
      )}

      <SpellChoiceList
        title="Prepared / Known Spells"
        spells={leveledSpells}
        selected={character.preparedSpellChoices}
        limit={preparedLimit}
        onChange={(choices) => updateCharacter({ preparedSpellChoices: choices })}
      />
    </div>
  );
}

function StepReview({ character, validationIssues }: any) {
  const { backgrounds, classes, feats, spells, species, subclasses, classFeatures } =
    Route.useLoaderData();
  const race = species.find((r: any) => r.id === character.raceId);
  const background = backgrounds.find((b: any) => b.id === character.backgroundId);
  const cls = classes.find((c: any) => c.id === character.classId);
  const subclass = subclasses.find((s: any) => s.id === character.subclassId);
  const originFeat = background?.originFeatId
    ? feats.find((feat: any) => feat.id === background.originFeatId)
    : null;
  const classEquipment = getEquipmentOptions(cls?.startingEquipmentJson).find(
    (option) => option.id === character.classEquipmentOption,
  );
  const backgroundEquipment = getEquipmentOptions(
    getJsonField(background, "startingEquipmentJson", "starting_equipment_json"),
  ).find((option) => option.id === character.backgroundEquipmentOption);
  const selectedSkills = [
    ...character.speciesSkillChoices,
    ...formatList(getJsonField(background, "skillProficienciesJson", "skill_proficiencies_json"))
      .split(", ")
      .filter(Boolean),
    ...character.featChoices.skills,
    ...character.classSkillChoices,
  ];
  const selectedTools = [
    ...character.speciesToolChoices,
    ...character.backgroundToolChoices,
    ...character.featChoices.tools,
    ...character.classToolChoices,
  ];
  const selectedTraitChoices = Object.entries(character.speciesTraitChoices);
  const selectedFeatureChoices = getUnlockedFeatureOptionGroups(character, classFeatures)
    .map((group) => ({
      name: group.featureName,
      choices: character.featureChoices[group.featureId] || [],
    }))
    .filter((group) => group.choices.length > 0);
  const selectedCantrips = spells.filter((spell: any) =>
    character.cantripChoices.includes(spell.id),
  );
  const selectedPreparedSpells = spells.filter((spell: any) =>
    character.preparedSpellChoices.includes(spell.id),
  );
  const selectedFeatSpells = spells.filter(
    (spell: any) =>
      character.featChoices.cantrips.includes(spell.id) ||
      character.featChoices.spells.includes(spell.id),
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-3xl mx-auto">
      <div className="text-center p-8 bg-gradient-to-b from-primary/10 to-transparent rounded-3xl border border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 p-12 bg-accent/20 blur-[100px] rounded-full pointer-events-none" />

        <h2 className="text-5xl font-black tracking-tight bg-gradient-to-br from-white to-primary/50 bg-clip-text text-transparent mb-3 drop-shadow-sm">
          {character.name}
        </h2>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/50 backdrop-blur-md border border-border text-lg font-semibold text-muted-foreground shadow-sm">
          <span className="text-foreground">Level {character.level}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
          <span className="text-accent">{race?.name}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
          <span className="text-primary">{background?.name}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
          <span className="text-amber-500">{subclass ? subclass.name : cls?.name}</span>
        </div>
      </div>

      {validationIssues.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <h4 className="font-bold text-destructive mb-2">Finish Before Saving</h4>
          <ul className="space-y-1 text-sm text-foreground/90">
            {validationIssues.map((issue: string) => (
              <li key={issue}>- {issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 my-8">
        {ABILITIES.map((ab) => {
          const base = character.abilities[ab];
          const backgroundBonus = character.abilityBonuses[ab] || 0;
          const total = base + backgroundBonus;
          const mod = Math.floor((total - 10) / 2);
          return (
            <div
              key={ab}
              className="bg-card/60 backdrop-blur-sm border border-border/40 p-3 rounded-xl flex flex-col items-center justify-center relative overflow-hidden shadow-sm"
            >
              <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">
                {ab}
              </div>
              <div className="text-2xl font-black text-foreground">{total}</div>
              {backgroundBonus > 0 && (
                <div className="text-[10px] text-accent font-bold">+{backgroundBonus}</div>
              )}
              <div
                className={`absolute bottom-0 left-0 w-full h-1 ${mod > 0 ? "bg-emerald-500/50" : mod < 0 ? "bg-destructive/50" : "bg-transparent"}`}
              />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border/40">
          <CardHeader>
            <CardTitle>Origin</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <span className="font-bold text-foreground">Species:</span> {race?.name}
            </p>
            <p>
              <span className="font-bold text-foreground">Background:</span> {background?.name}
            </p>
            {originFeat && (
              <p>
                <span className="font-bold text-foreground">Origin Feat:</span> {originFeat.name}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/40">
          <CardHeader>
            <CardTitle>Class Path</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <span className="font-bold text-foreground">Class:</span> {cls?.name}
            </p>
            <p>
              <span className="font-bold text-foreground">Subclass:</span>{" "}
              {subclass?.name || "Not chosen yet"}
            </p>
            <p>
              <span className="font-bold text-foreground">Hit Die:</span> d{cls?.hitDice}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-border/40">
        <CardHeader>
          <CardTitle>Choices</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <span className="font-bold text-foreground">Skills:</span>{" "}
            {Array.from(new Set(selectedSkills)).join(", ") || "None"}
          </p>
          <p>
            <span className="font-bold text-foreground">Tools:</span>{" "}
            {Array.from(new Set(selectedTools)).join(", ") || "None"}
          </p>
          {selectedTraitChoices.length > 0 && (
            <p>
              <span className="font-bold text-foreground">Species Traits:</span>{" "}
              {selectedTraitChoices.map(([, value]) => value).join(", ")}
            </p>
          )}
          {selectedFeatureChoices.length > 0 && (
            <p>
              <span className="font-bold text-foreground">Feature Choices:</span>{" "}
              {selectedFeatureChoices
                .map((group) => `${group.name}: ${group.choices.join(", ")}`)
                .join(" | ")}
            </p>
          )}
          <p>
            <span className="font-bold text-foreground">Equipment:</span>{" "}
            {[backgroundEquipment, classEquipment]
              .filter((option): option is { id: string; summary: string } => Boolean(option))
              .map((option) => `${option.id}: ${option.summary}`)
              .join(" | ")}
          </p>
        </CardContent>
      </Card>

      {(selectedCantrips.length > 0 ||
        selectedPreparedSpells.length > 0 ||
        selectedFeatSpells.length > 0) && (
        <Card className="bg-card/50 border-border/40">
          <CardHeader>
            <CardTitle>Spellbook</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            {selectedCantrips.length > 0 && (
              <p>
                <span className="font-bold text-foreground">Cantrips:</span>{" "}
                {selectedCantrips.map((spell: any) => spell.name).join(", ")}
              </p>
            )}
            {selectedPreparedSpells.length > 0 && (
              <p>
                <span className="font-bold text-foreground">Prepared / Known:</span>{" "}
                {selectedPreparedSpells.map((spell: any) => spell.name).join(", ")}
              </p>
            )}
            {selectedFeatSpells.length > 0 && (
              <p>
                <span className="font-bold text-foreground">Feat Spells:</span>{" "}
                {selectedFeatSpells.map((spell: any) => spell.name).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="bg-secondary/30 p-6 rounded-2xl border border-border/30 backdrop-blur-sm">
        <div className="flex gap-4 items-start">
          <div className="bg-primary/20 p-3 rounded-full shrink-0">
            <Save className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1">Your Journey Begins</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you save, this character will be forged natively and instantly materialized into
              your party roster. You can manage their health, inventory, and stats from the main
              dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
