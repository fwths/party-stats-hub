import { useState } from "react";
import { Search, ShieldAlert, Swords, Moon, Shield, Info, HelpCircle } from "lucide-react";

interface RuleItem {
  id: string;
  name: string;
  category: "conditions" | "actions" | "rest_cover";
  summary: string;
  details: string[];
  effects?: string[]; // Quick status effects tags
}

const RULES_DATA: RuleItem[] = [
  // --- CONDITIONS ---
  {
    id: "blinded",
    name: "Blinded",
    category: "conditions",
    summary: "Cannot see; automatically fails sight checks. Attacks have advantage against you; your attacks have disadvantage.",
    effects: ["Sights Checks Fail", "Incoming Attacks Advantage", "Outgoing Attacks Disadvantage"],
    details: [
      "A blinded creature can't see and automatically fails any ability check that requires sight.",
      "Attack rolls against the creature have advantage.",
      "The creature's attack rolls have disadvantage."
    ]
  },
  {
    id: "charmed",
    name: "Charmed",
    category: "conditions",
    summary: "Cannot attack the charmer. Charmer has advantage on social interactions with you.",
    effects: ["Cannot Attack Charmer", "Charmer Social Advantage"],
    details: [
      "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.",
      "The charmer has advantage on any ability check to interact socially with the creature."
    ]
  },
  {
    id: "deafened",
    name: "Deafened",
    category: "conditions",
    summary: "Cannot hear; automatically fails hearing checks.",
    effects: ["Hearing Checks Fail"],
    details: [
      "A deafened creature can't hear and automatically fails any ability check that requires hearing."
    ]
  },
  {
    id: "frightened",
    name: "Frightened",
    category: "conditions",
    summary: "Disadvantage on checks/attacks while source is in sight. Cannot willingly move closer to the source.",
    effects: ["Fear Disadvantage", "Movement Restricted"],
    details: [
      "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.",
      "The creature can't willingly move closer to the source of its fear."
    ]
  },
  {
    id: "grappled",
    name: "Grappled",
    category: "conditions",
    summary: "Speed becomes 0. Ends if grappled creature is moved or grappler becomes incapacitated.",
    effects: ["Speed 0"],
    details: [
      "A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed.",
      "The condition ends if the grappler is incapacitated.",
      "The condition also ends if an effect removes the grappled creature from the reach of the grappler or grappling effect (such as being hurled away by the Thunderwave spell)."
    ]
  },
  {
    id: "incapacitated",
    name: "Incapacitated",
    category: "conditions",
    summary: "Cannot take actions or reactions.",
    effects: ["No Actions", "No Reactions"],
    details: [
      "An incapacitated creature can't take actions or reactions.",
      "Certain spells and class features are automatically suppressed or broken while incapacitated."
    ]
  },
  {
    id: "invisible",
    name: "Invisible",
    category: "conditions",
    summary: "Impossible to see without magic/truesight. Attacks have disadvantage; your attacks have advantage.",
    effects: ["Unseen", "Incoming Attacks Disadvantage", "Outgoing Attacks Advantage"],
    details: [
      "An invisible creature is impossible to see without the aid of magic or a special sense.",
      "For the purpose of hiding, the creature is heavily obscured. The creature's location can be detected by any noise it makes or tracks it leaves.",
      "Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage."
    ]
  },
  {
    id: "paralyzed",
    name: "Paralyzed",
    category: "conditions",
    summary: "Incapacitated and cannot move/speak. Auto-fail STR/DEX saves. Attacks within 5ft critical hit.",
    effects: ["Incapacitated", "Speed 0", "Auto-fail STR/DEX", "Critical Hits within 5ft"],
    details: [
      "A paralyzed creature is incapacitated and can't move or speak.",
      "The creature automatically fails Strength and Dexterity saving throws.",
      "Attack rolls against the creature have advantage.",
      "Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature."
    ]
  },
  {
    id: "petrified",
    name: "Petrified",
    category: "conditions",
    summary: "Turned to stone. Incapacitated, unaware, weight x10. Resistance to all damage; immune to poison/disease.",
    effects: ["Turned to Stone", "Incapacitated", "Auto-fail STR/DEX", "All Damage Resistance", "Poison/Disease Immune"],
    details: [
      "A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging.",
      "The creature is incapacitated, can't move or speak, and is unaware of its surroundings.",
      "Attack rolls against the creature have advantage.",
      "The creature automatically fails Strength and Dexterity saving throws.",
      "The creature has resistance to all damage.",
      "The creature is immune to poison and disease (poisons/diseases already in system are suspended, not cured)."
    ]
  },
  {
    id: "poisoned",
    name: "Poisoned",
    category: "conditions",
    summary: "Disadvantage on attack rolls and ability checks.",
    effects: ["Attack Disadvantage", "Checks Disadvantage"],
    details: [
      "A poisoned creature has disadvantage on attack rolls and ability checks."
    ]
  },
  {
    id: "prone",
    name: "Prone",
    category: "conditions",
    summary: "Can only crawl. Attack rolls have disadvantage. Incoming attacks within 5ft have advantage, others have disadvantage.",
    effects: ["Crawling Move", "Attack Disadvantage", "Melee Hit Advantage", "Ranged Hit Disadvantage"],
    details: [
      "A prone creature's only movement option is to crawl, unless it stands up (which costs half its speed).",
      "The creature has disadvantage on attack rolls.",
      "An attack roll against the creature has advantage if the attacker is within 5 feet. Otherwise, the attack roll has disadvantage."
    ]
  },
  {
    id: "restrained",
    name: "Restrained",
    category: "conditions",
    summary: "Speed 0. Attacks against have advantage; your attacks have disadvantage. Disadvantage on DEX saves.",
    effects: ["Speed 0", "Incoming Attacks Advantage", "Outgoing Attacks Disadvantage", "DEX Saves Disadvantage"],
    details: [
      "A restrained creature's speed becomes 0, and it can't benefit from any speed bonuses.",
      "Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
      "The creature has disadvantage on Dexterity saving throws."
    ]
  },
  {
    id: "stunned",
    name: "Stunned",
    category: "conditions",
    summary: "Incapacitated, cannot move, can only whisper. Auto-fail STR/DEX saves. Attacks against have advantage.",
    effects: ["Incapacitated", "Speed 0", "Auto-fail STR/DEX", "Incoming Attacks Advantage"],
    details: [
      "A stunned creature is incapacitated, can't move, and can speak only in faltering whispers.",
      "The creature automatically fails Strength and Dexterity saving throws.",
      "Attack rolls against the creature have advantage."
    ]
  },
  {
    id: "unconscious",
    name: "Unconscious",
    category: "conditions",
    summary: "Incapacitated, drops items, falls prone. Auto-fail STR/DEX saves. Attacks against within 5ft critical hit.",
    effects: ["Incapacitated", "Falls Prone", "Auto-fail STR/DEX", "Incoming Attacks Advantage", "Critical Hits within 5ft"],
    details: [
      "An unconscious creature is incapacitated, can't move or speak, and is unaware of its surroundings.",
      "The creature drops whatever it's holding and falls prone.",
      "The creature automatically fails Strength and Dexterity saving throws.",
      "Attack rolls against the creature have advantage.",
      "Any attack that hits the creature is a critical hit if the attacker is within 5 feet."
    ]
  },
  {
    id: "exhaustion",
    name: "Exhaustion",
    category: "conditions",
    summary: "Accumulated weariness in 6 levels. Speed reductions and disadvantage on checks/saves.",
    effects: ["Cumulative Penalties", "Death at Level 6"],
    details: [
      "Level 1: Disadvantage on ability checks",
      "Level 2: Speed halved",
      "Level 3: Disadvantage on attack rolls and saving throws",
      "Level 4: Hit point maximum halved",
      "Level 5: Speed reduced to 0",
      "Level 6: Death",
      "Note (2024 Rules Streamline): Exhaustion has 6 levels. Each level decreases speed by 5 feet and imposes a -1 penalty to all D20 rolls (attacks, checks, saves). At level 6, the creature dies."
    ]
  },

  // --- ACTIONS ---
  {
    id: "attack",
    name: "Attack",
    category: "actions",
    summary: "Make a melee or ranged weapon attack, or multiple if you have Extra Attack.",
    details: [
      "Choose a target within your weapon's range: a creature, an object, or a location.",
      "Roll 1d20 + Ability Modifier (STR for melee, DEX for ranged) + Proficiency Bonus (if proficient).",
      "If the roll meets or exceeds target AC, you hit and roll damage dice."
    ]
  },
  {
    id: "cast_spell",
    name: "Cast a Spell",
    category: "actions",
    summary: "Cast a spell with a casting time of 1 action.",
    details: [
      "The spell's components (Verbal, Somatic, Material) must be met.",
      "Follow the range, targeting, and spell level rules as described in the spell's description."
    ]
  },
  {
    id: "dash",
    name: "Dash",
    category: "actions",
    summary: "Gain extra movement for the current turn equal to your speed.",
    details: [
      "When you take the Dash action, you gain extra movement for the current turn.",
      "The increase equals your speed after applying any modifiers.",
      "Any increase or reduction to your speed changes this extra movement by the same amount."
    ]
  },
  {
    id: "disengage",
    name: "Disengage",
    category: "actions",
    summary: "Prevent opportunity attacks during your movement for the rest of your turn.",
    details: [
      "If you take the Disengage action, your movement doesn't provoke opportunity attacks for the rest of the turn."
    ]
  },
  {
    id: "dodge",
    name: "Dodge",
    category: "actions",
    summary: "Focus on defense. Attacks against you have disadvantage; DEX saves have advantage.",
    details: [
      "Until the start of your next turn, any attack roll made against you has disadvantage if you can see the attacker.",
      "You make Dexterity saving throws with advantage.",
      "You lose this benefit if you are incapacitated or if your speed drops to 0."
    ]
  },
  {
    id: "help",
    name: "Help",
    category: "actions",
    summary: "Give an ally advantage on a check, or advantage on an attack roll against a target within 5ft.",
    details: [
      "You aid another creature. The creature you aid gains advantage on the next ability check it makes to perform the task.",
      "Alternatively, you can aid a friendly creature in attacking a target within 5 feet of you. You feint or distract, giving advantage on the ally's first attack roll."
    ]
  },
  {
    id: "hide",
    name: "Hide",
    category: "actions",
    summary: "Make a Dexterity (Stealth) check to hide from sight/hearing.",
    details: [
      "You make a Dexterity (Stealth) check in an attempt to hide.",
      "You must not be clearly seen. If you succeed, you are considered unseen and unheard, giving you advantage on attack rolls and attacks against you have disadvantage."
    ]
  },
  {
    id: "ready",
    name: "Ready",
    category: "actions",
    summary: "Set a trigger condition and an action to execute as a reaction when triggered.",
    details: [
      "Choose a perceivable trigger condition (e.g., 'If the goblin walks through the door...').",
      "Choose the action you will take in response, or choose to move up to your speed.",
      "If you ready a spell, you cast it on your turn but hold its energy as a reaction (requires Concentration)."
    ]
  },
  {
    id: "search",
    name: "Search",
    category: "actions",
    summary: "Dedicate your attention to finding something with a Perception or Investigation check.",
    details: [
      "Depending on the nature of what you are looking for, the DM might ask you to make a Wisdom (Perception) check or an Intelligence (Investigation) check."
    ]
  },
  {
    id: "use_object",
    name: "Use an Object",
    category: "actions",
    summary: "Interact with an object that requires your action (e.g., drink a potion, open locks).",
    details: [
      "You normally interact with one object for free during movement or an action. When an object requires an action to use, you take this action."
    ]
  },

  // --- RESTING & COVER ---
  {
    id: "half_cover",
    name: "Half Cover",
    category: "rest_cover",
    summary: "+2 bonus to AC and Dexterity saving throws.",
    effects: ["+2 AC", "+2 DEX Saves"],
    details: [
      "A target with half cover has a +2 bonus to AC and Dexterity saving throws.",
      "A target has half cover if an obstacle blocks at least half of its body. Examples include a low wall, a large piece of furniture, or another creature."
    ]
  },
  {
    id: "three_quarters_cover",
    name: "Three-Quarters Cover",
    category: "rest_cover",
    summary: "+5 bonus to AC and Dexterity saving throws.",
    effects: ["+5 AC", "+5 DEX Saves"],
    details: [
      "A target with three-quarters cover has a +5 bonus to AC and Dexterity saving throws.",
      "A target has three-quarters cover if about three-quarters of it is covered by an obstacle. Examples include a portcullis, an arrow slit, or a thick tree trunk."
    ]
  },
  {
    id: "total_cover",
    name: "Total Cover",
    category: "rest_cover",
    summary: "Cannot be targeted directly by attacks or spells.",
    effects: ["Untargetable"],
    details: [
      "A target with total cover cannot be targeted directly by an attack or a spell.",
      "Spells that include the target in an area of effect can still affect it.",
      "A target has total cover if it is completely concealed by an obstacle."
    ]
  },
  {
    id: "short_rest",
    name: "Short Rest",
    category: "rest_cover",
    summary: "1-hour downtime to tend wounds. Spend Hit Dice to heal (Roll HD + CON modifier).",
    details: [
      "A Short Rest is a period of downtime, at least 1 hour long, during which a character does nothing more strenuous than eating, drinking, reading, and tending to wounds.",
      "A character can spend one or more Hit Dice. For each die rolled, add your Constitution modifier and regain that many HP.",
      "You decide to spend hit dice one at a time."
    ]
  },
  {
    id: "long_rest",
    name: "Long Rest",
    category: "rest_cover",
    summary: "8-hour sleep/light activity. Restores all HP, slots, and half of spent Hit Dice.",
    details: [
      "A Long Rest is a period of extended downtime, at least 8 hours long, during which a character sleeps for at least 6 hours and performs no more than 2 hours of light activity (reading, talking, standing watch).",
      "Regain all lost Hit Points.",
      "Regain spent Hit Dice up to half of your maximum hit dice amount (minimum of 1).",
      "Spell slots and once-per-long-rest class abilities are completely restored.",
      "A character cannot benefit from more than one Long Rest in a 24-hour period."
    ]
  }
];

export default function RulesReference() {
  const [activeTab, setActiveTab] = useState<RuleItem["category"]>("conditions");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRuleId, setSelectedRuleId] = useState<string>("blinded");

  // Filters rules based on active category tab & search query
  const filteredRules = RULES_DATA.filter((rule) => {
    const matchesSearch =
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = rule.category === activeTab;
    return matchesSearch && matchesTab;
  });

  // Find currently selected rule detail
  const selectedRule = RULES_DATA.find((r) => r.id === selectedRuleId) || RULES_DATA[0];

  const getTabIcon = (cat: RuleItem["category"]) => {
    switch (cat) {
      case "conditions":
        return <ShieldAlert size={15} />;
      case "actions":
        return <Swords size={15} />;
      case "rest_cover":
        return <Shield size={15} />;
    }
  };

  const getTabLabel = (cat: RuleItem["category"]) => {
    switch (cat) {
      case "conditions":
        return "Conditions";
      case "actions":
        return "Combat Actions";
      case "rest_cover":
        return "Rest & Cover";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* SIDEBAR COL: Search + Selection Lists */}
      <div className="lg:col-span-4 flex flex-col card-arcane rounded-xl border border-border p-4 shadow-xl select-none">
        {/* Search Header */}
        <div className="relative mb-3.5">
          <Search size={15} className="absolute left-3 top-3 text-muted-foreground/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rules glossary..."
            className="w-full rounded-lg bg-secondary/15 border border-border/40 focus:border-gold/50 focus:ring-1 focus:ring-gold/20 pl-9 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none transition-all duration-300"
          />
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-border/40 pb-2 mb-3 gap-1">
          {(["conditions", "actions", "rest_cover"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                // Auto-select the first rule in the selected category
                const firstOfTab = RULES_DATA.find((r) => r.category === tab);
                if (firstOfTab) {
                  setSelectedRuleId(firstOfTab.id);
                }
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === tab
                  ? "bg-gold/15 border border-gold/30 text-gold shadow-[0_0_8px_rgba(212,175,55,0.08)]"
                  : "bg-secondary/10 border border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20"
              }`}
            >
              {getTabIcon(tab)}
              <span className="hidden sm:inline">{getTabLabel(tab)}</span>
            </button>
          ))}
        </div>

        {/* Rules Selection List */}
        <div className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-[440px] space-y-1.5 pr-1 custom-scrollbar">
          {filteredRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground italic text-xs">
              <HelpCircle size={20} className="opacity-25 mb-1.5" />
              <span>No matching rules found.</span>
            </div>
          ) : (
            filteredRules.map((rule) => (
              <button
                key={rule.id}
                onClick={() => setSelectedRuleId(rule.id)}
                className={`w-full text-left rounded-lg p-2.5 transition-all duration-200 cursor-pointer border ${
                  selectedRuleId === rule.id
                    ? "bg-gold/5 border-gold/40 shadow-[0_0_6px_rgba(212,175,55,0.05)]"
                    : "bg-secondary/5 border-border/20 hover:bg-secondary/15 hover:border-border/40"
                }`}
              >
                <div className="font-semibold text-xs text-foreground mb-0.5">
                  {rule.name}
                </div>
                <div className="text-[10px] text-muted-foreground line-clamp-1 leading-normal">
                  {rule.summary}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* DETAIL COL: Full Rule Content Rendering */}
      <div className="lg:col-span-8 flex flex-col card-arcane rounded-xl border border-border p-5 shadow-xl transition-all duration-300">
        <div className="border-b border-border/40 pb-3 mb-4 select-none flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-gold" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Rule Details
            </h2>
          </div>
          <span className="rounded-md bg-secondary border border-border/40 px-2 py-0.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
            {getTabLabel(selectedRule.category)}
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground bg-gradient-to-r from-gold via-yellow-300 to-amber-500 bg-clip-text text-transparent mb-1 flex items-center gap-2">
              {selectedRule.name}
            </h1>
            <p className="text-xs text-muted-foreground italic mb-4 leading-relaxed border-l-2 border-gold/30 pl-3">
              {selectedRule.summary}
            </p>

            {/* Quick tag flags */}
            {selectedRule.effects && selectedRule.effects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5 select-none">
                {selectedRule.effects.map((eff, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-rose-400 tracking-wide"
                  >
                    {eff}
                  </span>
                ))}
              </div>
            )}

            {/* Detail points */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                Mechanics & Rules
              </h3>
              <ul className="space-y-2.5">
                {selectedRule.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold flex-shrink-0 shadow-[0_0_4px_var(--gold)]" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick Warning / Tip footer */}
          <div className="mt-8 rounded-lg bg-secondary/15 border border-border/30 p-3 select-none flex items-start gap-2.5">
            <ShieldAlert size={14} className="text-gold mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-normal">
              Always defer to the Dungeon Master's ruling. D&D 5e mechanics can vary based on campaign overrides, table rules, and chosen sourcebooks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
