import { BookOpen, Flame, Moon, Skull, RefreshCw, Shield, Layers, Eye, Heart } from "lucide-react";

const SCHOOL_THEMES: Record<
  string,
  {
    color: string;
    bg: string;
    text: string;
    border: string;
    glow: string;
    icon: any;
  }
> = {
  abjuration: {
    color: "ui-cyan",
    bg: "bg-ui-cyan/10",
    text: "text-ui-cyan",
    border: "border-ui-cyan/30",
    glow: "shadow-ui-cyan/20",
    icon: Shield,
  },
  conjuration: {
    color: "ui-orange",
    bg: "bg-ui-orange/10",
    text: "text-ui-orange",
    border: "border-ui-orange/30",
    glow: "shadow-ui-orange/20",
    icon: Layers,
  },
  divination: {
    color: "ui-indigo",
    bg: "bg-ui-indigo/10",
    text: "text-ui-indigo",
    border: "border-ui-indigo/30",
    glow: "shadow-ui-indigo/20",
    icon: Eye,
  },
  enchantment: {
    color: "ui-pink",
    bg: "bg-ui-pink/10",
    text: "text-ui-pink",
    border: "border-ui-pink/30",
    glow: "shadow-ui-pink/20",
    icon: Heart,
  },
  evocation: {
    color: "ui-red",
    bg: "bg-ui-red/10",
    text: "text-ui-red",
    border: "border-ui-red/30",
    glow: "shadow-ui-red/20",
    icon: Flame,
  },
  illusion: {
    color: "ui-purple",
    bg: "bg-ui-purple/10",
    text: "text-ui-purple",
    border: "border-ui-purple/30",
    glow: "shadow-ui-purple/20",
    icon: Moon,
  },
  necromancy: {
    color: "ui-emerald",
    bg: "bg-ui-emerald/10",
    text: "text-ui-emerald",
    border: "border-ui-emerald/30",
    glow: "shadow-ui-emerald/20",
    icon: Skull,
  },
  transmutation: {
    color: "ui-amber",
    bg: "bg-ui-amber/10",
    text: "text-ui-amber",
    border: "border-ui-amber/30",
    glow: "shadow-ui-amber/20",
    icon: RefreshCw,
  },
};

export const getSchoolTheme = (schoolName?: string) => {
  const normalized = schoolName?.toLowerCase() || "";
  return (
    SCHOOL_THEMES[normalized] || {
      color: "muted",
      bg: "bg-muted/30",
      text: "text-muted-foreground",
      border: "border-border/50",
      glow: "shadow-border/10",
      icon: BookOpen,
    }
  );
};

export function MagicalSealWatermark({ school }: { school?: string }) {
  const normalized = school?.toLowerCase() || "";

  const renderGeometry = () => {
    switch (normalized) {
      case "abjuration":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="70"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="3 3"
            />
            <polygon
              points="100,20 180,60 180,140 100,180 20,140 20,60"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <polygon
              points="100,35 160,65 160,135 100,165 40,135 40,65"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
              strokeDasharray="5 2"
            />
            <circle cx="100" cy="100" r="25" stroke="currentColor" strokeWidth="1" fill="none" />
            <path
              d="M 100 10 L 100 190 M 10 100 L 190 100"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.5"
            />
          </>
        );
      case "evocation":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" fill="none" />
            <polygon
              points="100,15 173,142 27,142"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <polygon
              points="100,185 27,58 173,58"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <line
              x1="100"
              y1="10"
              x2="100"
              y2="190"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeDasharray="4 4"
            />
            <line
              x1="10"
              y1="100"
              x2="190"
              y2="100"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeDasharray="4 4"
            />
            <line x1="36" y1="36" x2="164" y2="164" stroke="currentColor" strokeWidth="0.75" />
            <line x1="164" y1="36" x2="36" y2="164" stroke="currentColor" strokeWidth="0.75" />
            <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
          </>
        );
      case "divination":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="85"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="10 5 2 5"
            />
            <circle cx="100" cy="100" r="65" stroke="currentColor" strokeWidth="0.75" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="45"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="2 2"
            />
            <path
              d="M 50 100 Q 100 60 150 100 Q 100 140 50 100 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <circle cx="100" cy="100" r="20" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <circle cx="100" cy="100" r="8" fill="currentColor" />
            <path
              d="M 100 10 L 100 45 M 100 155 L 100 190 M 10 100 L 45 100 M 155 100 L 190 100"
              stroke="currentColor"
              strokeWidth="1"
            />
          </>
        );
      case "enchantment":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="100" cy="100" r="75" stroke="currentColor" strokeWidth="0.5" fill="none" />
            <path
              d="M 100 20 C 140 20, 180 60, 180 100 C 180 140, 140 180, 100 180 C 60 180, 20 140, 20 100 C 20 60, 60 20, 100 20 Z"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
              transform="rotate(15 100 100)"
            />
            <path
              d="M 100 20 C 140 20, 180 60, 180 100 C 180 140, 140 180, 100 180 C 60 180, 20 140, 20 100 C 20 60, 60 20, 100 20 Z"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
              transform="rotate(45 100 100)"
            />
            <path
              d="M 100 20 C 140 20, 180 60, 180 100 C 180 140, 140 180, 100 180 C 60 180, 20 140, 20 100 C 20 60, 60 20, 100 20 Z"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
              transform="rotate(75 100 100)"
            />
            <circle
              cx="100"
              cy="100"
              r="35"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              strokeDasharray="3 1"
            />
            <circle cx="100" cy="100" r="15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </>
        );
      case "illusion":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="82"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="15 3 3 3"
            />
            <path
              d="M 80 40 A 60 60 0 0 0 80 160 A 50 50 0 0 1 80 40"
              stroke="currentColor"
              strokeWidth="1.25"
              fill="none"
            />
            <path
              d="M 120 40 A 60 60 0 0 1 120 160 A 50 50 0 0 0 120 40"
              stroke="currentColor"
              strokeWidth="1.25"
              fill="none"
            />
            <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.75" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="20"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="2 4"
            />
            <polygon
              points="100,60 110,80 130,80 115,95 120,115 100,105 80,115 85,95 70,80 90,80"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
            />
          </>
        );
      case "necromancy":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1.25" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="75"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="1 5"
            />
            <polygon
              points="100,25 165,138 35,138"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            <polygon
              points="100,175 35,62 165,62"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            <circle cx="100" cy="25" r="4" fill="currentColor" />
            <circle cx="165" cy="138" r="4" fill="currentColor" />
            <circle cx="35" cy="138" r="4" fill="currentColor" />
            <circle cx="100" cy="175" r="4" fill="currentColor" />
            <circle cx="35" cy="62" r="4" fill="currentColor" />
            <circle cx="165" cy="62" r="4" fill="currentColor" />
            <path
              d="M 100 55 L 135 120 L 65 120 Z"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
            />
            <circle cx="100" cy="100" r="15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </>
        );
      case "transmutation":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="0.5" fill="none" />
            {Array.from({ length: 12 }).map((_, i) => (
              <path
                key={i}
                d="M 95 10 L 105 10 L 103 22 L 97 22 Z"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
                transform={`rotate(${i * 30} 100 100)`}
              />
            ))}
            <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.75" fill="none" />
            <path
              d="M 75 100 C 75 85, 90 85, 100 100 C 110 115, 125 115, 125 100 C 125 85, 110 85, 100 100 C 90 115, 75 115, 75 100 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <circle cx="100" cy="100" r="10" stroke="currentColor" strokeWidth="0.5" fill="none" />
          </>
        );
      case "conjuration":
      default:
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="85"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="4 4"
            />
            <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="0.75" fill="none" />
            <polygon
              points="100,20 120,80 180,100 120,120 100,180 80,120 20,100 80,80"
              stroke="currentColor"
              strokeWidth="1.25"
              fill="none"
            />
            <polygon
              points="100,20 120,80 180,100 120,120 100,180 80,120 20,100 80,80"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              transform="rotate(45 100 100)"
            />
            <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="15"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="1 1"
            />
          </>
        );
    }
  };

  const theme = getSchoolTheme(school);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none opacity-[0.05] dark:opacity-[0.07] z-0">
      <svg
        width="380"
        height="380"
        viewBox="0 0 200 200"
        className={`w-[380px] h-[380px] ${theme.text} animate-[spin_60s_linear_infinite]`}
      >
        {renderGeometry()}
      </svg>
    </div>
  );
}

export const RAGE_DICTIONARY: Record<string, string> = {
  Active:
    "Enter a standard Rage. You have Resistance to Bludgeoning, Piercing, and Slashing damage, Advantage on Strength checks and saving throws, and deal extra Rage damage on Strength-based attacks.",
  Bear: "While raging, you have Resistance to every damage type except Force, Necrotic, Psychic, and Radiant.",
  Eagle:
    "When you activate your Rage, you can take the Disengage and Dash actions as part of that Bonus Action. While active, you can take a Bonus Action to take both of those actions.",
  Wolf: "While raging, your allies have Advantage on melee attack rolls against any enemy of yours within 5 feet of you.",
  Elk: "While raging, your walking speed increases by 15 feet.",
  Tiger:
    "While raging, you can add 10 feet to your long jump distance and 3 feet to your high jump distance.",
};

export const TOTEM_ASPECT_DICTIONARY: Record<string, string> = {
  Bear: "You gain proficiency in Athletics or Survival (or expertise). Your carrying capacity is doubled, and you have advantage on Strength checks to push, pull, lift, or break things.",
  Eagle:
    "You gain proficiency in Perception or Survival (or expertise). You can see up to 1 mile away without difficulty, and dim light doesn't impose disadvantage on Wisdom (Perception) checks.",
  Elk: "Whether mounted or on foot, your travel pace is doubled, as is the travel pace of up to ten companions while they're within 60 feet of you.",
  Tiger: "You gain proficiency in Athletics, Acrobatics, Stealth, or Survival (or expertise).",
  Wolf: "You gain proficiency in Insight or Survival (or expertise). You can track other creatures while traveling at a fast pace, and move stealthily while traveling at normal pace.",
  Owl: "You gain proficiency in Investigation or Perception (or expertise). You gain Darkvision with a range of 60 feet (or +60 feet if you already have it).",
  Panther:
    "You gain a climbing speed equal to your walking speed. You also gain proficiency in Acrobatics or Stealth (or expertise).",
  Salmon:
    "You gain a swimming speed equal to your walking speed and can breathe underwater. You also gain proficiency in Athletics or Survival (or expertise).",
};

export const WEAPON_MASTERY_DICTIONARY: Record<string, string> = {
  "Battleaxe (Topple)":
    "If you hit a creature with this weapon, you can force it to make a Constitution saving throw (DC 8 + PB + ability modifier) or be knocked prone.",
  "Greataxe (Cleave)":
    "If you hit a creature with a melee attack, you can make a second attack against a different creature within 5 feet of the first target and in your reach. The second attack deals the weapon's base damage.",
  "Greatsword (Graze)":
    "If you miss a creature with an attack roll with this weapon, the target takes damage equal to the ability modifier you used for the attack roll.",
  "Halberd (Cleave)":
    "If you hit a creature with a melee attack, you can make a second attack against a different creature within 5 feet of the first target and in your reach. The second attack deals the weapon's base damage.",
  "Longsword (Sap)":
    "If you hit a creature with this weapon, the target has disadvantage on its next attack roll before the start of your next turn.",
  "Maul (Topple)":
    "If you hit a creature with this weapon, you can force it to make a Constitution saving throw (DC 8 + PB + ability modifier) or be knocked prone.",
  "Warhammer (Push)":
    "If you hit a creature with this weapon, you can push it up to 10 feet away from you.",
  "Shortsword (Vex)":
    "If you hit a creature with this weapon, you have advantage on your next attack roll against that creature before the end of your next turn.",
  "Rapier (Vex)":
    "If you hit a creature with this weapon, you have advantage on your next attack roll against that creature before the end of your next turn.",
  "Dagger (Nick)":
    "You can make the additional attack of Light weapon property as part of the Attack action instead of a Bonus Action.",
  "Scimitar (Nick)":
    "You can make the additional attack of Light weapon property as part of the Attack action instead of a Bonus Action.",
  "Longbow (Slow)":
    "If you hit a creature with this weapon, you can reduce its speed by 10 feet until the start of your next turn.",
  "Shortbow (Slow)":
    "If you hit a creature with this weapon, you can reduce its speed by 10 feet until the start of your next turn.",
  "Pistol (Vex)":
    "If you hit a creature with this weapon, you have advantage on your next attack roll against that creature before the end of your next turn.",
  "Musket (Slow)":
    "If you hit a creature with this weapon, you can reduce its speed by 10 feet until the start of your next turn.",
};

export const METAMAGIC_DICTIONARY: Record<string, string> = {
  "Careful Spell":
    "When you cast a spell that forces other creatures to make a saving throw, you can protect some of those creatures from the spell's full effects. Spend 1 Sorcery Point and choose a number of those creatures up to your Charisma modifier (minimum of one). A chosen creature automatically succeeds on its saving throw.",
  "Distant Spell":
    "When you cast a spell that has a range of 5 feet or greater, you can protect/double the range of the spell. When you cast a spell that has a range of touch, you can spend 1 Sorcery Point to make the range of the spell 30 feet.",
  "Empowered Spell":
    "When you roll damage for a spell, you can spend 1 Sorcery Point to reroll a number of the damage dice up to your Charisma modifier (minimum of one). You must use the new rolls.",
  "Extended Spell":
    "When you cast a spell that has a duration of 1 minute or longer, you can spend 1 Sorcery Point to double its duration, to a maximum duration of 24 hours.",
  "Heightened Spell":
    "When you cast a spell that forces a creature to make a saving throw to resist its effects, you can spend 3 Sorcery Points to give one target of the spell disadvantage on its first saving throw made against the spell.",
  "Quickened Spell":
    "When you cast a spell that has a casting time of 1 action, you can spend 2 Sorcery Points to change the casting time to 1 bonus action for this casting.",
  "Seeking Spell":
    "If you make an attack roll for a spell and miss, you can spend 2 Sorcery Points to reroll the d20, and you must use the new roll.",
  "Subtle Spell":
    "When you cast a spell, you can spend 1 Sorcery Point to cast it without any somatic or verbal components.",
  "Transmuted Spell":
    "When you cast a spell that deals a type of damage from the following list, you can spend 1 Sorcery Point to change that damage type to another one from the list: Acid, Cold, Fire, Lightning, Poison, Thunder.",
  "Twinned Spell":
    "When you cast a spell that targets only one creature and doesn't have a range of self, you can spend a number of Sorcery Points equal to the spell's level to target a second creature in range with the same spell (1 Sorcery Point if the spell is a cantrip).",
};
