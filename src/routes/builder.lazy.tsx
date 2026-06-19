import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/button";

import {
  BuilderState,
  getBuilderValidationIssues,
  areTraitGroupsComplete,
  getSpeciesTraitGroups,
  getJsonField,
  areChoiceGroupsComplete,
  getProficiencyChoiceGroups,
  isValidAbilityBonusSet,
  getToolChoiceGroups,
  getEquipmentOptions,
  areOriginFeatChoicesComplete,
  parseJsonValue,
  getSubclassChoiceLevel,
  getUnlockedFeatureOptionGroups,
  areFeatureChoicesComplete,
  isSpellStepValid,
} from "@/components/builder/BuilderUtils";
import { SKILL_OPTIONS, TOOL_OPTIONS } from "@/components/builder/BuilderConstants";
import {
  StepRace,
  StepBackground,
  StepClass,
  StepAbilities,
  StepSpells,
  StepReview,
} from "@/components/builder/WizardSteps";

export const Route = createLazyFileRoute("/builder")({
  component: BuilderWizard,
});

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
