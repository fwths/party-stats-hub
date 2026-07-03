import { DatabaseZap, RefreshCw, ShieldCheck, Star, Wifi } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CharacterCard } from "@/components/party/CharacterCard";
import { CharacterDetailView } from "@/components/party/CharacterDetailView";
import type { PartyMember, PreparedSpell, SpellSlotLevel } from "@/lib/dndbeyond.types";
import {
  addCharacterV3ConditionFn,
  applyCharacterV3LevelUpFn,
  applyCharacterV3DamageFn,
  bootstrapMotherOfBobV3Fn,
  getMotherOfBobDevIdentityFn,
  grantCharacterV3TemporaryHitPointsFn,
  getCharacterV3LevelUpPlanFn,
  recoverCharacterV3ResourcesFn,
  recordCharacterV3DeathSaveFn,
  removeCharacterV3ConditionFn,
  reviewCharacterV3LevelUpDecisionFn,
  selectMotherOfBobDevIdentityFn,
  setCharacterV3ExhaustionFn,
  setCharacterV3InspirationFn,
  spendCharacterV3ResourceFn,
  restoreCharacterV3HitPointsFn,
  stabilizeCharacterV3Fn,
  takeCharacterV3LongRestFn,
  takeCharacterV3ShortRestFn,
  mutateCharacterV3ItemFn,
  addCharacterV3CatalogItemFn,
} from "@/lib/character-v3/sync-functions";
import { maximumHitPoints } from "@/lib/character-v3/schema";
import { maximumAttunedItems } from "@/lib/character-v3/item-operations";
import { deriveLevelUpDecisionPlan } from "@/lib/character-v3/level-up-planner";
import type { LevelUpHitPointPlan } from "@/lib/character-v3/level-up-hp";
import type {
  LevelUpProgressionRequirement,
  UnsupportedLevelUpProgression,
} from "@/lib/character-v3/level-up-progression";
import type { LevelUpSubclassPlan } from "@/lib/character-v3/level-up-subclass";
import type { LevelUpSpellChoicePlan } from "@/lib/character-v3/level-up-spells";
import type { LevelUpFeaturePlan } from "@/lib/character-v3/level-up-features";
import type {
  GrantedSpellChoicePlan,
  GrantedSpellParseResult,
} from "@/lib/character-v3/level-up-granted-spells";
import { useCharacterV3CampaignSync } from "@/hooks/useCharacterV3CampaignSync";
import { parseCharacterV3PublicError } from "@/lib/character-v3/public-errors";

const MOB_CAMPAIGN_ID = "mother-of-bob";

const MOB_ORDER = [
  "mob:character:97349530",
  "mob:character:131296315",
  "mob:character:131593533",
  "mob:character:132900149",
  "mob:character:132940690",
] as const;

const MOB_DIAGNOSTIC_USERS = [
  { id: "qemuel", label: "Fotis / Qem" },
  { id: "nikos", label: "Nikos / Willow" },
  { id: "eleni", label: "Eleni / Ari" },
  { id: "alexia", label: "Alexia / Echo" },
  { id: "andreas", label: "Andreas / Dresana" },
  { id: "danny", label: "Danny / DM" },
] as const;

const MOB_PLAYER_NAMES: Record<string, string> = {
  qemuel: "Fotis",
  nikos: "Nikos",
  eleni: "Eleni",
  alexia: "Alexia",
  andreas: "Andreas",
  danny: "Danny",
};

type MobDiagnosticUserId = (typeof MOB_DIAGNOSTIC_USERS)[number]["id"];
type SyncedCharacter = NonNullable<
  ReturnType<typeof useCharacterV3CampaignSync>["state"]["charactersById"][string]
>;
type RecoveryTrigger = "short-rest" | "long-rest" | "dawn" | "manual";
type DeathSaveResult = "success" | "failure" | "critical-success" | "critical-failure";

export function CharacterV3SyncPanel({ legacyMembers }: { legacyMembers: PartyMember[] }) {
  const showDevelopmentTools = import.meta.env.DEV;
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isSelectingActor, setIsSelectingActor] = useState(false);
  const [selectedActorUserId, setSelectedActorUserId] = useState<MobDiagnosticUserId>("qemuel");
  const [activeActorUserId, setActiveActorUserId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mutatingCharacterId, setMutatingCharacterId] = useState<string | null>(null);
  const [conditionDrafts, setConditionDrafts] = useState<Record<string, string>>({});
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [bootstrapMessage, setBootstrapMessage] = useState<string | null>(null);
  const [catalogLevelUpPlan, setCatalogLevelUpPlan] = useState<
    | (ReturnType<typeof deriveLevelUpDecisionPlan> & {
        hitPoints: LevelUpHitPointPlan;
        subclassPlan: LevelUpSubclassPlan;
        progressionRequirements: LevelUpProgressionRequirement[];
        unsupportedProgression: UnsupportedLevelUpProgression[];
        spellChoicePlans: LevelUpSpellChoicePlan[];
        featurePlan: LevelUpFeaturePlan;
        subclassFeaturePlans: Array<LevelUpFeaturePlan & { subclassVersionKey: string }>;
        grantedSpellPlan: GrantedSpellParseResult & { choicePlans: GrantedSpellChoicePlan[] };
        subclassGrantedSpellPlans: Array<
          GrantedSpellParseResult & {
            subclassVersionKey: string;
            choicePlans: GrantedSpellChoicePlan[];
          }
        >;
      })
    | null
  >(null);
  const [levelUpChoiceMode, setLevelUpChoiceMode] = useState<"asi" | "feat">("asi");
  const [selectedAsiIndex, setSelectedAsiIndex] = useState(0);
  const [selectedFeatVersionKey, setSelectedFeatVersionKey] = useState("");
  const [selectedSubclassVersionKey, setSelectedSubclassVersionKey] = useState("");
  const [levelUpReview, setLevelUpReview] = useState<string | null>(null);
  const [isReviewingLevelUp, setIsReviewingLevelUp] = useState(false);
  const [isApplyingLevelUp, setIsApplyingLevelUp] = useState(false);
  const [levelUpHpMethod, setLevelUpHpMethod] = useState<"fixed" | "rolled">("fixed");
  const [levelUpHpRoll, setLevelUpHpRoll] = useState(1);
  const [levelUpSpellSelections, setLevelUpSpellSelections] = useState<Record<number, string[]>>(
    {},
  );
  const [levelUpFeatureSelections, setLevelUpFeatureSelections] = useState<
    Record<string, string[]>
  >({});
  const [levelUpGrantedSpellSelections, setLevelUpGrantedSpellSelections] = useState<
    Record<string, string[]>
  >({});
  const [selectedGrantedSpellVariant, setSelectedGrantedSpellVariant] = useState("");
  const sync = useCharacterV3CampaignSync({
    campaignId: MOB_CAMPAIGN_ID,
    enabled: Boolean(activeActorUserId),
    pollMs: 5_000,
  });

  const characters = useMemo(
    () =>
      MOB_ORDER.map((id) => sync.state.charactersById[id]).filter(
        (character): character is NonNullable<typeof character> => Boolean(character),
      ),
    [sync.state.charactersById],
  );
  const adaptedPartyMembers = useMemo(
    () =>
      characters
        .map((character) => adaptSyncedCharacterToPartyMember(character, legacyMembers))
        .filter((member): member is PartyMember => Boolean(member)),
    [characters, legacyMembers],
  );
  const selectedCharacter = selectedCharacterId
    ? (sync.state.charactersById[selectedCharacterId] ?? null)
    : null;
  const activeFeaturePlan = useMemo(() => {
    if (!catalogLevelUpPlan) return null;
    if (!selectedSubclassVersionKey) return catalogLevelUpPlan.featurePlan;
    return (
      catalogLevelUpPlan.subclassFeaturePlans.find(
        (plan) => plan.subclassVersionKey === selectedSubclassVersionKey,
      ) ?? catalogLevelUpPlan.featurePlan
    );
  }, [catalogLevelUpPlan, selectedSubclassVersionKey]);
  const activeGrantedSpellPlan = useMemo(() => {
    if (!catalogLevelUpPlan) return null;
    if (!selectedSubclassVersionKey) return catalogLevelUpPlan.grantedSpellPlan;
    return (
      catalogLevelUpPlan.subclassGrantedSpellPlans.find(
        (plan) => plan.subclassVersionKey === selectedSubclassVersionKey,
      ) ?? catalogLevelUpPlan.grantedSpellPlan
    );
  }, [catalogLevelUpPlan, selectedSubclassVersionKey]);
  const selectedLevelUpPlan = useMemo(() => {
    if (!selectedCharacter) return null;
    const classVersionKey = selectedCharacter.build.levels.at(-1)?.classRef.versionKey;
    if (!classVersionKey) return null;
    return deriveLevelUpDecisionPlan({ character: selectedCharacter, classVersionKey });
  }, [selectedCharacter]);
  const selectedDetailMember = selectedCharacter
    ? adaptSyncedCharacterToPartyMember(selectedCharacter, legacyMembers)
    : null;

  useEffect(() => {
    let cancelled = false;
    async function hydrateActor() {
      try {
        const result = await getMotherOfBobDevIdentityFn();
        if (cancelled || !result.actorUserId) return;
        setActiveActorUserId(result.actorUserId);
        setSelectedActorUserId(result.actorUserId);
      } catch {
        if (!cancelled) setActiveActorUserId(null);
      }
    }
    void hydrateActor();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCharacterId) return;
    const previousOverflow = document.body.style.overflow;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedCharacterId(null);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)].filter(
        (element) => !element.hidden && element.getClientRects().length > 0,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleDialogKeys);
    const frame = window.requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
      (first ?? dialogRef.current)?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleDialogKeys);
      opener?.focus();
    };
  }, [selectedCharacterId]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLevelUpPlan(null);
    if (!selectedCharacter) return;
    const classVersionKey = selectedCharacter.build.levels.at(-1)?.classRef.versionKey;
    if (!classVersionKey) return;
    void getCharacterV3LevelUpPlanFn({
      data: { characterId: selectedCharacter.identity.id, classVersionKey },
    })
      .then((plan) => {
        if (!cancelled) setCatalogLevelUpPlan(plan);
      })
      .catch(() => {
        if (!cancelled) setCatalogLevelUpPlan(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCharacter]);

  useEffect(() => {
    setLevelUpChoiceMode("asi");
    setSelectedAsiIndex(0);
    setSelectedFeatVersionKey("");
    setSelectedSubclassVersionKey("");
    setLevelUpReview(null);
    setLevelUpHpMethod("fixed");
    setLevelUpHpRoll(1);
    setLevelUpSpellSelections({});
    setLevelUpFeatureSelections({});
    setLevelUpGrantedSpellSelections({});
    setSelectedGrantedSpellVariant("");
  }, [selectedCharacterId]);

  async function handleReviewLevelUp() {
    if (!selectedCharacter || !catalogLevelUpPlan) return;
    if (!levelUpProgressionSupported(catalogLevelUpPlan)) {
      setLevelUpReview(
        `Level-up is blocked until unsupported progression is modeled: ${catalogLevelUpPlan.unsupportedProgression
          .map((blocker) => blocker.label)
          .join(", ")}.`,
      );
      return;
    }
    const classVersionKey = selectedCharacter.build.levels.at(-1)?.classRef.versionKey;
    if (!classVersionKey) return;
    const allocation = catalogLevelUpPlan.asiAllocations[selectedAsiIndex];
    if (catalogLevelUpPlan.requiresAsiOrFeat && levelUpChoiceMode === "asi" && !allocation) return;
    if (
      catalogLevelUpPlan.requiresAsiOrFeat &&
      levelUpChoiceMode === "feat" &&
      !selectedFeatVersionKey
    )
      return;
    if (catalogLevelUpPlan.subclassPlan.requiresSubclass && selectedSubclassVersionKey.length === 0)
      return;
    if (!levelUpFeatureChoicesComplete()) return;
    if (!levelUpGrantedSpellsSupported()) return;
    const levelUpFingerprint = {
      classVersionKey,
      levelUpChoiceMode,
      allocation,
      selectedFeatVersionKey,
      selectedSubclassVersionKey,
      levelUpHpMethod,
      levelUpHpRoll,
      levelUpSpellSelections,
      levelUpFeatureSelections,
      levelUpGrantedSpellSelections,
      selectedGrantedSpellVariant,
    };
    setIsReviewingLevelUp(true);
    setLevelUpReview(null);
    try {
      const result = await reviewCharacterV3LevelUpDecisionFn({
        data: {
          characterId: selectedCharacter.identity.id,
          classVersionKey,
          selection: !catalogLevelUpPlan.requiresAsiOrFeat
            ? { mode: "none" }
            : levelUpChoiceMode === "asi"
              ? { mode: "asi", allocation }
              : { mode: "feat", featVersionKey: selectedFeatVersionKey },
          subclassSelection: catalogLevelUpPlan.subclassPlan.requiresSubclass
            ? { mode: "subclass", subclassVersionKey: selectedSubclassVersionKey }
            : { mode: "none" },
          hitPoints:
            levelUpHpMethod === "fixed"
              ? { method: "fixed" }
              : { method: "rolled", roll: levelUpHpRoll },
          spellSelections: catalogLevelUpPlan.spellChoicePlans.map((plan, index) => ({
            index,
            selectedSpellVersionKeys: levelUpSpellSelections[index] ?? [],
          })),
          featureSelections: activeFeaturePlan!.choiceGroups.map((group) => ({
            groupId: group.id,
            selectedOptionVersionKeys: levelUpFeatureSelections[group.id] ?? [],
          })),
          grantedSpellSelections: activeGrantedSpellPlan!.choicePlans.map((plan) => ({
            requirementId: plan.id,
            selectedSpellVersionKeys: levelUpGrantedSpellSelections[plan.id] ?? [],
          })),
          grantedSpellVariant: selectedGrantedSpellVariant || null,
        },
      });
      const selectedSpellCount = result.spellSelections.reduce(
        (sum, selection) => sum + selection.spells.length,
        0,
      );
      const remaining =
        result.progressionRequirements.length > 0
          ? ` Remaining required choices: ${result.progressionRequirements.map((entry) => entry.label).join(", ")}.`
          : "";
      setLevelUpReview(
        `${result.decision ? (result.decision.type === "ability-score-increase" ? "ASI" : "Feat") + ", " : ""}${result.hitPoints.method} HP${selectedSpellCount > 0 ? `, and ${selectedSpellCount} spell choice${selectedSpellCount === 1 ? "" : "s"}` : ""} validated at build revision ${result.expectedRevision.build}.${remaining}`,
      );
    } catch (error) {
      setLevelUpReview(error instanceof Error ? error.message : "Level-up review failed");
    } finally {
      setIsReviewingLevelUp(false);
    }
  }

  async function handleApplyLevelUp() {
    if (!selectedCharacter || !catalogLevelUpPlan) return;
    if (!levelUpProgressionSupported(catalogLevelUpPlan)) {
      setLevelUpReview(
        `Level-up is blocked until unsupported progression is modeled: ${catalogLevelUpPlan.unsupportedProgression
          .map((blocker) => blocker.label)
          .join(", ")}.`,
      );
      return;
    }
    const classVersionKey = selectedCharacter.build.levels.at(-1)?.classRef.versionKey;
    if (!classVersionKey) return;
    const allocation = catalogLevelUpPlan.asiAllocations[selectedAsiIndex];
    if (catalogLevelUpPlan.requiresAsiOrFeat && levelUpChoiceMode === "asi" && !allocation) return;
    if (
      catalogLevelUpPlan.requiresAsiOrFeat &&
      levelUpChoiceMode === "feat" &&
      !selectedFeatVersionKey
    )
      return;
    if (catalogLevelUpPlan.subclassPlan.requiresSubclass && selectedSubclassVersionKey.length === 0)
      return;
    if (!levelUpSpellChoicesComplete(catalogLevelUpPlan)) return;
    if (!levelUpFeatureChoicesComplete()) return;
    if (!levelUpGrantedSpellsSupported()) return;
    setIsApplyingLevelUp(true);
    setLevelUpReview(null);
    try {
      const result = await applyCharacterV3LevelUpFn({
        data: {
          characterId: selectedCharacter.identity.id,
          classVersionKey,
          mutationId: stableMutationId(selectedCharacter, "level-up", levelUpFingerprint),
          expectedRevision: revisionInput(selectedCharacter),
          selection: !catalogLevelUpPlan.requiresAsiOrFeat
            ? { mode: "none" }
            : levelUpChoiceMode === "asi"
              ? { mode: "asi", allocation }
              : { mode: "feat", featVersionKey: selectedFeatVersionKey },
          subclassSelection: catalogLevelUpPlan.subclassPlan.requiresSubclass
            ? { mode: "subclass", subclassVersionKey: selectedSubclassVersionKey }
            : { mode: "none" },
          hitPoints:
            levelUpHpMethod === "fixed"
              ? { method: "fixed" }
              : { method: "rolled", roll: levelUpHpRoll },
          spellSelections: catalogLevelUpPlan.spellChoicePlans.map((plan, index) => ({
            index,
            selectedSpellVersionKeys: levelUpSpellSelections[index] ?? [],
          })),
          featureSelections: activeFeaturePlan!.choiceGroups.map((group) => ({
            groupId: group.id,
            selectedOptionVersionKeys: levelUpFeatureSelections[group.id] ?? [],
          })),
          grantedSpellSelections: activeGrantedSpellPlan!.choicePlans.map((plan) => ({
            requirementId: plan.id,
            selectedSpellVersionKeys: levelUpGrantedSpellSelections[plan.id] ?? [],
          })),
          grantedSpellVariant: selectedGrantedSpellVariant || null,
        },
      });
      await sync.refresh();
      setLevelUpReview(
        `Level-up applied. Build ${result.event.expectedRevision?.build ?? "?"} → ${result.event.resultingRevision.build}; live ${result.event.expectedRevision?.liveState ?? "?"} → ${result.event.resultingRevision.liveState}.`,
      );
    } catch (error) {
      const publicError = parseCharacterV3PublicError(error);
      const message = publicError?.message ?? (error instanceof Error ? error.message : "Level-up apply failed");
      if (publicError?.code === "REVISION_CONFLICT") {
        await sync.refresh();
        setLevelUpReview("The sheet changed in another browser. It has been refreshed; review the level-up again before applying it.");
      } else {
        setLevelUpReview(message);
      }
    } finally {
      setIsApplyingLevelUp(false);
    }
  }

  async function handleSelectActor() {
    setIsSelectingActor(true);
    setBootstrapMessage(null);
    try {
      const result = await selectMotherOfBobDevIdentityFn({
        data: { actorUserId: selectedActorUserId },
      });
      setActiveActorUserId(result.actorUserId);
      setBootstrapMessage(`Local test identity set to ${result.actorUserId}.`);
      await sync.refresh();
    } catch (error) {
      setBootstrapMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSelectingActor(false);
    }
  }

  async function handleBootstrap() {
    setIsBootstrapping(true);
    setBootstrapMessage(null);
    try {
      const result = await bootstrapMotherOfBobV3Fn();
      const initialized = result.characters.filter(
        (entry) => entry.action === "initialized",
      ).length;
      const existing = result.characters.filter(
        (entry) => entry.action === "already-present",
      ).length;
      setBootstrapMessage(
        initialized > 0
          ? `Initialized ${initialized} synchronized sheets. ${existing} were already present.`
          : `Synchronized sheets already present for all ${existing} Mother of Bob characters.`,
      );
      await sync.refresh();
    } catch (error) {
      setBootstrapMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBootstrapping(false);
    }
  }

  function canMutate(character: SyncedCharacter) {
    return character.identity.ownerUserId === activeActorUserId;
  }

  function setLevelUpSpellSelection(planIndex: number, slotIndex: number, versionKey: string) {
    setLevelUpSpellSelections((current) => {
      const nextForPlan = [...(current[planIndex] ?? [])];
      nextForPlan[slotIndex] = versionKey;
      return { ...current, [planIndex]: nextForPlan };
    });
  }

  function setLevelUpFeatureSelection(groupId: string, slotIndex: number, versionKey: string) {
    setLevelUpFeatureSelections((current) => {
      const nextForGroup = [...(current[groupId] ?? [])];
      nextForGroup[slotIndex] = versionKey;
      return { ...current, [groupId]: nextForGroup };
    });
  }

  function levelUpFeatureChoicesComplete(): boolean {
    if (!activeFeaturePlan || activeFeaturePlan.unsupportedSemantics.length > 0) return false;
    return activeFeaturePlan.choiceGroups.every((group) => {
      const selected = (levelUpFeatureSelections[group.id] ?? []).filter(Boolean);
      return selected.length === group.count && new Set(selected).size === selected.length;
    });
  }

  function levelUpGrantedSpellsSupported(): boolean {
    return Boolean(
      activeGrantedSpellPlan &&
      activeGrantedSpellPlan.blockers.length === 0 &&
      (activeGrantedSpellPlan.variantChoices.length === 0 ||
        activeGrantedSpellPlan.selectedVariant !== null ||
        selectedGrantedSpellVariant.length > 0) &&
      activeGrantedSpellPlan.choicePlans.every((plan) => {
        const selected = (levelUpGrantedSpellSelections[plan.id] ?? []).filter(Boolean);
        return selected.length === plan.count && new Set(selected).size === selected.length;
      }),
    );
  }

  function setLevelUpGrantedSpellSelection(
    requirementId: string,
    slotIndex: number,
    versionKey: string,
  ) {
    setLevelUpGrantedSpellSelections((current) => {
      const next = [...(current[requirementId] ?? [])];
      next[slotIndex] = versionKey;
      return { ...current, [requirementId]: next };
    });
  }

  function levelUpSpellChoicesComplete(plan: NonNullable<typeof catalogLevelUpPlan>): boolean {
    return plan.spellChoicePlans.every((spellPlan, index) => {
      const selected = (levelUpSpellSelections[index] ?? []).filter(Boolean);
      return (
        spellPlan.readyToSelect &&
        selected.length === spellPlan.count &&
        new Set(selected).size === selected.length
      );
    });
  }

  function levelUpProgressionSupported(plan: NonNullable<typeof catalogLevelUpPlan>): boolean {
    return plan.unsupportedProgression.length === 0;
  }

  function revisionInput(character: SyncedCharacter) {
    return {
      build: character.build.revision,
      liveState: character.liveState.revision,
    };
  }

  function stableMutationId(character: SyncedCharacter, operation: string, payload?: unknown) {
    const source = JSON.stringify(payload ?? null);
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `mutation:${character.identity.id}:${operation}:b${character.build.revision}:l${character.liveState.revision}:${(hash >>> 0).toString(36)}`;
  }

  async function commitCharacterMutation(
    character: SyncedCharacter,
    action: () => Promise<unknown>,
    successMessage: string,
  ) {
    setMutatingCharacterId(character.identity.id);
    setBootstrapMessage(null);
    try {
      await action();
      await sync.refresh();
      setBootstrapMessage(successMessage);
    } catch (error) {
      const publicError = parseCharacterV3PublicError(error);
      const message = publicError?.message ?? (error instanceof Error ? error.message : String(error));
      if (publicError?.code === "REVISION_CONFLICT") {
        await sync.refresh();
        setBootstrapMessage(
          "The sheet changed in another browser. The latest version is now loaded; please retry your action.",
        );
      } else {
        setBootstrapMessage(message);
      }
    } finally {
      setMutatingCharacterId(null);
    }
  }

  async function handleToggleInspiration(character: SyncedCharacter) {
    await commitCharacterMutation(
      character,
      () =>
        setCharacterV3InspirationFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "toggle-inspiration", !character.liveState.inspiration),
            expectedRevision: revisionInput(character),
            inspiration: !character.liveState.inspiration,
          },
        }),
      `Toggled Inspiration for ${character.identity.name}.`,
    );
  }

  async function handleAdjustExhaustion(character: SyncedCharacter, delta: -1 | 1) {
    const exhaustion = Math.max(0, Math.min(6, character.liveState.exhaustion + delta));
    if (exhaustion === character.liveState.exhaustion) return;
    await commitCharacterMutation(
      character,
      () =>
        setCharacterV3ExhaustionFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "set-exhaustion", exhaustion),
            expectedRevision: revisionInput(character),
            exhaustion,
          },
        }),
      `Set Exhaustion for ${character.identity.name} to ${exhaustion}.`,
    );
  }

  async function handleSpendFirstResource(character: SyncedCharacter) {
    const resource = character.liveState.resources.find((entry) => entry.current > 0);
    if (!resource) return;
    await commitCharacterMutation(
      character,
      () =>
        spendCharacterV3ResourceFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "spend-resource", { key: resource.key, amount: 1 }),
            expectedRevision: revisionInput(character),
            resourceKey: resource.key,
            amount: 1,
          },
        }),
      `Spent 1 ${resource.label} for ${character.identity.name}.`,
    );
  }

  async function handleSpendResource(character: SyncedCharacter, resourceKey: string, amount = 1) {
    const resource = character.liveState.resources.find((entry) => entry.key === resourceKey);
    if (!resource || resource.current < amount || amount <= 0) return;
    await commitCharacterMutation(
      character,
      () =>
        spendCharacterV3ResourceFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "spend-resource", { key: resource.key, amount }),
            expectedRevision: revisionInput(character),
            resourceKey: resource.key,
            amount,
          },
        }),
      `Spent ${amount} ${resource.label} for ${character.identity.name}.`,
    );
  }

  async function handleRecoverResources(character: SyncedCharacter, trigger: RecoveryTrigger) {
    await commitCharacterMutation(
      character,
      () =>
        recoverCharacterV3ResourcesFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "recover", trigger),
            expectedRevision: revisionInput(character),
            trigger,
          },
        }),
      `Recovered ${trigger} resources for ${character.identity.name}.`,
    );
  }

  async function handleShortRest(
    character: SyncedCharacter,
    selectedByDie: Record<string, number>,
    hitPointsRestored: number,
  ) {
    if (character.liveState.hitDice.status !== "tracked") return;
    const remainingByDie = new Map(
      Object.entries(selectedByDie).map(([die, amount]) => [Number(die.replace(/^d/i, "")), amount]),
    );
    const hitDice: Array<{ classVersionKey: string; amount: number }> = [];
    for (const pool of character.liveState.hitDice.pools) {
      const requested = remainingByDie.get(pool.die) ?? 0;
      const amount = Math.min(requested, pool.remaining);
      if (amount > 0) hitDice.push({ classVersionKey: pool.classVersionKey, amount });
      remainingByDie.set(pool.die, requested - amount);
    }
    await commitCharacterMutation(
      character,
      () =>
        takeCharacterV3ShortRestFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "short-rest", { hitDice, hitPointsRestored }),
            expectedRevision: revisionInput(character),
            hitDice,
            hitPointsRestored,
          },
        }),
      `Completed a Short Rest for ${character.identity.name}.`,
    );
  }

  async function handleLongRest(character: SyncedCharacter) {
    await commitCharacterMutation(
      character,
      () =>
        takeCharacterV3LongRestFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "long-rest"),
            expectedRevision: revisionInput(character),
          },
        }),
      `Completed a Long Rest for ${character.identity.name}.`,
    );
  }

  async function handleMutateItem(
    character: SyncedCharacter,
    itemId: string,
    operation: "set-equipped" | "set-attuned" | "set-quantity" | "remove-item",
    value?: boolean | number,
  ) {
    await commitCharacterMutation(
      character,
      () =>
        mutateCharacterV3ItemFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "item", { itemId, operation, value }),
            expectedRevision: revisionInput(character),
            itemId,
            operation,
            ...(operation === "set-equipped"
              ? { equipped: value as boolean }
              : operation === "set-attuned"
                ? { attuned: value as boolean }
                : operation === "set-quantity"
                  ? { quantity: value as number }
                  : {}),
          },
        }),
      `Updated ${character.identity.name}'s inventory.`,
    );
  }

  async function handleAddCatalogItem(
    character: SyncedCharacter,
    catalogKind: "weapon" | "armor" | "magic-item",
    catalogId: string,
    quantity: number,
  ) {
    await commitCharacterMutation(
      character,
      () =>
        addCharacterV3CatalogItemFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "add-catalog-item", { catalogKind, catalogId, quantity }),
            expectedRevision: revisionInput(character),
            catalogKind,
            catalogId,
            quantity,
          },
        }),
      `Added an item to ${character.identity.name}'s inventory.`,
    );
  }

  async function handleApplyDamage(character: SyncedCharacter, amount: number) {
    await commitCharacterMutation(
      character,
      () =>
        applyCharacterV3DamageFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "damage", amount),
            expectedRevision: revisionInput(character),
            amount,
            criticalHit: false,
          },
        }),
      `Applied ${amount} damage to ${character.identity.name}.`,
    );
  }

  async function handleRestoreHitPoints(character: SyncedCharacter, amount: number) {
    await commitCharacterMutation(
      character,
      () =>
        restoreCharacterV3HitPointsFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "heal", amount),
            expectedRevision: revisionInput(character),
            amount,
          },
        }),
      `Restored ${amount} HP to ${character.identity.name}.`,
    );
  }

  async function handleGrantTemporaryHitPoints(character: SyncedCharacter, amount: number) {
    await commitCharacterMutation(
      character,
      () =>
        grantCharacterV3TemporaryHitPointsFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "temp-hp", amount),
            expectedRevision: revisionInput(character),
            amount,
          },
        }),
      `Set ${character.identity.name}'s temporary HP to ${amount}.`,
    );
  }

  async function handleRecordDeathSave(character: SyncedCharacter, result: DeathSaveResult) {
    await commitCharacterMutation(
      character,
      () =>
        recordCharacterV3DeathSaveFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "death-save", result),
            expectedRevision: revisionInput(character),
            result,
          },
        }),
      `Recorded a death save ${result} for ${character.identity.name}.`,
    );
  }

  async function handleStabilize(character: SyncedCharacter) {
    await commitCharacterMutation(
      character,
      () =>
        stabilizeCharacterV3Fn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "stabilize"),
            expectedRevision: revisionInput(character),
          },
        }),
      `Stabilized ${character.identity.name}.`,
    );
  }

  async function handleAddCondition(character: SyncedCharacter, explicitLabel?: string) {
    const label = (explicitLabel ?? conditionDrafts[character.identity.id])?.trim();
    if (!label) return;
    if (
      character.liveState.conditions.some(
        (condition) => condition.label.toLocaleLowerCase() === label.toLocaleLowerCase(),
      )
    ) {
      setBootstrapMessage(`${character.identity.name} already has ${label}.`);
      return;
    }
    const mutationId = stableMutationId(character, "add-condition", label.toLocaleLowerCase());
    await commitCharacterMutation(
      character,
      () =>
        addCharacterV3ConditionFn({
          data: {
            characterId: character.identity.id,
            mutationId,
            expectedRevision: revisionInput(character),
            condition: {
              id: `condition:${mutationId}`,
              conditionRef: null,
              label,
              sourceLabel: "MOB table state",
              appliedByUserId: null,
            },
          },
        }),
      `Added ${label} to ${character.identity.name}.`,
    );
    if (!explicitLabel) {
      setConditionDrafts((current) => ({ ...current, [character.identity.id]: "" }));
    }
  }

  async function handleRemoveCondition(character: SyncedCharacter, conditionId: string) {
    await commitCharacterMutation(
      character,
      () =>
        removeCharacterV3ConditionFn({
          data: {
            characterId: character.identity.id,
            mutationId: stableMutationId(character, "remove-condition", conditionId),
            expectedRevision: revisionInput(character),
            conditionId,
          },
        }),
      `Removed condition from ${character.identity.name}.`,
    );
  }

  return (
    <section className="card-arcane rounded-xl border border-border p-5 shadow-xl">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-accent/90">
            <Wifi size={15} className="text-accent" />
            <span>Mother of Bob · Live Party</span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            The shared party table. Everyone sees live state; each player controls their own
            character. Rules and character facts come from the native campaign authority.
          </p>
        </div>

      </div>

      {showDevelopmentTools && (
        <details className="mb-5 rounded-lg border border-border/30 bg-secondary/10">
          <summary className="cursor-pointer px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Development tools
          </summary>
          <div className="border-t border-border/30 p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBootstrap}
                disabled={isBootstrapping}
              >
                <DatabaseZap className={isBootstrapping ? "animate-pulse" : ""} />
                Initialize MOB Sheets
              </Button>
              <Button variant="outline" size="sm" onClick={sync.refresh} disabled={sync.isPolling}>
                <RefreshCw className={sync.isPolling ? "animate-spin" : ""} />
                Refresh Sync
              </Button>
            </div>
            <div className="rounded-lg border border-border/40 bg-secondary/15 p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Local Test Identity
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Development-only helper for testing several party members in one browser. Real
                    party logins use their own stable identity.
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground"
                    value={selectedActorUserId}
                    onChange={(event) =>
                      setSelectedActorUserId(event.target.value as MobDiagnosticUserId)
                    }
                  >
                    {MOB_DIAGNOSTIC_USERS.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSelectActor}
                    disabled={isSelectingActor}
                  >
                    {isSelectingActor ? "Selecting..." : "Use Identity"}
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                Active test identity: {activeActorUserId ?? "not selected"} · Owner-only buttons
                unlock only for that character.
              </div>
            </div>

            <div className="mb-4 grid gap-3 text-xs sm:grid-cols-3">
              <Metric label="Cursor" value={sync.summary.cursor.toString()} />
              <Metric label="Events Applied" value={sync.summary.eventCount.toString()} />
              <Metric label="Sheets Loaded" value={`${sync.summary.characterCount}/5`} />
            </div>
          </div>
        </details>
      )}

      {(bootstrapMessage || sync.lastError) && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          role={sync.lastError ? "alert" : "status"}
          aria-live={sync.lastError ? "assertive" : "polite"}
          className="mb-4 rounded-lg border border-border/40 bg-secondary/25 px-3 py-2 text-xs text-muted-foreground"
        >
          {sync.lastError ? sync.lastError.message : bootstrapMessage}
        </div>
      )}

      {characters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-secondary/10 p-5 text-center text-sm text-muted-foreground">
          {activeActorUserId
            ? showDevelopmentTools
              ? "No synchronized party sheets loaded yet. Use development tools to initialize the Mother of Bob campaign once."
              : "No synchronized party sheets are loaded yet."
            : showDevelopmentTools
              ? "Sign in as a party member, or choose a local test identity from development tools."
              : "Sign in as a Mother of Bob party member to view the shared table."}
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4">
          {characters.map((character) => {
            const firstSpendableResource = character.liveState.resources.find(
              (entry) => entry.current > 0,
            );
            const ownedByActiveActor = canMutate(character);
            const atZeroHp = character.liveState.currentHp === 0;
            const maximumHp = maximumHitPoints(character.hitPoints);
            const hpPercent = maximumHp > 0 ? (character.liveState.currentHp / maximumHp) * 100 : 0;
            const hpColor =
              hpPercent > 60 ? "bg-hp-good" : hpPercent > 25 ? "bg-hp-wounded" : "bg-hp-critical";
            const adaptedMember = adaptSyncedCharacterToPartyMember(character, legacyMembers);
            if (adaptedMember) {
              return (
                <div
                  key={character.identity.id}
                  className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-10.67px)] 2xl:w-[calc(20%-12.8px)]"
                >
                  <CharacterCard
                    member={adaptedMember}
                    controls={{
                      canEdit: ownedByActiveActor,
                      busy: mutatingCharacterId === character.identity.id,
                      onDamage: () => void handleApplyDamage(character, 1),
                      onHeal: () => void handleRestoreHitPoints(character, 1),
                      sheetOpen: selectedCharacterId === character.identity.id,
                      onOpenSheet: () =>
                        setSelectedCharacterId((current) =>
                          current === character.identity.id ? null : character.identity.id,
                        ),
                      onAddCondition: (name) => void handleAddCondition(character, name),
                      onRemoveCondition: (name) => {
                        const condition = character.liveState.conditions.find(
                          (entry) => entry.label === name,
                        );
                        if (condition) void handleRemoveCondition(character, condition.id);
                      },
                      onSpendResource: (name) => {
                        const resource = character.liveState.resources.find(
                          (entry) => entry.label === name,
                        );
                        if (resource) void handleSpendResource(character, resource.key);
                      },
                      onToggleInspiration: () => void handleToggleInspiration(character),
                      onAdjustExhaustion: (delta) => void handleAdjustExhaustion(character, delta),
                      onGrantTemporaryHp: () => void handleGrantTemporaryHitPoints(character, 5),
                      onDeathSave: (result) => void handleRecordDeathSave(character, result),
                      onStabilize: () => void handleStabilize(character),
                      onLongRest: () => void handleRecoverResources(character, "long-rest"),
                    }}
                  />
                </div>
              );
            }
            return (
              <article
                key={character.identity.id}
                className="card-arcane card-arcane-hover group relative w-full overflow-hidden rounded-xl border border-border/40 p-4 shadow-lg sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-10.67px)] 2xl:w-[calc(20%-12.8px)]"
              >
                <div className="absolute -right-4 -top-4 h-14 w-14 rounded-full bg-accent/10 blur-xl" />
                <div className="relative">
                  <div className="flex items-start gap-3">
                    {character.identity.avatarUrl ? (
                      <img
                        src={character.identity.avatarUrl}
                        alt={character.identity.name}
                        className="h-16 w-16 shrink-0 rounded-[28%] object-cover ring-2 ring-accent/40 shadow-[0_0_12px_color-mix(in_oklab,var(--accent)_30%,transparent)] transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[28%] border border-accent/30 bg-accent/10 font-heading text-2xl font-bold text-accent">
                        {character.identity.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <h3 className="truncate font-heading text-xl font-bold text-foreground transition-colors group-hover:text-accent">
                            {character.identity.name}
                          </h3>
                          {character.liveState.inspiration && (
                            <Star
                              size={13}
                              className="shrink-0 fill-gold text-gold drop-shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_80%,transparent)]"
                            />
                          )}
                        </div>
                        <ShieldCheck size={15} className="shrink-0 text-accent" />
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                        {classLevels}
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {character.build.speciesRef.name} · {character.build.backgroundRef.name}
                      </div>
                      <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-accent/80">
                        {MOB_PLAYER_NAMES[character.identity.ownerUserId] ??
                          character.identity.ownerUserId}
                        {ownedByActiveActor ? " · Your character" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
                  <div className="mt-3 flex items-baseline justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground">
                      HP
                    </span>
                    <span className="font-mono font-semibold">
                      {character.liveState.currentHp} / {maximumHp}
                      {character.liveState.temporaryHp > 0 && (
                        <span className="ml-1 text-accent">+{character.liveState.temporaryHp}</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={"h-full transition-all duration-500 " + hpColor}
                      style={{ width: Math.max(0, Math.min(100, hpPercent)) + "%" }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Metric label="Exhaustion" value={character.liveState.exhaustion.toString()} />
                    <Metric
                      label="Inspiration"
                      value={character.liveState.inspiration ? "Yes" : "No"}
                    />
                  </div>
                  <div className="mt-3 text-[11px] text-muted-foreground">
                    {character.liveState.conditions.length} conditions ·{" "}
                    {character.liveState.resources.length} resources
                  </div>
                  {character.liveState.resources.length > 0 && (
                    <div className="mt-3 space-y-2 rounded-lg border border-border/30 bg-secondary/10 p-2.5">
                      {character.liveState.resources.map((resource) => (
                        <div key={resource.key} className="text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-muted-foreground">
                              {resource.label}
                            </span>
                            <span className="shrink-0 font-mono font-semibold text-foreground">
                              {resource.current}/{resource.maximum}
                            </span>
                          </div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-accent shadow-[0_0_5px_color-mix(in_oklab,var(--accent)_60%,transparent)] transition-all duration-500"
                              style={{
                                width:
                                  (resource.maximum > 0
                                    ? (resource.current / resource.maximum) * 100
                                    : 0) + "%",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 space-y-2">
                    {character.liveState.conditions.map((condition) => (
                      <div
                        key={condition.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-secondary/20 px-2 py-1.5 text-xs"
                      >
                        <span className="min-w-0 truncate" title={condition.label}>
                          {condition.label}
                        </span>
                        {ownedByActiveActor && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 shrink-0 px-2"
                            disabled={mutatingCharacterId === character.identity.id}
                            onClick={() => handleRemoveCondition(character, condition.id)}
                            aria-label={`Remove ${condition.label} from ${character.identity.name}`}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    {ownedByActiveActor && (
                      <div className="flex gap-2">
                        <input
                          className="h-8 min-w-0 flex-1 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          value={conditionDrafts[character.identity.id] ?? ""}
                          maxLength={500}
                          placeholder="Table condition"
                          disabled={
                            !ownedByActiveActor || mutatingCharacterId === character.identity.id
                          }
                          onChange={(event) =>
                            setConditionDrafts((current) => ({
                              ...current,
                              [character.identity.id]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") void handleAddCondition(character);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            !ownedByActiveActor ||
                            mutatingCharacterId === character.identity.id ||
                            !conditionDrafts[character.identity.id]?.trim()
                          }
                          onClick={() => handleAddCondition(character)}
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </div>
                  {ownedByActiveActor && (
                    <>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            !ownedByActiveActor || mutatingCharacterId === character.identity.id
                          }
                          onClick={() => handleApplyDamage(character, 1)}
                        >
                          -1 HP
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            !ownedByActiveActor || mutatingCharacterId === character.identity.id
                          }
                          onClick={() => handleRestoreHitPoints(character, 1)}
                        >
                          +1 HP
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            !ownedByActiveActor || mutatingCharacterId === character.identity.id
                          }
                          onClick={() => handleGrantTemporaryHitPoints(character, 5)}
                        >
                          Temp 5
                        </Button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            !ownedByActiveActor ||
                            !atZeroHp ||
                            mutatingCharacterId === character.identity.id
                          }
                          onClick={() => handleRecordDeathSave(character, "success")}
                        >
                          DS +
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            !ownedByActiveActor ||
                            !atZeroHp ||
                            mutatingCharacterId === character.identity.id
                          }
                          onClick={() => handleRecordDeathSave(character, "failure")}
                        >
                          DS -
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            !ownedByActiveActor ||
                            !atZeroHp ||
                            mutatingCharacterId === character.identity.id
                          }
                          onClick={() => handleStabilize(character)}
                        >
                          Stable
                        </Button>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          className="flex-1"
                          variant="outline"
                          size="sm"
                          disabled={!ownedByActiveActor || character.liveState.exhaustion === 0}
                          onClick={() => handleAdjustExhaustion(character, -1)}
                        >
                          Exh -
                        </Button>
                        <Button
                          className="flex-1"
                          variant="outline"
                          size="sm"
                          disabled={!ownedByActiveActor || character.liveState.exhaustion === 6}
                          onClick={() => handleAdjustExhaustion(character, 1)}
                        >
                          Exh +
                        </Button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!ownedByActiveActor || !firstSpendableResource}
                          onClick={() => handleSpendFirstResource(character)}
                          title={
                            firstSpendableResource
                              ? `Spend 1 ${firstSpendableResource.label}`
                              : "No spendable resources"
                          }
                        >
                          Spend 1
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!ownedByActiveActor}
                          onClick={() => handleRecoverResources(character, "long-rest")}
                        >
                          Long Rest
                        </Button>
                      </div>
                      <Button
                        className="mt-3 w-full"
                        variant={character.liveState.inspiration ? "secondary" : "outline"}
                        size="sm"
                        disabled={
                          !ownedByActiveActor || mutatingCharacterId === character.identity.id
                        }
                        onClick={() => handleToggleInspiration(character)}
                        title={
                          character.identity.ownerUserId === activeActorUserId
                            ? "Update your synchronized character"
                            : "Only this character's owner can update live state"
                        }
                      >
                        {mutatingCharacterId === character.identity.id
                          ? "Committing..."
                          : character.liveState.inspiration
                            ? "Clear Inspiration"
                            : "Grant Inspiration"}
                      </Button>
                    </>
                  )}
                  <Button
                    className="mt-2 w-full"
                    variant={selectedCharacterId === character.identity.id ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() =>
                      setSelectedCharacterId((current) =>
                        current === character.identity.id ? null : character.identity.id,
                      )
                    }
                  >
                    {selectedCharacterId === character.identity.id ? "Close Sheet" : "Open Sheet"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedDetailMember && (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-background/95 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={selectedDetailMember.name + " character details"}
          onClick={() => setSelectedCharacterId(null)}
        >
          <div
            className="mx-auto min-h-screen max-w-6xl px-4 py-5 2xl:max-w-[1600px]"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="sticky top-0 z-20 mb-4 flex items-center justify-between rounded-xl border border-border/50 bg-background/90 px-4 py-3 shadow-lg backdrop-blur-md">
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent">
                  Mother of Bob · Shared Character Sheet
                </div>
                <h2 className="truncate font-heading text-2xl font-bold">
                  {selectedDetailMember.name}
                </h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedCharacterId(null)}>
                Close
              </Button>
            </header>
            {selectedCharacter && (catalogLevelUpPlan ?? selectedLevelUpPlan) && (
              <section className="mb-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent">
                      Level-Up Preview
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      Level {(catalogLevelUpPlan ?? selectedLevelUpPlan)!.nextCharacterLevel} ·{" "}
                      {(catalogLevelUpPlan ?? selectedLevelUpPlan)!.nextClassLevel}th{" "}
                      {selectedCharacter.build.levels.at(-1)?.classRef.name} level
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {(catalogLevelUpPlan ?? selectedLevelUpPlan)!.requiresAsiOrFeat
                        ? `${(catalogLevelUpPlan ?? selectedLevelUpPlan)!.asiAllocations.length} legal ASI allocations and ${(catalogLevelUpPlan ?? selectedLevelUpPlan)!.eligibleFeats.length} verified eligible feats available.`
                        : "No ASI or feat decision is required at this class level."}
                    </div>
                    {catalogLevelUpPlan && catalogLevelUpPlan.eligibleFeats.length > 0 && (
                      <div className="mt-2 text-xs text-foreground">
                        {catalogLevelUpPlan.eligibleFeats.map((feat) => feat.name).join(" · ")}
                      </div>
                    )}
                    {selectedCharacter.build.abilityBasis.method === "imported-baseline" && (
                      <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-100">
                        <div className="font-semibold">DDB baseline trusted</div>
                        <div className="mt-1">
                          Imported ability scores and Hit Point baseline are treated as authoritative
                          for native level-up calculations.
                        </div>
                      </div>
                    )}
                    {catalogLevelUpPlan &&
                      catalogLevelUpPlan.progressionRequirements.length > 0 && (
                        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                          <div className="font-semibold">Still required before apply</div>
                          <ul className="mt-1 list-disc space-y-0.5 pl-4">
                            {catalogLevelUpPlan.progressionRequirements.map((requirement) => (
                              <li key={`${requirement.kind}:${requirement.label}`}>
                                {requirement.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {catalogLevelUpPlan && catalogLevelUpPlan.unsupportedProgression.length > 0 && (
                      <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        <div className="font-semibold">Level-up compiler blocked</div>
                        <div className="mt-1">
                          This class level changes progression values that are not modeled as native
                          choices yet:
                        </div>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                          {catalogLevelUpPlan.unsupportedProgression.map((blocker) => (
                            <li key={`${blocker.label}:${blocker.before}:${blocker.after}`}>
                              {blocker.label}: {blocker.before} → {blocker.after}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activeFeaturePlan && activeFeaturePlan.unsupportedSemantics.length > 0 && (
                      <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        <div className="font-semibold">Feature compiler blocked</div>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                          {activeFeaturePlan.unsupportedSemantics.map((blocker) => (
                            <li key={`${blocker.featureRef.versionKey}:${blocker.semantic}`}>
                              {blocker.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activeGrantedSpellPlan && activeGrantedSpellPlan.blockers.length > 0 && (
                      <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        <div className="font-semibold">Granted spell compiler blocked</div>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                          {activeGrantedSpellPlan.blockers.map((blocker) => (
                            <li key={blocker}>{blocker}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activeGrantedSpellPlan &&
                      activeGrantedSpellPlan.variantChoices.length > 0 &&
                      activeGrantedSpellPlan.selectedVariant === null && (
                        <div className="mt-3 rounded-lg border border-accent/30 bg-background/60 p-3 text-xs">
                          <div className="mb-2 font-semibold">Subclass spell-list variant</div>
                          <select
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                            value={selectedGrantedSpellVariant}
                            onChange={(event) => setSelectedGrantedSpellVariant(event.target.value)}
                            aria-label="Subclass spell-list variant"
                          >
                            <option value="">Choose a spell-list variant</option>
                            {activeGrantedSpellPlan.variantChoices.map((variant) => (
                              <option key={variant} value={variant}>
                                {variant}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    {activeGrantedSpellPlan && activeGrantedSpellPlan.spells.length > 0 && (
                      <div className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs">
                        <div className="font-semibold">Automatic subclass spells</div>
                        <div className="mt-1 text-muted-foreground">
                          {activeGrantedSpellPlan.spells
                            .map((spell) => `${spell.name} (${spell.mode})`)
                            .join(" · ")}
                        </div>
                      </div>
                    )}
                    {activeGrantedSpellPlan && activeGrantedSpellPlan.choicePlans.length > 0 && (
                      <div className="mt-3 rounded-lg border border-accent/30 bg-background/60 p-3 text-xs">
                        <div className="font-semibold">Subclass spell choices</div>
                        <div className="mt-2 space-y-2">
                          {activeGrantedSpellPlan.choicePlans.map((plan) => (
                            <div key={plan.id} className="grid gap-2 sm:grid-cols-2">
                              {Array.from({ length: plan.count }).map((_, slotIndex) => (
                                <select
                                  key={`${plan.id}:${slotIndex}`}
                                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                  value={levelUpGrantedSpellSelections[plan.id]?.[slotIndex] ?? ""}
                                  onChange={(event) =>
                                    setLevelUpGrantedSpellSelection(
                                      plan.id,
                                      slotIndex,
                                      event.target.value,
                                    )
                                  }
                                  aria-label={`Subclass spell choice ${slotIndex + 1}`}
                                >
                                  <option value="">Choose a spell</option>
                                  {plan.options.map((option) => (
                                    <option
                                      key={option.spellRef.versionKey}
                                      value={option.spellRef.versionKey}
                                    >
                                      {option.spellRef.name} ·{" "}
                                      {option.spellLevel === 0
                                        ? "Cantrip"
                                        : `Level ${option.spellLevel}`}
                                    </option>
                                  ))}
                                </select>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {catalogLevelUpPlan &&
                      selectedCharacter.identity.ownerUserId === activeActorUserId && (
                        <div className="mt-3 rounded-lg border border-border/50 bg-background/60 p-3">
                          {catalogLevelUpPlan.requiresAsiOrFeat ? (
                            <>
                              <div className="mb-2 flex gap-2">
                                <Button
                                  size="sm"
                                  variant={levelUpChoiceMode === "asi" ? "default" : "outline"}
                                  onClick={() => setLevelUpChoiceMode("asi")}
                                >
                                  Ability Scores
                                </Button>
                                <Button
                                  size="sm"
                                  variant={levelUpChoiceMode === "feat" ? "default" : "outline"}
                                  disabled={catalogLevelUpPlan.eligibleFeats.length === 0}
                                  onClick={() => setLevelUpChoiceMode("feat")}
                                >
                                  General Feat
                                </Button>
                              </div>
                              {levelUpChoiceMode === "asi" ? (
                                <select
                                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                  value={selectedAsiIndex}
                                  onChange={(event) =>
                                    setSelectedAsiIndex(Number(event.target.value))
                                  }
                                  aria-label="Ability Score Improvement allocation"
                                >
                                  {catalogLevelUpPlan.asiAllocations.map((allocation, index) => (
                                    <option key={JSON.stringify(allocation)} value={index}>
                                      {allocation
                                        .map(
                                          (increase) => `+${increase.amount} ${increase.ability}`,
                                        )
                                        .join(" and ")}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <select
                                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                  value={selectedFeatVersionKey}
                                  onChange={(event) =>
                                    setSelectedFeatVersionKey(event.target.value)
                                  }
                                  aria-label="Eligible General Feat"
                                >
                                  <option value="">Choose an eligible feat</option>
                                  {catalogLevelUpPlan.eligibleFeats.map((feat) => (
                                    <option key={feat.versionKey} value={feat.versionKey}>
                                      {feat.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              No ASI or feat decision is required for this level.
                            </div>
                          )}
                          {catalogLevelUpPlan.subclassPlan.requiresSubclass && (
                            <div className="mt-3 border-t border-border/40 pt-3">
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Subclass Choice
                              </div>
                              <select
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                value={selectedSubclassVersionKey}
                                onChange={(event) =>
                                  setSelectedSubclassVersionKey(event.target.value)
                                }
                                aria-label="Eligible subclass"
                              >
                                <option value="">Choose a subclass</option>
                                {catalogLevelUpPlan.subclassPlan.candidates.map((subclass) => (
                                  <option key={subclass.versionKey} value={subclass.versionKey}>
                                    {subclass.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {activeFeaturePlan && activeFeaturePlan.choiceGroups.length > 0 && (
                            <div className="mt-3 border-t border-border/40 pt-3">
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Feature Choices
                              </div>
                              <div className="space-y-2">
                                {activeFeaturePlan.choiceGroups.map((group) => (
                                  <div
                                    key={group.id}
                                    className="rounded-md border border-border/40 bg-background/40 p-2"
                                  >
                                    <div className="mb-1 text-xs font-semibold">
                                      {group.featureRef.name} · Choose {group.count}
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {Array.from({ length: group.count }).map((_, slotIndex) => (
                                        <select
                                          key={`${group.id}:${slotIndex}`}
                                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                          value={
                                            levelUpFeatureSelections[group.id]?.[slotIndex] ?? ""
                                          }
                                          onChange={(event) =>
                                            setLevelUpFeatureSelection(
                                              group.id,
                                              slotIndex,
                                              event.target.value,
                                            )
                                          }
                                          aria-label={`${group.featureRef.name} option ${slotIndex + 1}`}
                                        >
                                          <option value="">Choose an option</option>
                                          {group.options.map((option) => (
                                            <option
                                              key={option.versionKey}
                                              value={option.versionKey}
                                            >
                                              {option.name}
                                            </option>
                                          ))}
                                        </select>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {catalogLevelUpPlan.spellChoicePlans.length > 0 && (
                            <div className="mt-3 border-t border-border/40 pt-3">
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Spell Choices
                              </div>
                              <div className="space-y-2">
                                {catalogLevelUpPlan.spellChoicePlans.map((spellPlan, planIndex) => (
                                  <div
                                    key={`${spellPlan.kind}:${spellPlan.label}`}
                                    className="rounded-md border border-border/40 bg-background/40 p-2"
                                  >
                                    <div className="mb-1 text-xs font-semibold">
                                      {spellPlan.label}
                                    </div>
                                    {!spellPlan.readyToSelect ? (
                                      <div className="text-xs text-destructive">
                                        {spellPlan.unavailableReason}
                                      </div>
                                    ) : (
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        {Array.from({ length: spellPlan.count }).map(
                                          (_, slotIndex) => (
                                            <select
                                              key={`${planIndex}:${slotIndex}`}
                                              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                              value={
                                                levelUpSpellSelections[planIndex]?.[slotIndex] ?? ""
                                              }
                                              onChange={(event) =>
                                                setLevelUpSpellSelection(
                                                  planIndex,
                                                  slotIndex,
                                                  event.target.value,
                                                )
                                              }
                                              aria-label={`${spellPlan.label} ${slotIndex + 1}`}
                                            >
                                              <option value="">Choose a spell</option>
                                              {spellPlan.options.map((option) => (
                                                <option
                                                  key={option.spellRef.versionKey}
                                                  value={option.spellRef.versionKey}
                                                >
                                                  {option.spellRef.name}
                                                  {option.spellLevel > 0
                                                    ? ` · Level ${option.spellLevel}`
                                                    : " · Cantrip"}
                                                </option>
                                              ))}
                                            </select>
                                          ),
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-3 border-t border-border/40 pt-3">
                            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Hit Points
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant={levelUpHpMethod === "fixed" ? "default" : "outline"}
                                onClick={() => setLevelUpHpMethod("fixed")}
                              >
                                Fixed {catalogLevelUpPlan.hitPoints.fixedContribution}
                              </Button>
                              <Button
                                size="sm"
                                variant={levelUpHpMethod === "rolled" ? "default" : "outline"}
                                onClick={() => setLevelUpHpMethod("rolled")}
                              >
                                Physical d{catalogLevelUpPlan.hitPoints.hitDie}
                              </Button>
                              {levelUpHpMethod === "rolled" && (
                                <input
                                  type="number"
                                  min={1}
                                  max={catalogLevelUpPlan.hitPoints.hitDie}
                                  value={levelUpHpRoll}
                                  onChange={(event) => setLevelUpHpRoll(Number(event.target.value))}
                                  className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                                  aria-label="Physical Hit Die result"
                                />
                              )}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Constitution{" "}
                              {catalogLevelUpPlan.hitPoints.constitutionModifier >= 0 ? "+" : ""}
                              {catalogLevelUpPlan.hitPoints.constitutionModifier}
                              {catalogLevelUpPlan.hitPoints.bonuses.map(
                                (bonus) => ` · ${bonus.label} +${bonus.amount}`,
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      disabled={
                        selectedCharacter.identity.ownerUserId !== activeActorUserId ||
                        !catalogLevelUpPlan ||
                        isReviewingLevelUp ||
                        isApplyingLevelUp ||
                        !levelUpProgressionSupported(catalogLevelUpPlan) ||
                        !levelUpSpellChoicesComplete(catalogLevelUpPlan) ||
                        !levelUpFeatureChoicesComplete() ||
                        !levelUpGrantedSpellsSupported() ||
                        (catalogLevelUpPlan.subclassPlan.requiresSubclass &&
                          selectedSubclassVersionKey.length === 0) ||
                        (catalogLevelUpPlan.requiresAsiOrFeat &&
                          levelUpChoiceMode === "feat" &&
                          !selectedFeatVersionKey)
                      }
                      title="Validate this selection without changing the character"
                      onClick={() => void handleReviewLevelUp()}
                    >
                      {selectedCharacter.identity.ownerUserId === activeActorUserId
                        ? isReviewingLevelUp
                          ? "Reviewing…"
                          : "Review Level Up"
                        : "Party Preview"}
                    </Button>
                    {selectedCharacter.identity.ownerUserId === activeActorUserId && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={
                          !catalogLevelUpPlan ||
                          isReviewingLevelUp ||
                          isApplyingLevelUp ||
                          !levelUpProgressionSupported(catalogLevelUpPlan) ||
                          !levelUpSpellChoicesComplete(catalogLevelUpPlan) ||
                          !levelUpFeatureChoicesComplete() ||
                          !levelUpGrantedSpellsSupported() ||
                          (catalogLevelUpPlan.subclassPlan.requiresSubclass &&
                            selectedSubclassVersionKey.length === 0) ||
                          (catalogLevelUpPlan.requiresAsiOrFeat &&
                            levelUpChoiceMode === "feat" &&
                            !selectedFeatVersionKey)
                        }
                        title="Atomically apply level, decision, hit points, hit dice, and spell choices"
                        onClick={() => void handleApplyLevelUp()}
                      >
                        {isApplyingLevelUp ? "Applying…" : "Apply Level Up"}
                      </Button>
                    )}
                  </div>
                </div>
                {levelUpReview && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mt-3 rounded-md border border-border/50 bg-background/60 px-3 py-2 text-xs text-muted-foreground"
                  >
                    {levelUpReview}
                  </div>
                )}
              </section>
            )}
            <CharacterDetailView
              member={selectedDetailMember}
              allMembers={adaptedPartyMembers.length > 0 ? adaptedPartyMembers : legacyMembers}
              managedExternally
              liveControls={{
                canEdit: canMutate(selectedCharacter),
                onDamage: (amount) => void handleApplyDamage(selectedCharacter, amount),
                onHeal: (amount) => void handleRestoreHitPoints(selectedCharacter, amount),
                onSetTemporaryHp: (amount) =>
                  void handleGrantTemporaryHitPoints(selectedCharacter, amount),
                onDeathSave: (result) =>
                  void handleRecordDeathSave(selectedCharacter, result),
                onStabilize: () => void handleStabilize(selectedCharacter),
                onShortRest: (hitDice, healing) =>
                  void handleShortRest(selectedCharacter, hitDice, healing),
                onLongRest: () => void handleLongRest(selectedCharacter),
                onSpendResource: (name, amount) => {
                  const resource = selectedCharacter.liveState.resources.find(
                    (entry) => entry.label === name,
                  );
                  if (resource) void handleSpendResource(selectedCharacter, resource.key, amount);
                },
                onAddCondition: (name) => void handleAddCondition(selectedCharacter, name),
                onRemoveCondition: (name) => {
                  const condition = selectedCharacter.liveState.conditions.find(
                    (entry) => entry.label === name,
                  );
                  if (condition) void handleRemoveCondition(selectedCharacter, condition.id);
                },
                onAdjustExhaustion: (delta) =>
                  void handleAdjustExhaustion(selectedCharacter, delta),
                onSetItemEquipped: (itemId, equipped) =>
                  void handleMutateItem(selectedCharacter, itemId, "set-equipped", equipped),
                onSetItemAttuned: (itemId, attuned) =>
                  void handleMutateItem(selectedCharacter, itemId, "set-attuned", attuned),
                onSetItemQuantity: (itemId, quantity) =>
                  void handleMutateItem(selectedCharacter, itemId, "set-quantity", quantity),
                onRemoveItem: (itemId) =>
                  void handleMutateItem(selectedCharacter, itemId, "remove-item"),
                onAddCatalogItem: (kind, id, quantity) =>
                  void handleAddCatalogItem(selectedCharacter, kind, id, quantity),
                onSpendSpellSlot: (level, isPact) =>
                  void handleSpendResource(
                    selectedCharacter,
                    `${isPact ? "pact-slot" : "spell-slot"}:${level}`,
                  ),
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function summarizeClassLevels(character: SyncedCharacter): string {
  return [
    ...character.build.levels
      .reduce<Map<string, { name: string; levels: number }>>((summary, level) => {
        const existing = summary.get(level.classRef.versionKey);
        summary.set(level.classRef.versionKey, {
          name: level.classRef.name,
          levels: (existing?.levels ?? 0) + 1,
        });
        return summary;
      }, new Map())
      .values(),
  ]
    .map((entry) => entry.name + " " + entry.levels)
    .join(" / ");
}

export function adaptSyncedCharacterToPartyMember(
  character: SyncedCharacter,
  _legacyMembers: PartyMember[],
): PartyMember {
  const externalDdbId = Number(
    character.identity.externalRefs.find((reference) => reference.system === "ddb")?.id,
  );
  const nativeMember = nativePartyMemberFallback(character, externalDdbId);
  const nativeSpells = nativePreparedSpells(character);
  const nativeSlots = nativeSpellSlots(character);

  return {
    ...nativeMember,
    name: character.identity.name,
    avatarUrl: character.identity.avatarUrl,
    race: character.build.speciesRef.name,
    background: character.build.backgroundRef.name,
    classes: summarizeClassLevels(character),
    level: character.build.levels.length,
    hpMax: maximumHitPoints(character.hitPoints),
    hpCurrent: character.liveState.currentHp,
    tempHp: character.liveState.temporaryHp,
    inspiration: character.liveState.inspiration,
    exhaustion: character.liveState.exhaustion,
    deathSaves: character.liveState.deathSaves,
    conditions: character.liveState.conditions.map((condition) => condition.label),
    spellSlots: nativeSlots.spellSlots,
    pactSlots: nativeSlots.pactSlots,
    cantrips: nativeSpells.filter((spell) => spell.level === 0),
    preparedSpells: nativeSpells.filter((spell) => spell.level > 0 && spell.prepared),
    allSpells: nativeSpells.filter((spell) => spell.level > 0),
    inventory: nativeMember.inventory,
    attacks: nativeMember.attacks,
    activeArmorModel: nativeMember.activeArmorModel,
    activeInfusions: nativeMember.activeInfusions,
    infusions: nativeMember.infusions,
    metamagic: nativeMember.metamagic,
    totemAspects: nativeMember.totemAspects,
    weaponMasteries: nativeMember.weaponMasteries,
    creatures: nativeMember.creatures,
    error: undefined,
    readonlyUrl: "",
    actions: nativeActions(character),
    isNative: true,
  };
}

function nativeActions(character: SyncedCharacter): PartyMember["actions"] {
  const trackedResources = character.liveState.resources.filter(
    (resource) => !/^(?:spell|pact)-slot:\d+$/.test(resource.key),
  );
  const matchedResourceKeys = new Set<string>();
  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  const actions = character.profile.actions.values.map((action) => {
    const resource = trackedResources.find(
      (candidate) => normalize(candidate.label) === normalize(action.name),
    );
    if (resource) matchedResourceKeys.add(resource.key);
    return {
      name: action.name,
      source: action.source,
      description: action.description,
      activation: action.activation ?? undefined,
      uses: resource
        ? { current: resource.current, max: resource.maximum, reset: resource.recovery }
        : action.limitedUse
          ? {
              current: action.limitedUse.maximum,
              max: action.limitedUse.maximum,
              reset: action.limitedUse.recovery,
            }
          : undefined,
    };
  });

  actions.push(
    ...trackedResources
      .filter((resource) => !matchedResourceKeys.has(resource.key))
      .map((resource) => ({
        name: resource.label,
        source: "class",
        description: undefined,
        activation: undefined,
        uses: {
          current: resource.current,
          max: resource.maximum,
          reset: resource.recovery,
        },
      })),
  );
  return actions;
}

function nativePartyMemberFallback(character: SyncedCharacter, externalDdbId: number): PartyMember {
  const abilityScores = character.build.abilityBasis.baseScores;
  const currencies = character.profile.currencies;
  const proficiencies = character.profile.proficiencies;
  const demographics = character.profile.demographics;
  const fallbackId = Number.isFinite(externalDdbId)
    ? externalDdbId
    : Number(character.identity.id.match(/\d+/)?.[0] ?? 0);

  return {
    id: fallbackId,
    name: character.identity.name,
    avatarUrl: character.identity.avatarUrl,
    race: character.build.speciesRef.name,
    background: character.build.backgroundRef.name,
    classes: summarizeClassLevels(character),
    subclasses: character.build.levels
      .map((level) => level.subclassRef?.name)
      .filter((name): name is string => Boolean(name)),
    level: character.build.levels.length,
    hpMax: maximumHitPoints(character.hitPoints),
    hpCurrent: character.liveState.currentHp,
    tempHp: character.liveState.temporaryHp,
    inspiration: character.liveState.inspiration,
    exhaustion: character.liveState.exhaustion,
    deathSaves: character.liveState.deathSaves,
    passivePerception: character.profile.passiveScores.perception ?? 10,
    passiveInvestigation: character.profile.passiveScores.investigation ?? 10,
    passiveInsight: character.profile.passiveScores.insight ?? 10,
    armorClass: character.profile.armorClass.value ?? 10,
    initiative: character.profile.initiative.value ?? abilityModifier(abilityScores.DEX),
    speed: character.profile.movement.walk ?? 30,
    proficiencyBonus: Math.ceil(character.build.levels.length / 4) + 1,
    senses: character.profile.senses.values,
    skills: character.profile.skills.values,
    saves: character.profile.savingThrows.values,
    spellSlots: [],
    pactSlots: [],
    abilities: Object.entries(abilityScores).map(([name, score]) => ({
      name,
      score,
      modifier: abilityModifier(score),
    })),
    conditions: character.liveState.conditions.map((condition) => condition.label),
    defenses: character.profile.defenses.values,
    actions: character.profile.actions.values.map((action) => ({
      name: action.name,
      source: action.source,
      description: action.description,
      activation: action.activation ?? undefined,
      uses: action.limitedUse
        ? { current: action.limitedUse.maximum, max: action.limitedUse.maximum, reset: action.limitedUse.recovery }
        : undefined,
    })),
    inventory: character.items.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.details?.type ?? "Item",
      rarity: item.details?.rarity ?? null,
      magic: item.details?.magic ?? false,
      equipped: item.equipped,
      attuned: item.attuned,
      attunementRequirement: item.attunementRequirement,
      quantity: item.quantity,
      weight: item.details?.weight ?? undefined,
      description: item.details?.description ?? undefined,
      snippet: item.details?.snippet ?? undefined,
      cost: item.details?.cost ?? undefined,
      damage: item.details?.damage ?? undefined,
      properties: item.details?.properties ?? undefined,
      armorClass: item.details?.armorClass ?? undefined,
      armorTypeId: item.details?.armorTypeId ?? undefined,
    })),
    attunementCapacity: maximumAttunedItems(character),
    readonlyUrl: "",
    languages: proficiencies.languages,
    tools: proficiencies.tools,
    armorProficiencies: proficiencies.armor,
    weaponProficiencies: proficiencies.weapons,
    features: character.profile.features.values,
    specialSpeeds: character.profile.movement.special,
    spellcasting: character.profile.spellcastingTotals.values,
    hitDice:
      character.liveState.hitDice.status === "tracked"
        ? character.liveState.hitDice.pools
            .map((pool) => `${pool.remaining}/${pool.maximum}d${pool.die}`)
            .join(" + ")
        : "—",
    feats: character.profile.features.feats,
    alignment: character.profile.alignment,
    currencies: { cp: currencies.cp, sp: currencies.sp, ep: currencies.ep, gp: currencies.gp, pp: currencies.pp },
    weightCarried: character.profile.encumbrance.weightCarried ?? 0,
    carryingCapacity: character.profile.encumbrance.carryingCapacity ?? 0,
    attacks: character.profile.attacks.values,
    cantrips: [],
    preparedSpells: [],
    allSpells: [],
    stats: undefined,
    proficiencies: undefined,
    spells: undefined,
    isNative: true,
    characteristics: {
      personalityTraits: character.profile.personalityTraits,
      ideals: character.profile.ideals,
      bonds: character.profile.bonds,
      flaws: character.profile.flaws,
      appearance: character.profile.appearance,
      gender: demographics.gender || undefined,
      age: demographics.age || undefined,
      height: demographics.height || undefined,
      weight: demographics.weight || undefined,
      eyes: demographics.eyes || undefined,
      skin: demographics.skin || undefined,
      hair: demographics.hair || undefined,
      backstory: character.profile.backstory,
      allies: character.profile.allies,
      enemies: character.profile.enemies,
      organizations: character.profile.organizations,
      otherNotes: character.profile.notes,
    },
    activeArmorModel: character.profile.specializations.activeArmorModel,
    activeInfusions: character.profile.specializations.activeInfusions,
    infusions: character.profile.specializations.infusions,
    metamagic: character.profile.specializations.metamagic,
    totemAspects: character.profile.specializations.totemAspects,
    weaponMasteries: character.profile.specializations.weaponMasteries,
    creatures: character.companions.map((companion) => ({
      id: Number(companion.definition.upstreamId),
      name: companion.name,
      description: companion.description,
      isActive: companion.liveState.active,
      removedHitPoints: companion.liveState.removedHitPoints,
      temporaryHitPoints: companion.liveState.temporaryHitPoints,
      definition: {
        id: Number(companion.definition.upstreamId),
        name: companion.definition.name,
        armorClass: companion.definition.armorClass,
        armorClassDescription: companion.definition.armorClassDescription,
        averageHitPoints: companion.definition.averageHitPoints,
        hitPointDice: companion.definition.hitPointDice,
        movements: companion.definition.movements,
        passivePerception: companion.definition.passivePerception,
        avatarUrl: companion.definition.avatarUrl,
        stats: companion.definition.stats,
        senses: companion.definition.senses,
        specialTraitsDescription: companion.definition.specialTraitsDescription,
        actionsDescription: companion.definition.actionsDescription,
        reactionsDescription: companion.definition.reactionsDescription,
        bonusActionsDescription: companion.definition.bonusActionsDescription,
        characteristicsDescription: companion.definition.characteristicsDescription,
        skills: companion.definition.skills,
        savingThrows: companion.definition.savingThrows,
      },
    })),
  };
}

function nativeSpellSlots(character: SyncedCharacter): {
  spellSlots: SpellSlotLevel[];
  pactSlots: SpellSlotLevel[];
} {
  const slots = (prefix: "spell-slot" | "pact-slot") =>
    character.liveState.resources
      .flatMap((resource) => {
        const match = resource.key.match(new RegExp(`^${prefix}:(\\d+)$`));
        if (!match) return [];
        return [{
          level: Number(match[1]),
          max: resource.maximum,
          used: resource.maximum - resource.current,
        }];
      })
      .sort((left, right) => left.level - right.level);

  return {
    spellSlots: slots("spell-slot"),
    pactSlots: slots("pact-slot"),
  };
}

function nativePreparedSpells(character: SyncedCharacter): PreparedSpell[] {
  return character.build.spells
    .filter((spell) => spell.active)
    .map((spell) => {
      const details = spell.details;
      const prepared = ["cantrip", "known", "prepared", "always-prepared", "granted"].includes(
        spell.mode,
      );
      return {
        level: spell.spellLevel,
        name: spell.spellRef.name,
        description: details?.description,
        school: details?.school,
        activation: details?.activation ?? undefined,
        range: details?.range ?? undefined,
        duration: details?.duration ?? undefined,
        components: details?.components,
        componentsDescription: details?.componentsDescription,
        concentration: details?.concentration,
        ritual: details?.ritual,
        prepared,
        alwaysPrepared: ["always-prepared", "granted"].includes(spell.mode),
        uses: details?.limitedUse
          ? {
              current: details.limitedUse.maximum,
              max: details.limitedUse.maximum,
              reset: details.limitedUse.recovery,
            }
          : undefined,
      };
    })
    .sort((left, right) => left.level - right.level || left.name.localeCompare(right.name));
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/30 bg-secondary/20 px-2.5 py-2">
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
