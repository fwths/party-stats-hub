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
  SKILL_OPTIONS,
  TOOL_OPTIONS,
  DRAGON_DAMAGE_BY_ANCESTRY,
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
} from "./BuilderUtils";

interface StepProps {
  character: BuilderState;
  updateCharacter: (updates: Partial<BuilderState>) => void;
}

export function TraitChoicePicker({
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

export function OriginFeatChoicePanel({
  originFeat,
  character,
  updateCharacter,
}: {
  originFeat: any;
  character: BuilderState;
  updateCharacter: (updates: Partial<BuilderState>) => void;
}) {
  const { classSpells, spells } = useLoaderData({ from: "/builder" }) as any;
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

export function StepRace({ character, updateCharacter }: StepProps) {
  const { species, speciesVariants } = useLoaderData({ from: "/builder" }) as any;
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
  const { languages } = useLoaderData({ from: "/builder" }) as any;
  const languageOptions = getLanguageOptions(languages);
  const speciesLanguageGroups = getLanguageChoiceGroups(
    getJsonField(selectedRace, "languagesJson", "languages_json"),
    languageOptions,
  );
  const fixedSpeciesLanguages = getFixedLanguages(
    getJsonField(selectedRace, "languagesJson", "languages_json"),
  );
  const speciesTraitGroups = getSpeciesTraitGroups(selectedRace);
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
                      speciesTraitChoices: {},
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
              speciesTraitGroups.length > 0 ||
              speciesSkillGroups.length > 0 ||
              speciesToolGroups.length > 0) && (
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
                      <SelectTrigger className="w-full bg-background border-border/60 focus:ring-emerald-500 rounded text-xs shadow-sm h-10">
                        <SelectValue placeholder="Choose a subrace/variant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {subraces.map((sub: any) => (
                          <SelectItem key={sub.id} value={sub.id} className="py-2 focus:bg-emerald-500/10 cursor-pointer">
                            <div className="font-bold text-amber-500">{sub.name}</div>
                            {sub.description && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-normal max-w-sm">
                                {sub.description}
                              </div>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedSubrace && selectedSubrace.featuresJson && (
                  <div className="space-y-2 rounded-xl border border-border/30 bg-secondary/20 p-4 md:col-span-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {selectedSubrace.name} Features
                    </div>
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
                {(fixedSpeciesLanguages.length > 0 || speciesLanguageGroups.length > 0) && (
                  <div className="space-y-3">
                    {fixedSpeciesLanguages.length > 0 && (
                      <div className="rounded-xl border border-border/30 bg-secondary/20 p-4 text-sm">
                        <span className="font-bold text-foreground">Languages:</span>{" "}
                        <span className="text-muted-foreground">
                          {fixedSpeciesLanguages.join(", ")}
                        </span>
                      </div>
                    )}
                    <ChoiceGroupPicker
                      groups={speciesLanguageGroups}
                      selected={character.speciesLanguageChoices}
                      onChange={(choices) => updateCharacter({ speciesLanguageChoices: choices })}
                    />
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export function StepBackground({ character, updateCharacter }: StepProps) {
  const { backgrounds, feats, languages } = useLoaderData({ from: "/builder" }) as any;
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
              <ChoiceGroupPicker
                groups={backgroundToolGroups}
                selected={character.backgroundToolChoices}
                onChange={(choices) => updateCharacter({ backgroundToolChoices: choices })}
              />
              {(fixedBackgroundLanguages.length > 0 || backgroundLanguageGroups.length > 0) && (
                <div className="space-y-3">
                  {fixedBackgroundLanguages.length > 0 && (
                    <div className="rounded-xl border border-border/30 bg-secondary/20 p-4 text-sm">
                      <span className="font-bold text-foreground">Languages:</span>{" "}
                      <span className="text-muted-foreground">
                        {fixedBackgroundLanguages.join(", ")}
                      </span>
                    </div>
                  )}
                  <ChoiceGroupPicker
                    groups={backgroundLanguageGroups}
                    selected={character.backgroundLanguageChoices}
                    onChange={(choices) => updateCharacter({ backgroundLanguageChoices: choices })}
                  />
                </div>
              )}
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

export function StepClass({ character, updateCharacter }: StepProps) {
  const { classes, subclasses, classFeatures } = useLoaderData({ from: "/builder" }) as any;
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

export function StepAbilities({ character, updateCharacter }: StepProps) {
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

export function StepSpells({ character, updateCharacter }: StepProps) {
  const { classes, classSpells, spells } = useLoaderData({ from: "/builder" }) as any;
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

export function StepReview({
  character,
  validationIssues,
}: {
  character: BuilderState;
  validationIssues: string[];
}) {
  const { backgrounds, classes, feats, spells, species, speciesVariants, subclasses, classFeatures } = useLoaderData(
    { from: "/builder" },
  ) as any;
  const race = species.find((r: any) => r.id === character.raceId);
  const subrace = speciesVariants?.find((sv: any) => sv.id === character.speciesVariantId);
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
  const selectedLanguages = [
    ...getFixedLanguages(getJsonField(race, "languagesJson", "languages_json")),
    ...character.speciesLanguageChoices,
    ...getFixedLanguages(
      getJsonField(background, "languageProficienciesJson", "language_proficiencies_json"),
    ),
    ...character.backgroundLanguageChoices,
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
          <span className="text-accent">{subrace ? `${subrace.name} ${race?.name}` : race?.name}</span>
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
          <p>
            <span className="font-bold text-foreground">Languages:</span>{" "}
            {Array.from(new Set(selectedLanguages)).join(", ") || "Common"}
          </p>
          {subrace && (
            <p>
              <span className="font-bold text-foreground">Subrace:</span> {subrace.name}
            </p>
          )}
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
