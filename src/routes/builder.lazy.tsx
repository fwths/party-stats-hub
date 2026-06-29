import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  User,
  Swords,
  Dices,
  Save,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Wand2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/party/ThemeSelector";
import { SourceFiltersPanel } from "@/components/builder/SourceFiltersPanel";
import { DEFAULT_SOURCE_POLICY, DEFAULT_CONTENT_TOGGLES } from "@/lib/forge/source-policy";
import { createNativePartyMember, saveNativeCharacter } from "@/lib/native-engine";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";

import {
  BuilderState,
  getBuilderValidationIssues,
  getJsonField,
  areChoiceGroupsComplete,
  getProficiencyChoiceGroups,
  isValidAbilityBonusSet,
  getToolChoiceGroups,
  getLanguageChoiceGroups,
  getLanguageOptions,
  getEquipmentOptions,
  areOriginFeatChoicesComplete,
  parseJsonValue,
  getSubclassChoiceLevel,
  getUnlockedFeatureOptionGroups,
  areFeatureChoicesComplete,
  isSpellStepValid,
  getPointsUsed,
  getSkillOptionsFromDb,
  getToolOptionsFromDb,
} from "@/components/builder/BuilderUtils";
import { CLASS_THEMES, DEFAULT_THEME } from "@/components/builder/BuilderConstants";
import {
  StepRace,
  StepFeats,
  StepEquipment,
  StepBackground,
  StepClass,
  StepAbilities,
  StepSpells,
  StepBiography,
  StepReview,
} from "@/components/builder/WizardSteps";

export const Route = createLazyFileRoute("/builder")({
  component: BuilderWizard,
});

function BuilderWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const {
    backgrounds,
    classes,
    feats,
    species,
    speciesVariants,
    spells,
    subclasses,
    classFeatures,
    languages,
    activeEffects,
    featureActiveEffects,
    itemActiveEffects,
    spellActiveEffects,
    magicItems,
    weapons,
    armor,
    skills,
    senses,
    conditions,
    rulesActions,
    optionalFeatures,
    charOptions,
    mundaneGear,
    weaponMasteries,
    itemProperties,
    itemTypes,
    itemTypeAdditionalEntries,
    itemGroups,
    magicVariants,
    itemCardReferences,
    challengeRatings,
    creatureBuilderEntries,
    initialCharacter,
  } = Route.useLoaderData() as any;
  const skillOptions = getSkillOptionsFromDb(skills);
  const toolOptions = getToolOptionsFromDb(mundaneGear, itemTypes);
  const [step, setStep] = useState(1);
  const [showFilters] = useState(false);
  const [character, setCharacter] = useState<BuilderState>(() => {
    if (initialCharacter) {
      return initialCharacter;
    }
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("party_stats_forge_draft");
        if (saved) {
          const parsed = JSON.parse(saved);
          // basic validation of parsed data to make sure it's valid
          if (parsed && typeof parsed === "object" && typeof parsed.name === "string") {
            return parsed;
          }
        }
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
    return {
      name: "Unnamed Hero",
      raceId: null,
      speciesVariantId: null,
      backgroundId: null,
      classId: null,
      subclassId: null,
      level: 1,
      abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      abilityBonuses: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
      ruleChoices: {},
      highLevelFeatChoices: {},
      hpType: "fixed",
      manualHpRolls: {},
      customEquipment: [],
      multiClasses: [],
      abilitiesMethod: "standard",
    };
  });

  const theme = character.classId
    ? CLASS_THEMES[character.classId] || DEFAULT_THEME
    : DEFAULT_THEME;
  const getThemeHex = (themeText: string) => {
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

  useEffect(() => {
    if (character.id) return; // Do not overwrite draft with active character edit
    try {
      localStorage.setItem("party_stats_forge_draft", JSON.stringify(character));
    } catch (e) {
      console.error("Failed to save draft to localStorage", e);
    }
  }, [character]);

  const updateCharacter = (updates: Partial<BuilderState>) => {
    setCharacter((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => setStep((s) => Math.min(9, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));
  const validationIssues = getBuilderValidationIssues(character, Route.useLoaderData());

  const saveCharacter = async () => {
    try {
      if (validationIssues.length > 0) {
        toast.warning(validationIssues.join(", "), "Incomplete Draft");
        return;
      }

      const { STORAGE_KEY, COOKIE_KEY, readStoredIds, addPartyId } = await import("@/lib/party");

      const raceData = species.find((r: any) => r.id === character.raceId);
      const speciesVariantData = speciesVariants?.find(
        (sv: any) => sv.id === character.speciesVariantId,
      );
      const backgroundData = backgrounds.find((b: any) => b.id === character.backgroundId);
      const classData = classes.find((c: any) => c.id === character.classId);
      const subclassData = subclasses.find((s: any) => s.id === character.subclassId);
      const originFeat = backgroundData?.originFeatId
        ? feats.find((feat: any) => feat.id === backgroundData.originFeatId)
        : null;
      const allClassSpells: string[] = [];
      if (character.cantripChoicesByClass) {
        for (const list of Object.values(character.cantripChoicesByClass)) {
          allClassSpells.push(...list);
        }
      }
      if (character.preparedSpellChoicesByClass) {
        for (const list of Object.values(character.preparedSpellChoicesByClass)) {
          allClassSpells.push(...list);
        }
      }

      const allRuleChoiceValues = new Set(Object.values(character.ruleChoices || {}).flat());

      const selectedSpells = spells.filter(
        (spell: any) =>
          (character.cantripChoices || []).includes(spell.id) ||
          (character.preparedSpellChoices || []).includes(spell.id) ||
          allClassSpells.includes(spell.id) ||
          allRuleChoiceValues.has(spell.id),
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
        {
          activeEffects,
          featureActiveEffects,
          itemActiveEffects,
          spellActiveEffects,
          magicItems,
          feats,
          weapons,
          armor,
          classes,
          subclasses,
          skills,
          senses,
          conditions,
          rulesActions,
          optionalFeatures,
          charOptions,
          mundaneGear,
          weaponMasteries,
          itemProperties,
          itemTypes,
          itemTypeAdditionalEntries,
          itemGroups,
          magicVariants,
          itemCardReferences,
          challengeRatings,
          creatureBuilderEntries,
        },
        speciesVariantData,
      );
      const newId = await saveNativeCharacter({
        data: { character: newMember, builderState: character },
      });

      const ids = addPartyId(readStoredIds(), newId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      document.cookie = `${COOKIE_KEY}=${ids.join(",")}; path=/; max-age=31536000; SameSite=Lax`;

      // Clear the draft only if creating a new character
      if (!character.id) {
        localStorage.removeItem("party_stats_forge_draft");
      }

      toast.success(
        character.id
          ? "Character updated successfully!"
          : "Character built natively and added to party!",
        "Forge Successful",
      );
      navigate({ to: "/" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to save character", "Forge Error");
    }
  };

  const isStepValidAt = (stepNum: number) => {
    if (stepNum === 1) {
      const race = species.find((r: any) => r.id === character.raceId);
      const subraces =
        speciesVariants?.filter((sv: any) => sv.speciesId === character.raceId) || [];
      return (
        character.name.trim() !== "" &&
        character.raceId !== null &&
        (subraces.length === 0 || character.speciesVariantId !== null) &&
        areChoiceGroupsComplete(
          getProficiencyChoiceGroups(
            getJsonField(race, "proficienciesJson", "proficiencies_json"),
            "skills",
            skillOptions,
          ),
          character.speciesSkillChoices || [],
        ) &&
        areChoiceGroupsComplete(
          getProficiencyChoiceGroups(
            getJsonField(race, "proficienciesJson", "proficiencies_json"),
            "tools",
            toolOptions,
          ),
          character.speciesToolChoices || [],
        ) &&
        areChoiceGroupsComplete(
          getLanguageChoiceGroups(
            getJsonField(race, "languagesJson", "languages_json"),
            getLanguageOptions(languages),
          ),
          character.speciesLanguageChoices || [],
        )
      );
    }
    if (stepNum === 2) {
      const background = backgrounds.find((b: any) => b.id === character.backgroundId);
      const originFeat = background?.originFeatId
        ? feats.find((feat: any) => feat.id === background.originFeatId)
        : null;
      return (
        character.backgroundId !== null &&
        isValidAbilityBonusSet(character) &&
        areChoiceGroupsComplete(
          getToolChoiceGroups(
            getJsonField(background, "toolProficienciesJson", "tool_proficiencies_json"),
            toolOptions,
          ),
          character.backgroundToolChoices || [],
        ) &&
        areChoiceGroupsComplete(
          getLanguageChoiceGroups(
            getJsonField(background, "languageProficienciesJson", "language_proficiencies_json"),
            getLanguageOptions(languages),
          ),
          character.backgroundLanguageChoices || [],
        ) &&
        getEquipmentOptions(
          getJsonField(background, "startingEquipmentJson", "starting_equipment_json"),
        ).some((option) => option.id === character.backgroundEquipmentOption) &&
        areOriginFeatChoicesComplete(originFeat, character)
      );
    }
    if (stepNum === 3) {
      if (!character.classId) return false;
      const selectedClass = classes.find((c: any) => c.id === character.classId);
      if (!selectedClass) return false;
      const classSubclasses = subclasses.filter((s: any) => s.classId === character.classId);
      const subclassLevel = getSubclassChoiceLevel(classSubclasses);

      const unlockedFeatureOptions = getUnlockedFeatureOptionGroups(
        character,
        classFeatures,
        skillOptions,
      );
      if (!areFeatureChoicesComplete(unlockedFeatureOptions, character.featureChoices || {}))
        return false;

      const skillGroups = getProficiencyChoiceGroups(
        parseJsonValue(selectedClass.proficienciesJson, {}),
        "skills",
        skillOptions,
      );
      if (!areChoiceGroupsComplete(skillGroups, character.classSkillChoices || [])) return false;

      return (
        subclasses.filter((s: any) => s.classId === character.classId).length === 0 ||
        character.level < subclassLevel ||
        character.subclassId !== null
      );
    }
    if (stepNum === 4) {
      const method = character.abilitiesMethod || "standard";
      if (method === "standard") {
        const sortedVals = Object.values(character.abilities).sort((a, b) => a - b);
        const expected = [8, 10, 12, 13, 14, 15];
        return sortedVals.length === 6 && sortedVals.every((v, i) => v === expected[i]);
      } else if (method === "pointbuy") {
        const spent = getPointsUsed(character.abilities);
        const outOfRange = Object.values(character.abilities).some((v) => v < 8 || v > 15);
        return !outOfRange && spent === 27;
      } else if (method === "roll") {
        const outOfRange = Object.values(character.abilities).some((v) => v < 3 || v > 18);
        const incomplete = Object.values(character.abilities).some((v) => !v || v <= 0);
        return !incomplete && !outOfRange;
      }
      return false;
    }
    if (stepNum === 5) {
      return true;
    }
    if (stepNum === 6) {
      return isSpellStepValid(character, classes);
    }
    if (stepNum === 7) {
      return true;
    }
    if (stepNum === 8) {
      return true;
    }
    if (stepNum === 9) {
      return validationIssues.length === 0;
    }
    return true;
  };
  const isStepValid = () => isStepValidAt(step);

  return (
    <div
      className="container mx-auto p-4 md:p-8 min-h-screen animate-in fade-in duration-700"
      style={{ "--primary": getThemeHex(theme.text) } as React.CSSProperties}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] via-background to-background -z-10"
        style={{
          backgroundImage: `radial-gradient(ellipse at top, ${getThemeHex(theme.text)}1a, transparent 70%)`,
        }}
      />

      <div className="flex items-center gap-4 mb-10 relative w-full">
        <div
          className="absolute -left-10 top-1/2 -translate-y-1/2 w-32 h-32 blur-[50px] rounded-full -z-10"
          style={{ backgroundColor: `${getThemeHex(theme.text)}33` }}
        />
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
        <div className="ml-auto flex items-center gap-3">
          <ThemeSelector />
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const confirmed = await confirm({
                title: "Reset Draft",
                message:
                  "Are you sure you want to reset your character draft? All unsaved progress will be lost.",
                variant: "destructive",
                confirmText: "Reset Draft",
              });
              if (confirmed) {
                localStorage.removeItem("party_stats_forge_draft");
                window.location.reload();
              }
            }}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all text-xs font-bold border border-transparent hover:border-destructive/20 rounded-md px-3 py-1.5"
          >
            Reset Draft
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-8 max-w-4xl mx-auto">
          <SourceFiltersPanel
            policy={character.sourcePolicy || DEFAULT_SOURCE_POLICY}
            toggles={character.contentToggles || DEFAULT_CONTENT_TOGGLES}
            onChangePolicy={(p) => setCharacter({ ...character, sourcePolicy: p })}
            onChangeToggles={(t) => setCharacter({ ...character, contentToggles: t })}
          />
        </div>
      )}

      <div className="flex gap-1.5 sm:gap-2 mb-10 max-w-4xl mx-auto">
        {[
          { id: 1, label: "Species", icon: User },
          { id: 2, label: "Origin", icon: BookOpen },
          { id: 3, label: "Class", icon: Swords },
          { id: 4, label: "Stats", icon: Dices },
          { id: 5, label: "Feats", icon: BookOpen },
          { id: 6, label: "Spells", icon: Wand2 },
          { id: 7, label: "Equipment", icon: Swords },
          { id: 8, label: "Bio", icon: FileText },
          { id: 9, label: "Review", icon: Save },
        ].map((s) => {
          const valid = isStepValidAt(s.id);
          return (
            <div
              key={s.id}
              className={`flex-1 flex flex-col items-center p-1.5 sm:p-2.5 md:p-3 rounded-xl transition-all duration-500 relative overflow-hidden cursor-pointer ${
                step === s.id
                  ? `${theme.bgActive} ${theme.text} scale-105`
                  : "bg-secondary/30 text-foreground/80 hover:bg-secondary/50"
              }`}
              style={step === s.id ? { boxShadow: `0 0 20px ${getThemeHex(theme.text)}26` } : {}}
              onClick={() => setStep(s.id)}
            >
              {step === s.id && (
                <div className="absolute inset-0 bg-gradient-to-t from-current/5 to-transparent pointer-events-none" />
              )}
              {valid && s.id < 10 && (
                <div
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-black shadow-sm animate-in zoom-in duration-300"
                  style={{ backgroundColor: getThemeHex(theme.text) }}
                >
                  ✓
                </div>
              )}
              <s.icon
                className={`h-5 w-5 sm:h-6 md:h-7 sm:w-6 md:w-7 mb-1 transition-transform duration-300 ${step === s.id ? "scale-110" : ""}`}
                style={
                  step === s.id ? { filter: `drop-shadow(0 0 8px ${getThemeHex(theme.text)})` } : {}
                }
              />
              <span className="hidden sm:block text-[8px] md:text-[10px] lg:text-xs font-black uppercase tracking-wider text-center w-full whitespace-nowrap">
                {s.label}
              </span>
              {step > s.id && (
                <div
                  className="absolute bottom-0 left-0 w-full h-1"
                  style={{ backgroundColor: `${getThemeHex(theme.text)}50` }}
                />
              )}
              {step === s.id && (
                <div
                  className="absolute bottom-0 left-0 w-full h-1"
                  style={{
                    backgroundColor: getThemeHex(theme.text),
                    boxShadow: `0 0 10px ${getThemeHex(theme.text)}`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-8 shadow-2xl min-h-[50vh] relative overflow-hidden ring-1 ring-white/5">
        <div
          className="absolute top-0 left-0 w-full h-1"
          style={{
            backgroundImage: `linear-gradient(to right, transparent, ${getThemeHex(theme.text)}50, transparent)`,
          }}
        />
        {step === 1 && (
          <StepRace character={character} updateCharacter={updateCharacter} theme={theme} />
        )}
        {step === 2 && (
          <StepBackground character={character} updateCharacter={updateCharacter} theme={theme} />
        )}
        {step === 3 && (
          <StepClass character={character} updateCharacter={updateCharacter} theme={theme} />
        )}
        {step === 4 && (
          <StepAbilities character={character} updateCharacter={updateCharacter} theme={theme} />
        )}
        {step === 5 && (
          <StepFeats character={character} updateCharacter={updateCharacter} theme={theme} />
        )}
        {step === 6 && (
          <StepSpells character={character} updateCharacter={updateCharacter} theme={theme} />
        )}
        {step === 7 && (
          <StepEquipment character={character} updateCharacter={updateCharacter} theme={theme} />
        )}
        {step === 8 && (
          <StepBiography character={character} updateCharacter={updateCharacter} theme={theme} />
        )}
        {step === 9 && (
          <StepReview character={character} validationIssues={validationIssues} theme={theme} />
        )}
      </div>

      <div className="flex justify-between mt-8 max-w-4xl mx-auto">
        <Button variant="outline" onClick={prevStep} disabled={step === 1}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        {step < 9 ? (
          <Button onClick={nextStep} disabled={!isStepValid()} className={theme.primaryBtn}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={saveCharacter}
            disabled={validationIssues.length > 0}
            className={theme.primaryBtn}
          >
            Save Character <Save className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
