import { useState } from "react";
import { useLoaderData } from "@tanstack/react-router";
import { User, BookOpen, Swords, Dices, Wand2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ABILITIES,
  ABILITY_NAMES,
  DRAGON_DAMAGE_BY_ANCESTRY,
  ClassTheme,
  CLASS_THEMES,
  DEFAULT_THEME,
} from "./BuilderConstants";
import {
  BuilderState,
  ChoiceGroup,
  TraitChoiceGroup,
  FeatureOptionGroup,
  getSourceLabel,
  getJsonField,
  getBackgroundAbilityOptions,
  getDefaultBackgroundBonuses,
  setBackgroundBonus,
  getSubclassChoiceLevel,
  formatList,
  normalizeChoiceName,
  getSpeciesTraitGroups,
  getProficiencyChoiceGroups,
  getToolChoiceGroups,
  getLanguageChoiceGroups,
  getLanguageOptions,
  getFixedLanguages,
  toggleChoice,
  getEquipmentOptions,
  isSpellcaster,
  getCantripLimit,
  getMaxSpellLevel,
  getPreparedSpellLimit,
  spellSummary,
  emptyFeatChoices,
  getClassSpellOptions,
  getUnlockedFeatureOptionGroups,
  formatAbilitySummary,
  formatSensesSummary,
  formatPrimaryAbility,
  parseJsonValue,
  getSpellcastingInfo,
  getFeatChoiceLevels,
  getPointsUsed,
  getClassCantripChoices,
  getClassPreparedSpellChoices,
  getSpellcasters,
  getSkillOptionsFromDb,
  getToolOptionsFromDb,
  getArtisanToolOptions,
} from "./BuilderUtils";
import { spellcastingToRuleChoicesAndGrants } from "../../lib/rules/adapters/spells";
import { equipmentToRuleChoicesAndGrants } from "../../lib/rules/adapters/items";
import { speciesToRuleChoicesAndGrants } from "../../lib/rules/adapters/species";
import { backgroundToRuleChoicesAndGrants } from "../../lib/rules/adapters/backgrounds";
import { classToRuleChoicesAndGrants } from "../../lib/rules/adapters/classes";
import { RuleChoiceGroupPicker } from "./RuleChoiceGroupPicker";

interface StepProps {
  character: BuilderState;
  updateCharacter: (updates: Partial<BuilderState>) => void;
  theme?: ClassTheme;
}


export function ChoiceGroupPicker({
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

export function FeatureChoicePanel({
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

export function SpellChoiceList({
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



export function StepRace({ character, updateCharacter, theme }: StepProps) {
  const activeTheme = theme || DEFAULT_THEME;
  const { species, speciesVariants, languages, skills, mundaneGear, itemTypes } = useLoaderData({ from: "/builder" }) as any;
  const skillOptions = getSkillOptionsFromDb(skills);
  const toolOptions = getToolOptionsFromDb(mundaneGear, itemTypes);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Player's Handbook");
  const selectedRace = species.find((race: any) => race.id === character.raceId);
  const languageOptions = getLanguageOptions(languages);
  const subraces = (speciesVariants || []).filter((sv: any) => sv.speciesId === selectedRace?.id);
  const selectedSubrace = subraces.find((sv: any) => sv.id === character.speciesVariantId);

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
          onChange={(e) => updateCharacter({ name: e.target.value, playerName: e.target.value })}
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
                      speciesVariantId: null,

                      speciesSkillChoices: [],
                      speciesToolChoices: [],
                      speciesLanguageChoices: [],
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
            (subraces.length > 0 ||
              speciesToRuleChoicesAndGrants(selectedSubrace || selectedRace).choices.length > 0) && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {subraces.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-border/30 bg-secondary/20 p-4 md:col-span-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Subrace / Variant
                    </div>
                    <Select
                      value={character.speciesVariantId || ""}
                      onValueChange={(val) => updateCharacter({ speciesVariantId: val })}
                    >
                      <SelectTrigger className={`w-full bg-background border-border/60 ${activeTheme.ring || "focus:ring-emerald-500"} rounded text-xs shadow-sm h-10`}>
                        <SelectValue placeholder="Choose a subrace/variant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedRace && (
                          <SelectItem 
                            value="none" 
                            className="py-2 focus:bg-[var(--theme-focus-bg)] cursor-pointer"
                            style={{ '--theme-focus-bg': `${getThemeHex(activeTheme.text)}1a` } as React.CSSProperties}
                          >
                            <div className="font-bold text-muted-foreground">Standard {selectedRace.name} (No Variant)</div>
                          </SelectItem>
                        )}
                        {subraces.map((sub: any) => (
                          <SelectItem 
                            key={sub.id} 
                            value={sub.id} 
                            className="py-2 focus:bg-[var(--theme-focus-bg)] cursor-pointer"
                            style={{ '--theme-focus-bg': `${getThemeHex(activeTheme.text)}1a` } as React.CSSProperties}
                          >
                            <div className="font-bold text-amber-500">{sub.name}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedSubrace && (
                  <div className="space-y-3 rounded-xl border border-border/30 bg-secondary/20 p-4 md:col-span-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {selectedSubrace.name} Details
                    </div>
                    {selectedSubrace.description && (
                      <p className="text-xs text-foreground/75 leading-relaxed bg-background/30 p-2.5 rounded-lg border border-border/20">
                        {selectedSubrace.description}
                      </p>
                    )}
                    {selectedSubrace.featuresJson && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80">Features</div>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                          {JSON.parse(selectedSubrace.featuresJson).map((feat: any, idx: number) => (
                            <div key={idx} className="text-xs">
                              <span className="font-extrabold italic text-amber-500 mr-1">{feat.name}.</span>
                              <span className="text-foreground/80">{feat.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <RuleChoiceGroupPicker
                  groups={speciesToRuleChoicesAndGrants(selectedSubrace || selectedRace).choices}
                  globalOptions={{ skills: skillOptions, tools: toolOptions, languages: getLanguageOptions(languages) }}
                  selected={character.ruleChoices || {}}
                  onChange={(groupId, choiceList) => {
                    updateCharacter({
                      ruleChoices: {
                        ...(character.ruleChoices || {}),
                        [groupId]: choiceList,
                      },
                    });
                  }}
                />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export function StepBackground({ character, updateCharacter }: StepProps) {
  const { backgrounds, feats, languages, mundaneGear, itemTypes } = useLoaderData({ from: "/builder" }) as any;
  const toolOptions = getToolOptionsFromDb(mundaneGear, itemTypes);
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
    toolOptions,
  );
  const backgroundLanguageRaw = getJsonField(
    selectedBackground,
    "languageProficienciesJson",
    "language_proficiencies_json",
  );
  const fixedBackgroundLanguages = getFixedLanguages(backgroundLanguageRaw);
  const backgroundLanguageGroups = getLanguageChoiceGroups(
    backgroundLanguageRaw,
    getLanguageOptions(languages),
  );
  const { choices: backgroundEquipmentGroups } = equipmentToRuleChoicesAndGrants(
    getJsonField(selectedBackground, "startingEquipmentJson", "starting_equipment_json"),
    selectedBackground?.id || "",
    selectedBackground?.name || "",
    "background"
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
                      backgroundLanguageChoices: [],
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
              <RuleChoiceGroupPicker
                groups={backgroundToRuleChoicesAndGrants(selectedBackground).choices}
                globalOptions={{ skills: skillOptions, tools: toolOptions, languages: getLanguageOptions(languages) }}
                selected={character.ruleChoices || {}}
                onChange={(groupId, choiceList) => {
                  updateCharacter({
                    ruleChoices: {
                      ...(character.ruleChoices || {}),
                      [groupId]: choiceList,
                    },
                  });
                }}
              />
            </div>
          )}
          {originFeat && (
            <div className="mt-4 border-t border-border/30 pt-4">
              <h4 className="text-lg font-bold mb-4">{originFeat.name} Choices</h4>
              <RuleChoiceGroupPicker
                groups={featToRuleChoicesAndGrants(originFeat, 1, []).choices}
                globalOptions={{ skills: skillOptions, tools: toolOptions, languages: getLanguageOptions(languages) }}
                selected={character.ruleChoices || {}}
                onChange={(groupId, choiceList) => {
                  updateCharacter({
                    ruleChoices: {
                      ...(character.ruleChoices || {}),
                      [groupId]: choiceList,
                    },
                  });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StepClass({ character, updateCharacter, theme }: StepProps) {
  const activeTheme = theme || DEFAULT_THEME;
  const { classes, subclasses, classFeatures, skills, mundaneGear, itemTypes } = useLoaderData({ from: "/builder" }) as any;
  const skillOptions = getSkillOptionsFromDb(skills);
  const toolOptions = getToolOptionsFromDb(mundaneGear, itemTypes);
  const availableSubclasses = subclasses.filter((s: any) => s.classId === character.classId);
  const subclassChoiceLevel =
    availableSubclasses.length > 0 ? getSubclassChoiceLevel(availableSubclasses) : 3;
  const selectedClass = classes.find((cls: any) => cls.id === character.classId);

  const featureOptionGroups = getUnlockedFeatureOptionGroups(character, classFeatures, skillOptions);

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
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(() => {
                const selectedSubclass = availableSubclasses.find((s: any) => s.id === character.subclassId);
                const subclassFeatures = selectedSubclass
                  ? (classFeatures || []).filter((cf: any) => cf.subclassId === selectedSubclass.id).sort((a: any, b: any) => a.levelRequired - b.levelRequired)
                  : [];
                return selectedSubclass ? (
                  <div className="mt-4 p-4 rounded-xl border bg-card/65 text-card-foreground shadow-lg max-w-xl animate-in fade-in slide-in-from-top-2 duration-300"
                       style={{ borderColor: `${getThemeHex(theme?.text)}33` }}>
                    <h4 className="text-base font-bold text-amber-500 mb-1">{selectedSubclass.name} Path</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">{selectedSubclass.description}</p>
                    
                    {subclassFeatures.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border/20 pb-1">Features Path</div>
                        <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                          {subclassFeatures.map((feat: any) => (
                            <div key={feat.id} className="text-xs space-y-0.5">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-foreground">{feat.name}</span>
                                <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground font-semibold">Level {feat.levelRequired}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{feat.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {(classToRuleChoicesAndGrants(selectedClass, true).choices.length > 0 ||
            featureOptionGroups.length > 0) && (
            <div className="mt-8 pt-6 border-t border-border/30 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <RuleChoiceGroupPicker
                  groups={classToRuleChoicesAndGrants(selectedClass, true).choices}
                  globalOptions={{ skills: skillOptions, tools: toolOptions, languages: getLanguageOptions(languages) }}
                  selected={character.ruleChoices || {}}
                  onChange={(groupId, choiceList) => {
                    updateCharacter({
                      ruleChoices: {
                        ...(character.ruleChoices || {}),
                        [groupId]: choiceList,
                      },
                    });
                  }}
                />
              </div>
              <FeatureChoicePanel
                groups={featureOptionGroups}
                selected={character.featureChoices}
                onChange={(choices) => updateCharacter({ featureChoices: choices })}
              />
            </div>
          )}

          {/* Multiclassing Section */}
          <div className="mt-10 pt-8 border-t border-border/30 bg-secondary/5 p-6 rounded-2xl border border-border/20 backdrop-blur-md">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className={`text-xl font-bold ${activeTheme.text}`}>Multiclassing</h4>
                <p className="text-xs text-muted-foreground">Add secondary classes to specialize your character path.</p>
              </div>
              <Button
                variant="outline"
                className={`${activeTheme.border} hover:${activeTheme.bg} ${activeTheme.text} font-semibold`}
                onClick={() => {
                  updateCharacter({
                    multiClasses: [...(character.multiClasses || []), { classId: "", subclassId: null, level: 1 }]
                  });
                }}
              >
                + Add Class
              </Button>
            </div>

            {(character.multiClasses || []).length > 0 && (
              <div className="space-y-6">
                {(character.multiClasses || []).map((mc, idx) => {
                  const availableMcClasses = classes.filter(
                    (cls: any) => cls.id !== character.classId && !(character.multiClasses || []).some((m, i) => i !== idx && m.classId === cls.id)
                  );
                  const mcSubclasses = subclasses.filter((sub: any) => sub.classId === mc.classId);
                  const mcSubclassChoiceLevel = mcSubclasses.length > 0 ? getSubclassChoiceLevel(mcSubclasses) : 3;

                  return (
                    <div key={idx} className="p-5 rounded-xl border border-border/30 bg-card/20 space-y-4 relative animate-in fade-in slide-in-from-top-2 duration-300">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-4 right-4 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          const updated = (character.multiClasses || []).filter((_, i) => i !== idx);
                          updateCharacter({ multiClasses: updated });
                        }}
                      >
                        Remove
                      </Button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Class
                          </label>
                          <Select
                            value={mc.classId || ""}
                            onValueChange={(val) => {
                              const updated = (character.multiClasses || []).map((m, i) => {
                                if (i === idx) {
                                  return { ...m, classId: val, subclassId: null };
                                }
                                return m;
                              });
                              updateCharacter({ multiClasses: updated });
                            }}
                          >
                            <SelectTrigger className={`w-full bg-background border-border/60 ${activeTheme.ring || "focus:ring-emerald-500"} rounded`}>
                              <SelectValue placeholder="Select a class..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {availableMcClasses.map((cls: any) => (
                                <SelectItem 
                                  key={cls.id} 
                                  value={cls.id} 
                                  className="py-2.5 focus:bg-[var(--theme-focus-bg)] cursor-pointer"
                                  style={{ '--theme-focus-bg': `${getThemeHex(activeTheme.text)}1a` } as React.CSSProperties}
                                >
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {mc.classId && (
                          <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              Level
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min="1"
                                max="20"
                                value={mc.level}
                                onChange={(e) => {
                                  const lvl = parseInt(e.target.value) || 1;
                                  const updated = (character.multiClasses || []).map((m, i) => {
                                    if (i === idx) {
                                      return {
                                        ...m,
                                        level: lvl,
                                        subclassId: lvl >= mcSubclassChoiceLevel ? m.subclassId : null
                                      };
                                    }
                                    return m;
                                  });
                                  updateCharacter({ multiClasses: updated });
                                }}
                                style={{ accentColor: getThemeHex(activeTheme.text) }}
                                className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                              />
                              <div className={`text-xl font-bold ${activeTheme.text} w-10 text-center bg-background border border-border rounded-lg py-1 shadow-inner`}>
                                {mc.level}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {mc.classId && mc.level >= mcSubclassChoiceLevel && mcSubclasses.length > 0 && (
                        <div className="space-y-1 max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <label className={`block text-xs font-bold uppercase tracking-widest ${activeTheme.text}`}>
                            Subclass (Level {mcSubclassChoiceLevel}+)
                          </label>
                          <Select
                            value={mc.subclassId || ""}
                            onValueChange={(val) => {
                              const updated = (character.multiClasses || []).map((m, i) => {
                                if (i === idx) {
                                  return { ...m, subclassId: val };
                                }
                                return m;
                              });
                              updateCharacter({ multiClasses: updated });
                            }}
                          >
                            <SelectTrigger className={`w-full bg-background border-border/60 ${activeTheme.ring || "focus:ring-emerald-500"} rounded`}>
                              <SelectValue placeholder="Select a subclass...">
                                {mc.subclassId
                                  ? mcSubclasses.find((s: any) => s.id === mc.subclassId)?.name
                                  : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-[250px]">
                              {mcSubclasses.map((sub: any) => (
                                <SelectItem 
                                  key={sub.id} 
                                  value={sub.id} 
                                  className="py-2.5 focus:bg-[var(--theme-focus-bg)] cursor-pointer"
                                  style={{ '--theme-focus-bg': `${getThemeHex(activeTheme.text)}1a` } as React.CSSProperties}
                                >
                                  <div className={`font-bold ${activeTheme.text}`}>{sub.name}</div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {mc.subclassId && (
                            (() => {
                              const selSub = mcSubclasses.find((s: any) => s.id === mc.subclassId);
                              const selSubFeatures = selSub
                                ? (classFeatures || []).filter((cf: any) => cf.subclassId === selSub.id).sort((a: any, b: any) => a.levelRequired - b.levelRequired)
                                : [];
                              return selSub ? (
                                <div className="mt-3 p-4 rounded-xl border bg-card/65 text-card-foreground shadow-lg max-w-sm animate-in fade-in slide-in-from-top-2 duration-300"
                                     style={{ borderColor: `${getThemeHex(activeTheme.text)}33` }}>
                                  <h4 className={`text-sm font-bold ${activeTheme.text} mb-1`}>{selSub.name} Path</h4>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{selSub.description}</p>
                                  
                                  {selSubFeatures.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border/20 pb-1">Features Path</div>
                                      <div className="max-h-[150px] overflow-y-auto pr-1 space-y-2 scrollbar-thin">
                                        {selSubFeatures.map((feat: any) => (
                                          <div key={feat.id} className="text-[11px] space-y-0.5">
                                            <div className="flex justify-between items-center">
                                              <span className="font-semibold text-foreground">{feat.name}</span>
                                              <span className="text-[8px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground font-semibold">Lvl {feat.levelRequired}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed">{feat.description}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : null;
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function StepAbilities({ character, updateCharacter, theme }: StepProps) {
  const activeTheme = theme || DEFAULT_THEME;
  const method = character.abilitiesMethod || "standard";
  const [rollDetails, setRollDetails] = useState<Record<string, { rolls: number[]; dropped: number; total: number }>>({});
  const [rollingStat, setRollingStat] = useState<string | null>(null);
  const { feats, spells, classes, subclasses, skills, mundaneGear, itemTypes, languages } = useLoaderData({ from: "/builder" }) as any;
  const skillOptions = getSkillOptionsFromDb(skills);
  const toolOptions = getToolOptionsFromDb(mundaneGear, itemTypes);
  const featLevels = getFeatChoiceLevels(character.classId, character.level);
  const generalFeats = (feats || [])
    .filter(
      (f: any) =>
        f.category === "General" ||
        f.category === "Fighting Style" ||
        f.category === "Epic Boon",
    )
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  const updateStat = (ab: string, val: number) => {
    updateCharacter({ abilities: { ...character.abilities, [ab]: val } });
  };

  const setMethod = (newMethod: "standard" | "pointbuy" | "roll") => {
    if (newMethod === "standard") {
      const newAbilities: any = {};
      ABILITIES.forEach((ab) => (newAbilities[ab] = 0));
      updateCharacter({ abilitiesMethod: "standard", abilities: newAbilities });
    } else if (newMethod === "pointbuy") {
      const newAbilities: any = {};
      ABILITIES.forEach((ab) => (newAbilities[ab] = 8));
      updateCharacter({ abilitiesMethod: "pointbuy", abilities: newAbilities });
    } else {
      updateCharacter({ abilitiesMethod: "roll" });
    }
  };

  // Standard Array Logic
  const standardArray = [15, 14, 13, 12, 10, 8];

  // Roll Logic
  const roll4d6DropLowestDetails = () => {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    const sorted = [...rolls].sort((a, b) => a - b);
    const dropped = sorted[0];
    const total = sorted[1] + sorted[2] + sorted[3];
    return { rolls, dropped, total };
  };

  const rollSingleStat = (ab: string) => {
    setRollingStat(ab);
    let counter = 0;
    const interval = setInterval(() => {
      // Shuffling animation effect
      updateStat(ab, Math.floor(Math.random() * 16) + 3);
      counter++;
      if (counter > 8) {
        clearInterval(interval);
        const { rolls, dropped, total } = roll4d6DropLowestDetails();
        updateStat(ab, total);
        setRollDetails((prev) => ({ ...prev, [ab]: { rolls, dropped, total } }));
        setRollingStat(null);
      }
    }, 40);
  };

  const rollAll = () => {
    ABILITIES.forEach((ab, idx) => {
      setTimeout(() => {
        rollSingleStat(ab);
      }, idx * 120);
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-bold mb-3 flex items-center justify-center gap-3">
          <Dices className={`${activeTheme.text} h-8 w-8`} />
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
          }}
          className={method === "standard" ? activeTheme.primaryBtn : ""}
        >
          Standard Array
        </Button>
        <Button
          variant={method === "pointbuy" ? "default" : "outline"}
          onClick={() => {
            setMethod("pointbuy");
          }}
          className={method === "pointbuy" ? activeTheme.primaryBtn : ""}
        >
          Point Buy
        </Button>
        <Button
          variant={method === "roll" ? "default" : "outline"}
          onClick={() => setMethod("roll")}
          className={method === "roll" ? activeTheme.primaryBtn : ""}
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
            className={`text-3xl font-black ${27 - getPointsUsed(character.abilities) < 0 ? "text-destructive" : activeTheme.text}`}
          >
            {27 - getPointsUsed(character.abilities)}
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
              className={`relative bg-card/50 p-6 rounded-2xl border flex flex-col items-center transition-all duration-300 hover:-translate-y-1 ${isHigh ? `${activeTheme.border} shadow-md` : "border-border/40 hover:border-primary/30 hover:shadow-md"}`}
              style={isHigh ? { boxShadow: `0 0 20px ${getThemeHex(activeTheme.text)}26` } : {}}
            >
              {isHigh && (
                <div className={`absolute top-0 right-0 w-16 h-16 ${activeTheme.glowBlur} blur-xl rounded-full`} />
              )}

              <span className="font-bold text-sm tracking-widest uppercase text-muted-foreground mb-3">
                {ab}
              </span>

              <div
                className={`text-5xl font-black mb-4 tracking-tighter drop-shadow-md ${isHigh ? activeTheme.text : "text-foreground"}`}
              >
                {base === 0 ? "-" : total}
              </div>

              <div
                className={`text-base font-bold px-4 py-1.5 rounded-full mb-6 border shadow-sm ${mod > 0 ? `${activeTheme.bg} ${activeTheme.text} ${activeTheme.border}` : mod < 0 ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-secondary text-foreground border-border"}`}
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
                      <SelectTrigger className={`w-20 h-8 px-2 py-1 text-center font-mono font-bold bg-background border-border/60 ${activeTheme.ring} rounded text-xs shadow-sm`}>
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent className="min-w-[4rem]">
                        <SelectItem 
                          value="0" 
                          className="justify-center font-mono font-bold focus:bg-[var(--theme-focus-bg)]"
                          style={{ '--theme-focus-bg': `${getThemeHex(activeTheme.text)}1a` } as React.CSSProperties}
                        >
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
                                className="justify-center font-mono font-bold focus:bg-[var(--theme-focus-bg)]"
                                style={{ '--theme-focus-bg': `${getThemeHex(activeTheme.text)}1a` } as React.CSSProperties}
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
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="18"
                        className={`w-14 p-1 text-center font-mono font-bold bg-background border border-border/60 rounded focus:outline-none transition-all text-xs ${activeTheme.borderFocus} ${activeTheme.ring}`}
                        value={base || ""}
                        disabled={rollingStat === ab}
                        onChange={(e) => {
                          let val = parseInt(e.target.value);
                          if (isNaN(val)) val = 0;
                          if (val > 18) val = 18;
                          updateStat(ab, val);
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={rollingStat !== null}
                        onClick={() => rollSingleStat(ab)}
                        className={`h-7 px-2 text-[10px] font-bold ${activeTheme.border} hover:${activeTheme.bg} ${activeTheme.text}`}
                      >
                        {rollingStat === ab ? "..." : "Roll"}
                      </Button>
                    </div>
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
                {method === "roll" && rollDetails[ab] && (
                  <div className="text-[9px] text-muted-foreground bg-background/40 px-2 py-1 rounded border border-border/20 font-mono flex items-center justify-between w-full mt-2 animate-in fade-in duration-300">
                    <span>Dice: [{rollDetails[ab].rolls.map((r, i) => {
                      const lowestIndex = rollDetails[ab].rolls.indexOf(rollDetails[ab].dropped);
                      const isDropped = i === lowestIndex;
                      return (
                        <span key={i} className={isDropped ? "line-through text-destructive font-semibold" : `${activeTheme.text} font-bold`}>
                          {r}{i < 3 ? ", " : ""}
                        </span>
                      );
                    })}]</span>
                    <span className="text-foreground/80">Drop {rollDetails[ab].dropped}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {featLevels.length > 0 && (
        <div className="mt-12 bg-secondary/20 p-6 rounded-xl border border-border/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h4 className={`text-xl font-bold mb-4 ${activeTheme.text}`}>
            Feats & Ability Score Improvements
          </h4>
          <p className="text-xs text-muted-foreground mb-6">
            Select a feat or ability score improvement for each milestone.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featLevels.map((lvl) => {
              const selectedFeatId = character.highLevelFeatChoices?.[lvl] || "";
              const selectedFeat = generalFeats.find((f: any) => f.id === selectedFeatId);

              const allCantrips = (spells || [])
                .filter((s: any) => Number(s.level || 0) === 0)
                .sort((a: any, b: any) => a.name.localeCompare(b.name));
              const allFirstLevelSpells = (spells || [])
                .filter((s: any) => Number(s.level || 0) === 1)
                .sort((a: any, b: any) => a.name.localeCompare(b.name));

              return (
                <div key={lvl} className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Level {lvl} Milestone Choice
                  </label>
                  <Select
                    value={selectedFeatId}
                    onValueChange={(val) => {
                      const newChoices = { ...character.highLevelFeatChoices, [lvl]: val };
                      updateCharacter({ highLevelFeatChoices: newChoices });
                    }}
                  >
                    <SelectTrigger className={`w-full bg-background border-border/60 ${activeTheme.ring} rounded text-xs shadow-sm h-12`}>
                      <SelectValue placeholder="Select a feat or ASI..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {generalFeats.map((feat: any) => (
                        <SelectItem 
                          key={feat.id} 
                          value={feat.id} 
                          className="py-2.5 focus:bg-[var(--theme-focus-bg)] cursor-pointer"
                          style={{ '--theme-focus-bg': `${getThemeHex(activeTheme.text)}1a` } as React.CSSProperties}
                        >
                          <div className={`font-bold ${activeTheme.text}`}>{feat.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-normal max-w-sm">
                            {feat.prerequisite ? `Prerequisite: ${feat.prerequisite} | ` : ""}{feat.category}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedFeat && (
                    <div className="text-xs text-muted-foreground bg-background/30 p-3 rounded-lg border border-border/20 mt-2 line-clamp-3 hover:line-clamp-none transition-all duration-300">
                      {selectedFeat.description}
                    </div>
                  )}

                  {/* Nested choices for specific feats */}
                  {selectedFeat && (
                    <div className="mt-4 border-t border-border/30 pt-4">
                      <RuleChoiceGroupPicker
                        groups={featToRuleChoicesAndGrants(selectedFeat, lvl, []).choices}
                        globalOptions={{ skills: skillOptions, tools: toolOptions, languages: getLanguageOptions(languages) }}
                        selected={character.ruleChoices || {}}
                        onChange={(groupId, choiceList) => {
                          updateCharacter({
                            ruleChoices: {
                              ...(character.ruleChoices || {}),
                              [groupId]: choiceList,
                            },
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HP Calculation Section */}
      <div className="mt-12 bg-secondary/20 p-6 rounded-xl border border-border/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h4 className={`text-xl font-bold mb-2 ${activeTheme.text}`}>HP Calculation Mode</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Choose between fixed average hit points or manually rolling your level-up hit points.
        </p>
        <div className="flex gap-4">
          <Button
            type="button"
            variant={character.hpType === "fixed" ? "default" : "outline"}
            className={character.hpType === "fixed" ? activeTheme.primaryBtn : "border-border/60 hover:bg-secondary/40"}
            onClick={() => updateCharacter({ hpType: "fixed" })}
          >
            Fixed (Average)
          </Button>
          <Button
            type="button"
            variant={character.hpType === "manual" ? "default" : "outline"}
            className={character.hpType === "manual" ? activeTheme.primaryBtn : "border-border/60 hover:bg-secondary/40"}
            onClick={() => updateCharacter({ hpType: "manual" })}
          >
            Manual (Rolled)
          </Button>
        </div>

        {character.hpType === "manual" && (() => {
          const primaryClassRecord = classes?.find((c: any) => c.id === character.classId);
          const primaryHitDie = primaryClassRecord?.hitDice ?? 8;
          
          const levelClassInfo: Array<{ level: number; className: string; hitDie: number }> = [];
          
          for (let lvl = 2; lvl <= character.level; lvl++) {
            levelClassInfo.push({
              level: lvl,
              className: primaryClassRecord?.name || "Primary Class",
              hitDie: primaryHitDie,
            });
          }
          
          let currentLvl = character.level + 1;
          if (character.multiClasses) {
            for (const mc of character.multiClasses) {
              const mcCls = classes?.find((c: any) => c.id === mc.classId);
              const mcHitDie = mcCls?.hitDice ?? 8;
              for (let i = 0; i < mc.level; i++) {
                levelClassInfo.push({
                  level: currentLvl,
                  className: mcCls?.name || mc.classId,
                  hitDie: mcHitDie,
                });
                currentLvl++;
              }
            }
          }

          if (levelClassInfo.length === 0) return null;

          return (
            <div className="mt-6 space-y-4 animate-in fade-in duration-300">
              <h5 className="font-bold text-sm text-foreground">Manual Roll Values (Level 2 to {levelClassInfo[levelClassInfo.length - 1].level})</h5>
              <p className="text-[11px] text-muted-foreground">Enter the rolled value for each level (excluding CON modifier, which is added automatically). The value must be between 1 and the class's hit die size.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {levelClassInfo.map((info) => (
                  <div key={info.level} className="space-y-1.5 p-3 rounded-lg bg-background/40 border border-border/30">
                    <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                      <span>Lvl {info.level} ({info.className})</span>
                      <span className={`text-[10px] ${activeTheme.text} font-mono`}>d{info.hitDie}</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={info.hitDie}
                      value={character.manualHpRolls?.[info.level] || ""}
                      placeholder={`1-${info.hitDie}`}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        const nextRolls = { ...character.manualHpRolls, [info.level]: val };
                        updateCharacter({ manualHpRolls: nextRolls });
                      }}
                      className={`w-full bg-background border border-border/60 ${activeTheme.borderFocus} focus:ring-1 ${activeTheme.ring} rounded px-2.5 py-1.5 text-sm font-semibold outline-none`}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export function StepSpells({ character, updateCharacter }: StepProps) {
  const { classes, classSpells, spells } = useLoaderData({ from: "/builder" }) as any;
  const spellcasters = getSpellcasters(character, classes);

  if (!character.classId) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-3xl mx-auto text-center py-16">
        <Wand2 className="h-10 w-10 text-muted-foreground mx-auto animate-pulse" />
        <h3 className="text-2xl font-bold">Class Selection Required</h3>
        <p className="text-muted-foreground">
          Please select a class in the Path step first to determine spellcasting capabilities.
        </p>
      </div>
    );
  }

  if (spellcasters.length === 0) {
    const cls = classes.find((candidate: any) => candidate.id === character.classId);
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

  const [activeTabClassId, setActiveTabClassId] = useState<string>(
    spellcasters[0]?.cls.id || ""
  );

  const currentClassId = spellcasters.some((s) => s.cls.id === activeTabClassId)
    ? activeTabClassId
    : (spellcasters[0]?.cls.id || "");

  const currentSpellcaster = spellcasters.find((s) => s.cls.id === currentClassId);
  if (!currentSpellcaster) return null;

  const { cls: activeCls, level: activeLvl } = currentSpellcaster;

  const linkedSpellIds = new Set(
    classSpells
      .filter((link: any) => (link.classId ?? link.class_id) === activeCls.id)
      .map((link: any) => link.spellId ?? link.spell_id),
  );

  const maxSpellLevel = getMaxSpellLevel(activeLvl, activeCls);
  const { choices } = spellcastingToRuleChoicesAndGrants(character, activeCls, activeLvl);

  const classSpellList = spells
    .filter((spell: any) => linkedSpellIds.has(spell.id))
    .sort((a: any, b: any) => a.level - b.level || a.name.localeCompare(b.name));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-5xl mx-auto">
      <div className="text-center">
        <h3 className="text-3xl font-bold mb-3 flex items-center justify-center gap-3">
          <Wand2 className="text-primary h-8 w-8" />
          Choose Spells
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Configure spellbooks for your spellcasting classes.
        </p>
      </div>

      {spellcasters.length > 1 && (
        <div className="flex justify-center gap-3 mb-6 bg-secondary/20 p-1.5 rounded-xl border border-border/20 max-w-md mx-auto">
          {spellcasters.map(({ cls: sCls, level: sLvl }) => (
            <button
              key={sCls.id}
              type="button"
              onClick={() => setActiveTabClassId(sCls.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                currentClassId === sCls.id
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              }`}
            >
              {sCls.name} (Lvl {sLvl})
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6 bg-card/20 p-6 rounded-2xl border border-border/30 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="border-b border-border/20 pb-4 mb-4">
          <h4 className="font-extrabold text-amber-500 text-lg uppercase tracking-wide">{activeCls.name} Spellbook</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Uses <span className="font-bold text-foreground">{getSpellcastingInfo(activeCls).ability?.toUpperCase()}</span> for spellcasting.
            Level {activeLvl} spells up to level {maxSpellLevel} are available.
          </p>
        </div>

        <RuleChoiceGroupPicker
          groups={choices}
          globalOptions={{ skills: [], tools: [], languages: [] }}
          spells={classSpellList}
          selected={character.ruleChoices || {}}
          onChange={(groupId, choiceList) => {
            updateCharacter({
              ruleChoices: {
                ...(character.ruleChoices || {}),
                [groupId]: choiceList,
              },
            });
          }}
        />
      </div>
    </div>
  );
}

const getThemeHex = (themeText: string | undefined) => {
  if (!themeText) return "#10b981";
  const name = themeText.replace("text-", "").replace("-500", "").replace("-400", "");
  const map: Record<string, string> = {
    red: "#ef4444",
    pink: "#ec4899",
    amber: "#f59e0b",
    emerald: "#10b981",
    rose: "#f43f5e",
    sky: "#0ea5e9",
    yellow: "#eab308",
    green: "#22c55e",
    slate: "#94a3b8",
    orange: "#f97316",
    teal: "#14b8a6",
    violet: "#8b5cf6",
    cyan: "#06b6d4",
  };
  return map[name] || "#10b981";
};

export function StepBiography({ character, updateCharacter, theme }: StepProps) {
  const activeTheme = theme || DEFAULT_THEME;
  const { weapons, armor, magicItems, spells } = useLoaderData({ from: "/builder" }) as any;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const catalogWeapons = (weapons || []).map((w: any) => ({
    name: w.name,
    type: "Weapon",
    description: `${w.damageDice} ${w.damageType} | Properties: ${parseJsonValue(w.propertiesJson, []).join(", ") || "None"}`,
    cost: w.cost,
    weight: w.weight,
    rarity: "Mundane",
    damageDice: w.damageDice,
    damageType: w.damageType,
    properties: parseJsonValue(w.propertiesJson, []),
  }));

  const catalogArmor = (armor || []).map((a: any) => ({
    name: a.name,
    type: "Armor",
    description: `AC: ${a.baseAc} (Max Dex Bonus: ${a.maxDexBonus !== null ? a.maxDexBonus : "No Limit"}) | Strength: ${a.strengthRequired || "None"}`,
    cost: a.cost,
    weight: a.weight,
    rarity: "Mundane",
    baseAc: a.baseAc,
    maxDexBonus: a.maxDexBonus,
    strengthRequired: a.strengthRequired,
  }));

  const catalogMagicItems = (magicItems || []).map((mi: any) => ({
    name: mi.name,
    type: "Wondrous Item",
    description: mi.description,
    cost: undefined,
    weight: undefined,
    rarity: mi.rarity || "Rare",
  }));

  const fullCatalog = [...catalogWeapons, ...catalogArmor, ...catalogMagicItems].sort((a, b) => a.name.localeCompare(b.name));

  const filteredCatalog = fullCatalog.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === "all" || item.type.toLowerCase().includes(category.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const addGear = (item: any) => {
    const existing = (character.customEquipment || []).find((e) => e.name === item.name);
    if (existing) {
      const updated = character.customEquipment!.map((e) =>
        e.name === item.name ? { ...e, quantity: e.quantity + 1 } : e
      );
      updateCharacter({ customEquipment: updated });
    } else {
      const newItem = {
        name: item.name,
        type: item.type,
        quantity: 1,
        equipped: item.type === "Weapon" || item.type === "Armor",
        attuned: false,
        cost: item.cost,
        weight: item.weight,
        description: item.description,
        rarity: item.rarity,
      };
      updateCharacter({ customEquipment: [...(character.customEquipment || []), newItem] });
    }
  };

  const removeGear = (itemName: string) => {
    const updated = (character.customEquipment || []).filter((e) => e.name !== itemName);
    updateCharacter({ customEquipment: updated });
  };

  const updateGearQty = (itemName: string, qty: number) => {
    const updated = (character.customEquipment || []).map((e) =>
      e.name === itemName ? { ...e, quantity: Math.max(1, qty) } : e
    );
    updateCharacter({ customEquipment: updated });
  };

  const toggleEquip = (itemName: string) => {
    const updated = (character.customEquipment || []).map((e) =>
      e.name === itemName ? { ...e, equipped: !e.equipped } : e
    );
    updateCharacter({ customEquipment: updated });
  };

  const toggleAttune = (itemName: string) => {
    const updated = (character.customEquipment || []).map((e) =>
      e.name === itemName ? { ...e, attuned: !e.attuned } : e
    );
    updateCharacter({ customEquipment: updated });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Biography Column (Left - 5 cols) */}
      <div className="lg:col-span-5 space-y-6 bg-card/40 border border-border/40 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <h3 className={`text-xl font-bold mb-1 ${activeTheme.text}`}>Character Biography</h3>
          <p className="text-xs text-muted-foreground">Describe your character's persona and background story.</p>
        </div>

        {/* Live Portrait Preview */}
        {character.avatarUrl && (
          <div className="flex justify-center">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 shadow-lg group"
                 style={{ borderColor: `${getThemeHex(activeTheme.text)}66` }}>
              <img
                src={character.avatarUrl}
                alt="Portrait Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Player Name</label>
            <input
              type="text"
              value={character.playerName || ""}
              onChange={(e) => updateCharacter({ playerName: e.target.value, name: e.target.value })}
              placeholder="Your name"
              className="w-full bg-background/50 backdrop-blur-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-lg px-3 py-2 text-sm font-semibold transition-all shadow-inner placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Portrait/Avatar URL</label>
            <input
              type="text"
              value={character.avatarUrl || ""}
              onChange={(e) => updateCharacter({ avatarUrl: e.target.value })}
              placeholder="https://example.com/portrait.jpg"
              className="w-full bg-background/50 backdrop-blur-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-lg px-3 py-2 text-xs font-mono transition-all shadow-inner placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Alignment</label>
              <input
                type="text"
                value={character.alignment || ""}
                onChange={(e) => updateCharacter({ alignment: e.target.value })}
                placeholder="e.g. Neutral Good"
                className="w-full bg-background/50 backdrop-blur-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-lg px-3 py-2 text-sm font-semibold transition-all shadow-inner placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Age</label>
              <input
                type="text"
                value={character.age || ""}
                onChange={(e) => updateCharacter({ age: e.target.value })}
                placeholder="e.g. 25"
                className="w-full bg-background/50 backdrop-blur-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-lg px-3 py-2 text-sm font-semibold transition-all shadow-inner placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Height</label>
              <input
                type="text"
                value={character.height || ""}
                onChange={(e) => updateCharacter({ height: e.target.value })}
                placeholder="e.g. 6ft"
                className="w-full bg-background/50 backdrop-blur-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-lg px-3 py-2 text-sm font-semibold transition-all shadow-inner placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Weight</label>
              <input
                type="text"
                value={character.weight || ""}
                onChange={(e) => updateCharacter({ weight: e.target.value })}
                placeholder="e.g. 180 lbs"
                className="w-full bg-background/50 backdrop-blur-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-lg px-3 py-2 text-sm font-semibold transition-all shadow-inner placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Eyes</label>
              <input
                type="text"
                value={character.eyes || ""}
                onChange={(e) => updateCharacter({ eyes: e.target.value })}
                placeholder="Blue"
                className="w-full bg-background/50 backdrop-blur-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-lg px-2.5 py-2 text-xs font-semibold transition-all shadow-inner placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Skin</label>
              <input
                type="text"
                value={character.skin || ""}
                onChange={(e) => updateCharacter({ skin: e.target.value })}
                placeholder="Fair"
                className="w-full bg-background/50 backdrop-blur-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-lg px-2.5 py-2 text-xs font-semibold transition-all shadow-inner placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hair</label>
              <input
                type="text"
                value={character.hair || ""}
                onChange={(e) => updateCharacter({ hair: e.target.value })}
                placeholder="Blonde"
                className="w-full bg-background/50 backdrop-blur-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-lg px-2.5 py-2 text-xs font-semibold transition-all shadow-inner placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Backstory</label>
            <textarea
              value={character.backstory || ""}
              onChange={(e) => updateCharacter({ backstory: e.target.value })}
              placeholder="Describe your character's origins, motivations, and achievements..."
              rows={5}
              className="w-full bg-background/50 backdrop-blur-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-lg px-3 py-2 text-sm leading-relaxed resize-none transition-all shadow-inner placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      </div>

      {/* Equipment Column (Right - 7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Custom Gear Catalog Card */}
        <div className="bg-card/40 border border-border/40 p-6 rounded-2xl backdrop-blur-md space-y-4">
          <div>
            <h3 className={`text-xl font-bold mb-1 ${activeTheme.text}`}>Gear Catalog</h3>
            <p className="text-xs text-muted-foreground">Search and add starting gear or magic items to your inventory.</p>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-background/50 backdrop-blur-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-lg px-3 py-2 text-sm font-semibold transition-all shadow-inner placeholder:text-muted-foreground/50"
            />
            <Select value={category} onValueChange={(val) => setCategory(val)}>
              <SelectTrigger className="w-36 bg-background/50 backdrop-blur-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg text-sm font-semibold transition-all">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  value="all" 
                  className="focus:bg-[var(--theme-focus-bg)] cursor-pointer"
                  style={{ '--theme-focus-bg': `${getThemeHex(activeTheme.text)}1a` } as React.CSSProperties}
                >All</SelectItem>
                <SelectItem 
                  value="weapon" 
                  className="focus:bg-[var(--theme-focus-bg)] cursor-pointer"
                  style={{ '--theme-focus-bg': `${getThemeHex(activeTheme.text)}1a` } as React.CSSProperties}
                >Weapons</SelectItem>
                <SelectItem 
                  value="armor" 
                  className="focus:bg-[var(--theme-focus-bg)] cursor-pointer"
                  style={{ '--theme-focus-bg': `${getThemeHex(activeTheme.text)}1a` } as React.CSSProperties}
                >Armor</SelectItem>
                <SelectItem 
                  value="wondrous" 
                  className="focus:bg-[var(--theme-focus-bg)] cursor-pointer"
                  style={{ '--theme-focus-bg': `${getThemeHex(activeTheme.text)}1a` } as React.CSSProperties}
                >Magic Items</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[250px] overflow-y-auto border border-border/20 rounded-lg divide-y divide-border/20 bg-background/20">
            {filteredCatalog.slice(0, 50).map((item) => {
              const isExpanded = expandedItem === item.name;
              return (
                <div
                  key={item.name}
                  onClick={() => setExpandedItem(isExpanded ? null : item.name)}
                  className={`p-3 hover:bg-secondary/10 transition-all duration-300 cursor-pointer ${
                    isExpanded ? "bg-secondary/15 border-l-2" : ""
                  }`}
                  style={isExpanded ? { borderLeftColor: getThemeHex(activeTheme.text) } : {}}
                >
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5 max-w-[80%]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{item.name}</span>
                        <span className="text-[9px] uppercase tracking-wider bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                          {item.type}
                        </span>
                        {item.rarity !== "Mundane" && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold"
                                style={{
                                  backgroundColor: `${getThemeHex(activeTheme.text)}1a`,
                                  color: getThemeHex(activeTheme.text),
                                  border: `1px solid ${getThemeHex(activeTheme.text)}33`,
                                }}>
                            {item.rarity}
                          </span>
                        )}
                      </div>
                      {!isExpanded && (
                        <div className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                          {item.description}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-bold"
                      style={{
                        borderColor: `${getThemeHex(activeTheme.text)}4d`,
                        color: getThemeHex(activeTheme.text),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        addGear(item);
                      }}
                    >
                      Add
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/10 text-xs text-muted-foreground space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Properties Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {item.cost && (
                          <div className="bg-background/40 p-2 rounded border border-border/10">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Cost</span>
                            <span className="font-semibold text-foreground">{item.cost}</span>
                          </div>
                        )}
                        {item.weight !== undefined && (
                          <div className="bg-background/40 p-2 rounded border border-border/10">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Weight</span>
                            <span className="font-semibold text-foreground">{item.weight} lbs</span>
                          </div>
                        )}
                        <div className="bg-background/40 p-2 rounded border border-border/10">
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Rarity</span>
                          <span className="font-semibold text-foreground">{item.rarity}</span>
                        </div>
                        {item.damageDice && (
                          <div className="bg-background/40 p-2 rounded border border-border/10">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Damage</span>
                            <span className="font-semibold text-foreground">{item.damageDice} {item.damageType}</span>
                          </div>
                        )}
                        {item.baseAc !== undefined && (
                          <div className="bg-background/40 p-2 rounded border border-border/10">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">AC</span>
                            <span className="font-semibold text-foreground">{item.baseAc}</span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Description</span>
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap bg-background/25 p-3 rounded-lg border border-border/10">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredCatalog.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No matching items found.
              </div>
            )}
          </div>
        </div>

        {/* Added Custom Equipment Card */}
        <div className="bg-card/40 border border-border/40 p-6 rounded-2xl backdrop-blur-md space-y-4">
          <div>
            <h3 className={`text-xl font-bold mb-1 ${activeTheme.text}`}>Character Inventory</h3>
            <p className="text-xs text-muted-foreground">Manage quantities, equip/attune status for custom additions.</p>
          </div>

          <div className="max-h-[300px] overflow-y-auto border border-border/20 rounded-lg divide-y divide-border/20 bg-background/20">
            {(character.customEquipment || []).map((item) => (
              <div key={item.name} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 gap-3 hover:bg-secondary/20 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{item.name}</span>
                    <span className="text-[9px] uppercase tracking-wider bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                      {item.type}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Qty: {item.quantity} | {item.rarity}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateGearQty(item.name, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center bg-secondary rounded hover:bg-primary/20 text-sm font-bold"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-xs font-mono font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateGearQty(item.name, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center bg-secondary rounded hover:bg-primary/20 text-sm font-bold"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {(item.type === "Weapon" || item.type === "Armor" || item.type === "Shield") && (
                      <Button
                        size="sm"
                        variant={item.equipped ? "default" : "outline"}
                        className={`text-[10px] h-7 px-2.5 ${item.equipped ? activeTheme.primaryBtn : "border-border/60 hover:bg-secondary/40"}`}
                        onClick={() => toggleEquip(item.name)}
                      >
                        {item.equipped ? "Equipped" : "Equip"}
                      </Button>
                    )}
                    {item.rarity !== "Mundane" && (
                      <Button
                        size="sm"
                        variant={item.attuned ? "default" : "outline"}
                        className={`text-[10px] h-7 px-2.5 ${item.attuned ? activeTheme.primaryBtn : "border-border/60 hover:bg-secondary/40"}`}
                        onClick={() => toggleAttune(item.name)}
                      >
                        {item.attuned ? "Attuned" : "Attune"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 h-7 px-2"
                      onClick={() => removeGear(item.name)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {(character.customEquipment || []).length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No custom items added yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StepReview({
  character,
  validationIssues,
  theme,
}: {
  character: BuilderState;
  validationIssues: string[];
  theme?: ClassTheme;
}) {
  const activeTheme = theme || DEFAULT_THEME;
  const {
    backgrounds,
    classes,
    feats,
    spells,
    species,
    speciesVariants,
    subclasses,
    classFeatures,
    magicItems,
    itemActiveEffects,
    activeEffects,
    skills,
  } = useLoaderData({ from: "/builder" }) as any;
  const skillOptions = getSkillOptionsFromDb(skills);
  const race = species.find((r: any) => r.id === character.raceId);
  const subrace = speciesVariants?.find((sv: any) => sv.id === character.speciesVariantId);
  const background = backgrounds.find((b: any) => b.id === character.backgroundId);
  const cls = classes.find((c: any) => c.id === character.classId);
  const subclass = subclasses.find((s: any) => s.id === character.subclassId);
  const originFeat = background?.originFeatId
    ? feats.find((feat: any) => feat.id === background.originFeatId)
    : null;
  const classEquipmentId = character.ruleChoices?.[`class_${character.classId}_equipment`]?.[0];
  const classEquipment = getEquipmentOptions(cls?.startingEquipmentJson).find(
    (option) => option.id === classEquipmentId,
  );
  const backgroundEquipmentId = character.ruleChoices?.[`background_${character.backgroundId}_equipment`]?.[0];
  const backgroundEquipment = getEquipmentOptions(
    getJsonField(background, "startingEquipmentJson", "starting_equipment_json"),
  ).find((option) => option.id === backgroundEquipmentId);
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
  const selectedLanguages = [
    ...getFixedLanguages(getJsonField(race, "languagesJson", "languages_json")),
    ...character.speciesLanguageChoices,
    ...getFixedLanguages(
      getJsonField(background, "languageProficienciesJson", "language_proficiencies_json"),
    ),
    ...character.backgroundLanguageChoices,
  ];

  const selectedFeatureChoices = getUnlockedFeatureOptionGroups(character, classFeatures, skillOptions)
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

  // Find linked active effects for each custom item
  const getItemEffects = (itemName: string) => {
    const dbItem = (magicItems || []).find((mi: any) => mi.name.toLowerCase() === itemName.toLowerCase());
    if (!dbItem) return [];
    
    const linkedEffectIds = (itemActiveEffects || [])
      .filter((iae: any) => iae.itemId === dbItem.id)
      .map((iae: any) => iae.effectId);
      
    return (activeEffects || []).filter((ae: any) => linkedEffectIds.includes(ae.id));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-3xl mx-auto">
      <div className="text-center p-8 rounded-3xl border relative overflow-hidden flex flex-col items-center justify-center gap-4"
           style={{
             backgroundImage: `linear-gradient(to bottom, ${getThemeHex(activeTheme.text)}1a, transparent)`,
             borderColor: `${getThemeHex(activeTheme.text)}33`,
           }}>
        <div className="absolute top-0 right-0 p-12 blur-[100px] rounded-full pointer-events-none w-48 h-48 -z-10"
             style={{ backgroundColor: `${getThemeHex(activeTheme.text)}1a` }} />
        <div className="absolute bottom-0 left-0 p-12 blur-[100px] rounded-full pointer-events-none w-48 h-48 -z-10"
             style={{ backgroundColor: `${getThemeHex(activeTheme.text)}10` }} />

        {character.avatarUrl && (
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 shadow-lg shrink-0"
               style={{ borderColor: `${getThemeHex(activeTheme.text)}66` }}>
            <img src={character.avatarUrl} alt="Character Avatar" className="w-full h-full object-cover" />
          </div>
        )}

        <div>
          <h2 className="text-5xl font-black tracking-tight bg-clip-text text-transparent mb-3 drop-shadow-sm"
              style={{ backgroundImage: `linear-gradient(to bottom right, #ffffff, ${getThemeHex(activeTheme.text)})` }}>
            {character.name}
          </h2>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/50 backdrop-blur-md border border-border text-lg font-semibold text-muted-foreground shadow-sm">
            <span className="text-foreground">Level {character.level}</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${getThemeHex(activeTheme.text)}80` }} />
            <span className="text-accent">{subrace ? `${subrace.name} ${race?.name}` : race?.name}</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${getThemeHex(activeTheme.text)}80` }} />
            <span className={`${activeTheme.text}`}>{background?.name}</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${getThemeHex(activeTheme.text)}80` }} />
            <span className="text-amber-500 font-bold">{subclass ? subclass.name : cls?.name}</span>
          </div>
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
                style={mod > 0 ? { backgroundColor: getThemeHex(activeTheme.text) } : {}}
                className={`absolute bottom-0 left-0 w-full h-1 ${mod > 0 ? "" : mod < 0 ? "bg-destructive/50" : "bg-transparent"}`}
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
              <span className="font-bold text-foreground">Species:</span> {subrace ? `${subrace.name} ${race?.name}` : race?.name}
            </p>
            <p>
              <span className="font-bold text-foreground">Background:</span> {background?.name}
            </p>
            {originFeat && (
              <p>
                <span className="font-bold text-foreground">Origin Feat:</span> {originFeat.name}
              </p>
            )}
            {Object.entries(character.highLevelFeatChoices || {}).map(([lvl, featId]) => {
              const feat = feats.find((f: any) => f.id === featId);
              return (
                <p key={lvl}>
                  <span className="font-bold text-foreground">Level {lvl} Feat:</span> {feat?.name || featId}
                </p>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/40">
          <CardHeader>
            <CardTitle>Class Path</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <span className="font-bold text-foreground">Class:</span> {cls?.name} {character.level}
              {(character.multiClasses || []).map((mc) => {
                const mcCls = classes.find((c: any) => c.id === mc.classId);
                const mcSub = subclasses.find((s: any) => s.id === mc.subclassId);
                return ` / ${mcCls?.name || mc.classId} ${mc.level}${mcSub ? ` (${mcSub.name})` : ""}`;
              })}
            </p>
            <p>
              <span className="font-bold text-foreground">Subclass:</span>{" "}
              {subclass?.name || "Not chosen yet"}
            </p>
            <p>
              <span className="font-bold text-foreground">HP Mode:</span>{" "}
              {character.hpType === "fixed" ? "Fixed (Average)" : "Manual (Rolled)"}
            </p>
            {character.hpType === "manual" && (
              <div className="text-xs text-muted-foreground bg-background/30 p-2 rounded border border-border/20 mt-1">
                <span className="font-bold text-foreground block mb-1">Manual Rolls:</span>
                {Object.entries(character.manualHpRolls || {}).map(([lvl, roll]) => `Lvl ${lvl}: ${roll}`).join(", ")}
              </div>
            )}
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
          <p>
            <span className="font-bold text-foreground">Languages:</span>{" "}
            {Array.from(new Set(selectedLanguages)).join(", ") || "Common"}
          </p>
          {subrace && (
            <p>
              <span className="font-bold text-foreground">Subrace:</span> {subrace.name}
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

      {(character.customEquipment || []).length > 0 && (
        <Card className="bg-card/50 border-border/40">
          <CardHeader>
            <CardTitle>Custom Starting Inventory</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {character.customEquipment!.map((item) => {
                const itemEffects = getItemEffects(item.name);
                return (
                  <div key={item.name} className="flex flex-col justify-between p-3 rounded bg-background/25 border border-border/20 text-xs gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-bold text-foreground block text-sm">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          {item.type} | Qty: {item.quantity}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {item.equipped && (
                          <span className="px-1.5 py-0.5 rounded font-semibold text-[9px] uppercase"
                                style={{
                                  backgroundColor: `${getThemeHex(activeTheme.text)}1a`,
                                  color: getThemeHex(activeTheme.text),
                                  border: `1px solid ${getThemeHex(activeTheme.text)}33`
                                }}>
                            Equipped
                          </span>
                        )}
                        {item.attuned && (
                          <span className="px-1.5 py-0.5 rounded font-semibold text-[9px] uppercase"
                                style={{
                                  backgroundColor: `${getThemeHex(activeTheme.text)}26`,
                                  color: getThemeHex(activeTheme.text),
                                  border: `1px solid ${getThemeHex(activeTheme.text)}4d`
                                }}>
                            Attuned
                          </span>
                        )}
                      </div>
                    </div>
                    {item.description && (
                      <span className="text-[10px] text-muted-foreground leading-relaxed italic bg-black/10 p-1.5 rounded border border-border/5">
                        {item.description}
                      </span>
                    )}
                    {itemEffects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t border-border/10">
                        {itemEffects.map((effect: any) => (
                          <span
                            key={effect.id}
                            className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-semibold text-[9px] uppercase flex items-center gap-1"
                          >
                            <span className="w-1 h-1 rounded-full bg-blue-400" />
                            Effect: {effect.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/50 border-border/40">
        <CardHeader>
          <CardTitle>Biography & Details</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="font-bold text-foreground block">Player Name</span>
              {character.playerName || "Native Builder"}
            </div>
            <div>
              <span className="font-bold text-foreground block">Alignment</span>
              {character.alignment || "None"}
            </div>
            <div>
              <span className="font-bold text-foreground block">Age / Height / Weight</span>
              {`${character.age || "-"} / ${character.height || "-"} / ${character.weight || "-"}`}
            </div>
            <div>
              <span className="font-bold text-foreground block">Eyes / Skin / Hair</span>
              {`${character.eyes || "-"} / ${character.skin || "-"} / ${character.hair || "-"}`}
            </div>
          </div>
          {character.backstory && (
            <div className="pt-2 border-t border-border/20 text-xs">
              <span className="font-bold text-foreground block mb-1">Backstory:</span>
              <p className="leading-relaxed whitespace-pre-wrap italic bg-background/20 p-3 rounded-lg border border-border/10">
                {character.backstory}
              </p>
            </div>
          )}
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
