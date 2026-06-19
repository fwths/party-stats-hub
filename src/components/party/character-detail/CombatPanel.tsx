import { useState } from "react";
import { Swords, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PartyMember } from "@/lib/dndbeyond.functions";
import { Panel, CustomSelect } from "../CharacterDetailView";
import { RAGE_DICTIONARY, WEAPON_MASTERY_DICTIONARY } from "./Watermark";

const DAMAGE_TYPE_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  fire: { bg: "bg-ui-red/10", text: "text-ui-red", border: "border-ui-red/30" },
  cold: { bg: "bg-ui-cyan/10", text: "text-ui-cyan", border: "border-ui-cyan/30" },
  lightning: { bg: "bg-ui-blue/10", text: "text-ui-blue", border: "border-ui-blue/30" },
  thunder: { bg: "bg-ui-sky/10", text: "text-ui-sky", border: "border-ui-sky/30" },
  acid: { bg: "bg-ui-lime/10", text: "text-ui-lime", border: "border-ui-lime/30" },
  poison: { bg: "bg-ui-emerald/10", text: "text-ui-emerald", border: "border-ui-emerald/30" },
  radiant: { bg: "bg-ui-amber/10", text: "text-ui-amber", border: "border-ui-amber/30" },
  necrotic: { bg: "bg-ui-purple/10", text: "text-ui-purple", border: "border-ui-purple/30" },
  force: { bg: "bg-ui-indigo/10", text: "text-ui-indigo", border: "border-ui-indigo/30" },
  psychic: { bg: "bg-ui-pink/10", text: "text-ui-pink", border: "border-ui-pink/30" },
  slashing: { bg: "bg-muted/30", text: "text-muted-foreground", border: "border-border/50" },
  piercing: { bg: "bg-muted/30", text: "text-muted-foreground", border: "border-border/50" },
  bludgeoning: { bg: "bg-muted/30", text: "text-muted-foreground", border: "border-border/50" },
};

function getActivationText(activation?: {
  activationTime: number | null;
  activationType: number;
}): string {
  if (!activation) return "";
  const type = activation.activationType;
  if (type === 1) return "Action";
  if (type === 3) return "Bonus Action";
  if (type === 4) return "Reaction";
  if (type === 6) return "Min";
  if (type === 7) return "Hr";
  return `Type ${type}`;
}

export function AttacksPanel({
  member,
  localWeaponMasteries,
  localRage,
  expandedItems,
  toggleExpand,
}: {
  member: PartyMember;
  localWeaponMasteries: any[];
  localRage: string;
  expandedItems: Record<string, boolean>;
  toggleExpand: (key: string) => void;
}) {
  const isArmorer =
    member.subclasses.some((s) => s.toLowerCase().includes("armorer")) ||
    member.activeArmorModel !== null;

  const isBarbarian =
    member.classes.toLowerCase().includes("barbarian") ||
    (member.totemAspects && member.totemAspects.length > 0);

  const localArmorModel = member.activeArmorModel;

  const displayActions = (() => {
    let list = [...(member.actions ?? [])];
    list = list.filter(
      (a) =>
        !a.name.toLowerCase().includes("defensive field") &&
        !a.name.toLowerCase().includes("dampening field"),
    );
    if (isArmorer) {
      if (localArmorModel === "Guardian") {
        list.push({
          name: "Defensive Field",
          source: "class",
          description:
            "As a bonus action, you can gain temporary hit points equal to your level. You can use this a number of times equal to your proficiency bonus per long rest.",
          activation: {
            activationTime: 1,
            activationType: 3, // Bonus Action
          },
          uses: {
            current: member.proficiencyBonus,
            max: member.proficiencyBonus,
            reset: "long rest",
          },
        });
      } else if (localArmorModel === "Infiltrator") {
        list.push({
          name: "Dampening Field (Stealth Advantage)",
          source: "class",
          description:
            "You have advantage on Dexterity (Stealth) checks. If you wear heavy armor, that armor doesn't impose disadvantage on your Dexterity (Stealth) checks.",
        });
      }
    }
    return list;
  })();

  const displayAttacks = (() => {
    let list: any[] = [...(member.attacks ?? [])];
    list = list.filter(
      (a) =>
        !a.name.toLowerCase().includes("thunder gauntlet") &&
        !a.name.toLowerCase().includes("lightning launcher"),
    );
    if (isArmorer) {
      const intMod = member.abilities.find((a) => a.name === "INT")?.modifier ?? 0;
      const pb = member.proficiencyBonus;
      if (localArmorModel === "Guardian") {
        list.push({
          name: "Thunder Gauntlets (Guardian)",
          attackBonus: intMod + pb,
          damage: `1d8 + ${intMod}`,
          damageType: "Thunder",
          properties: ["Melee", "Simple", "Guardian Armor"],
          isWeapon: true,
        });
      } else if (localArmorModel === "Infiltrator") {
        list.push({
          name: "Lightning Launcher (Infiltrator)",
          attackBonus: intMod + pb,
          damage: `1d6 + ${intMod}`,
          damageType: "Lightning",
          properties: ["Ranged (90/300)", "Simple", "Infiltrator Armor", "Once on turn +1d6"],
          isWeapon: true,
        });
      }
    }

    // Map Weapon Masteries onto weapon attacks
    if (localWeaponMasteries && localWeaponMasteries.length > 0) {
      list = list.map((a) => {
        if (!a.isWeapon) return a;

        // Find matching weapon mastery
        const matchingMastery = localWeaponMasteries.find((m) => {
          const idx = m.name.indexOf(" (");
          if (idx === -1) return false;
          const weaponName = m.name.substring(0, idx).toLowerCase();
          return a.name.toLowerCase().includes(weaponName);
        });

        if (matchingMastery) {
          const idx = matchingMastery.name.indexOf(" (");
          const masteryProp = matchingMastery.name.substring(
            idx + 2,
            matchingMastery.name.length - 1,
          );
          const currentProps = a.properties ?? [];
          if (!currentProps.includes(masteryProp)) {
            return {
              ...a,
              properties: [...currentProps, masteryProp],
            };
          }
        }
        return a;
      });
    }

    // Add dynamic Rage damage bonus
    if (isBarbarian && localRage !== "None") {
      const barbarianLvl = (() => {
        const match = member.classes.match(/Barbarian\s+(\d+)/i);
        return match ? parseInt(match[1], 10) : member.level;
      })();
      const rageDamageBonus = barbarianLvl >= 16 ? 4 : barbarianLvl >= 9 ? 3 : 2;

      list = list.map((a) => {
        const isMelee =
          a.properties?.some((p: string) => p.toLowerCase() === "melee") ||
          a.name.toLowerCase().includes("unarmed") ||
          a.name.toLowerCase().includes("strike");
        if (isMelee && a.damage) {
          return {
            ...a,
            damage: `${a.damage} + ${rageDamageBonus}`,
            properties: [...(a.properties ?? []), `+${rageDamageBonus} Rage dmg`],
          };
        }
        return a;
      });
    }

    return list;
  })();

  const allSpells = [...(member.cantrips ?? []), ...(member.preparedSpells ?? [])];

  const spellBonusActions = allSpells
    .filter((s) => s.activation?.activationType === 3)
    .map((s) => ({
      name: s.name,
      source: s.level === 0 ? "Cantrip" : `Lvl ${s.level} Spell`,
      activation: s.activation,
      description: s.description,
    }));

  const reactionSpells = allSpells
    .filter((s) => s.activation?.activationType === 4)
    .map((s) => ({
      name: s.name,
      source: s.level === 0 ? "Cantrip" : `Lvl ${s.level} Spell`,
      activation: s.activation,
      description: s.description,
    }));

  const reactionActions = displayActions.filter(
    (act) =>
      !displayAttacks.some((atk) => atk.name.toLowerCase() === act.name.toLowerCase()) &&
      act.activation?.activationType === 4,
  );

  const allReactions = [...reactionSpells, ...reactionActions];

  const renderActionRow = (act: any, keyId: string) => {
    const actText = getActivationText(act.activation);
    return (
      <div
        key={keyId}
        onClick={() => toggleExpand(`act-${keyId}`)}
        className="group/act relative cursor-pointer overflow-hidden rounded-xl border border-border/40 bg-gradient-to-r from-secondary/20 to-secondary/5 p-3 transition-all duration-300 hover:border-accent/30 hover:bg-secondary/25"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="shrink-0 text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground/80 bg-secondary/80 px-1.5 py-0.5 rounded border border-border/10">
              {act.source}
            </span>
            <span className="font-heading text-xs font-bold text-foreground truncate group-hover/act:text-accent transition-colors">
              {act.name}
            </span>
          </div>
          {actText && (
            <span className="shrink-0 rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-primary font-semibold">
              ⚡ {actText}
            </span>
          )}
        </div>
        {act.uses && (
          <div className="mt-1 text-[9px] font-semibold text-accent font-mono">
            Uses: {act.uses.current} / {act.uses.max} (resets on {act.uses.reset})
          </div>
        )}
        {expandedItems[`act-${keyId}`] && act.description && (
          <div
            className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground/90 border-t border-border/10 pt-2"
            dangerouslySetInnerHTML={{ __html: act.description }}
          />
        )}
      </div>
    );
  };

  if (displayAttacks.length === 0 && spellBonusActions.length === 0 && allReactions.length === 0) {
    return null;
  }

  return (
    <Panel title="Attacks & Actions" icon={Swords}>
      <div className="flex flex-col gap-3.5">
        {displayAttacks.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none mb-1 pl-1">
              Attacks
            </div>
            {displayAttacks.map((atk, idx) => {
              const dmgTypeLower = atk.damageType?.toLowerCase() || "";
              const dmgTheme = DAMAGE_TYPE_THEMES[dmgTypeLower] || {
                bg: "bg-secondary/40",
                text: "text-foreground/90",
                border: "border-border/40",
              };
              return (
                <div
                  key={`${atk.name}-${idx}`}
                  className="group/atk relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-r from-secondary/30 to-secondary/10 p-3.5 transition-all duration-300 hover:scale-[1.01] hover:border-accent/40 hover:bg-secondary/40"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent/60 opacity-0 group-hover/atk:opacity-100 transition-opacity" />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/60 text-accent group-hover/atk:text-glow-accent transition-colors">
                        <Swords size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-heading text-sm font-bold text-foreground truncate group-hover/atk:text-accent transition-colors">
                          {atk.name}
                        </span>
                        {atk.properties && atk.properties.length > 0 && (
                          <span className="mt-1 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/85">
                            {atk.properties.join(" • ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3.5 font-mono">
                      {atk.attackBonus != null && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs">
                          <span className="text-primary font-bold text-[13px] drop-shadow-[0_0_2px_var(--primary)]">
                            {atk.attackBonus >= 0 ? `+${atk.attackBonus}` : atk.attackBonus}
                          </span>
                          <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-muted-foreground/85">
                            to hit
                          </span>
                        </div>
                      )}

                      {atk.damage && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-lg border border-border/50 bg-secondary/80 px-2.5 py-1 text-xs">
                            <span className="font-bold text-foreground text-[13px]">
                              {atk.damage}
                            </span>
                          </div>
                          {atk.damageType && (
                            <span
                              className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${dmgTheme.bg} ${dmgTheme.text} ${dmgTheme.border}`}
                            >
                              {atk.damageType}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {spellBonusActions.length > 0 && (
          <div className="flex flex-col gap-2">
            {displayAttacks.length > 0 && <div className="border-t border-border/10 my-1.5" />}
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none mb-1 pl-1">
              Bonus Actions
            </div>
            {spellBonusActions.map((act, idx) => renderActionRow(act, `bonus-${idx}`))}
          </div>
        )}

        {allReactions.length > 0 && (
          <div className="flex flex-col gap-2">
            {(displayAttacks.length > 0 || spellBonusActions.length > 0) && (
              <div className="border-t border-border/10 my-1.5" />
            )}
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none mb-1 pl-1">
              Reactions
            </div>
            {allReactions.map((act, idx) => renderActionRow(act, `reaction-${idx}`))}
          </div>
        )}
      </div>
    </Panel>
  );
}

export function ResourcesPanel({
  member,
  localRage,
  setLocalRage,
  localResources,
  expandedItems,
  toggleExpand,
}: {
  member: PartyMember;
  localRage: string;
  setLocalRage: (val: string) => void;
  localResources: any;
  expandedItems: Record<string, boolean>;
  toggleExpand: (key: string) => void;
}) {
  const [isRageSelectOpen, setIsRageSelectOpen] = useState(false);

  const isArmorer =
    member.subclasses.some((s) => s.toLowerCase().includes("armorer")) ||
    member.activeArmorModel !== null;

  const localArmorModel = member.activeArmorModel;

  const displayActions = (() => {
    let list = [...(member.actions ?? [])];
    list = list.filter(
      (a) =>
        !a.name.toLowerCase().includes("defensive field") &&
        !a.name.toLowerCase().includes("dampening field"),
    );
    if (isArmorer) {
      if (localArmorModel === "Guardian") {
        list.push({
          name: "Defensive Field",
          source: "class",
          description:
            "As a bonus action, you can gain temporary hit points equal to your level. You can use this a number of times equal to your proficiency bonus per long rest.",
          activation: {
            activationTime: 1,
            activationType: 3, // Bonus Action
          },
          uses: {
            current: member.proficiencyBonus,
            max: member.proficiencyBonus,
            reset: "long rest",
          },
        });
      } else if (localArmorModel === "Infiltrator") {
        list.push({
          name: "Dampening Field (Stealth Advantage)",
          source: "class",
          description:
            "You have advantage on Dexterity (Stealth) checks. If you wear heavy armor, that armor doesn't impose disadvantage on your Dexterity (Stealth) checks.",
        });
      }
    }
    return list;
  })();

  const rageOptions = (() => {
    const hasRageOfTheWilds = (member.features ?? []).some((f) => f.name === "Rage of the Wilds");
    if (hasRageOfTheWilds) {
      return ["None", "Bear", "Eagle", "Wolf"];
    }
    return ["None", "Bear", "Eagle", "Elk", "Tiger", "Wolf"];
  })();

  const trackedResources = displayActions
    .filter((a) => a.source === "class" && a.uses)
    .map((a) => localResources.getEffectiveResource(a));

  const untrackedResources = displayActions.filter(
    (a) => a.source === "class" && !a.uses && a.name === "Charge Magic Item",
  );

  const getResourceSortValue = (a: any) => {
    const type = a.activation?.activationType;
    if (type === 1) return 1; // Action
    if (type === 3) return 2; // Bonus Action
    if (type === 4) return 3; // Reaction
    return 4; // Other / None
  };

  const resourceActions = [...trackedResources, ...untrackedResources].sort((a, b) => {
    const sortA = getResourceSortValue(a);
    const sortB = getResourceSortValue(b);
    if (sortA !== sortB) return sortA - sortB;
    return a.name.localeCompare(b.name);
  });

  if (resourceActions.length === 0) return null;

  return (
    <Panel title="Class Resources" icon={Zap}>
      <div className="flex flex-col gap-2.5">
        {resourceActions.map((a) => {
          const u = a.uses;
          if (!u) {
            return (
              <div
                key={`${a.source}-${a.name}`}
                onClick={() => toggleExpand(`res-${a.name}`)}
                className="group/res flex flex-col gap-2 cursor-pointer rounded-xl border border-border/40 bg-gradient-to-r from-secondary/20 to-transparent p-3.5 transition-all duration-300 hover:border-accent/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="font-heading text-xs font-bold text-foreground truncate group-hover/res:text-accent transition-colors">
                      {a.name}
                    </span>
                  </div>
                  {a.activation && (
                    <span className="shrink-0 rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-primary font-semibold select-none">
                      ⚡ {getActivationText(a.activation)}
                    </span>
                  )}
                </div>
                {expandedItems[`res-${a.name}`] && a.description && (
                  <div
                    className="text-[10px] leading-relaxed text-muted-foreground/90 mt-1 border-t border-border/10 pt-1.5"
                    dangerouslySetInnerHTML={{ __html: a.description }}
                  />
                )}
              </div>
            );
          }
          const out = u.current <= 0;
          const ratio = u.max > 0 ? u.current / u.max : 0;
          const isSmallMax = u.max <= 8;
          const isRageResource =
            a.name.toLowerCase() === "rage" ||
            a.name.toLowerCase() === "rages" ||
            a.name.toLowerCase() === "rage (enter)" ||
            a.name.toLowerCase().startsWith("rage (");
          const displayName = isRageResource ? "Rage" : a.name;
          return (
            <div
              key={`${a.source}-${a.name}`}
              onClick={() => toggleExpand(`res-${a.name}`)}
              className="group/res flex flex-col gap-2.5 cursor-pointer rounded-xl border border-border/40 bg-gradient-to-r from-secondary/20 to-transparent p-3.5 transition-all duration-300 hover:border-accent/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col min-w-0">
                  <span className="font-heading text-xs font-bold text-foreground truncate group-hover/res:text-accent transition-colors">
                    {displayName}
                  </span>
                  {u.reset && (
                    <span className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground/80 uppercase tracking-wider mt-0.5 select-none">
                      🕒 Resets on {u.reset}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isRageResource && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-block" onClick={(e) => e.stopPropagation()}>
                          <CustomSelect
                            value={localRage}
                            onChange={setLocalRage}
                            options={rageOptions}
                            triggerClassName={cn(
                              "inline-flex items-center gap-1 cursor-pointer rounded border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider select-none transition-colors",
                              localRage !== "None"
                                ? "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20"
                                : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/60",
                            )}
                            labelPrefix={<span>🔥 Rage:&nbsp;</span>}
                            openUpward={true}
                            onOpenChange={setIsRageSelectOpen}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        className={cn("max-w-[280px] text-xs", isRageSelectOpen && "hidden")}
                      >
                        {RAGE_DICTIONARY[localRage] || "Select a Rage state to apply benefits."}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <div className="flex items-baseline gap-0.5 select-none font-semibold">
                    <span
                      className={`font-mono text-sm font-extrabold ${out ? "text-destructive" : "text-accent"}`}
                    >
                      {u.current}
                    </span>
                    <span className="text-muted-foreground/50 text-[10px] font-mono">/</span>
                    <span className="font-mono text-xs text-muted-foreground">{u.max}</span>
                  </div>
                </div>
              </div>

              {isSmallMax ? (
                <div
                  className="mt-1.5 flex items-center justify-between gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: u.max }).map((_, i) => {
                      const active = i < u.current;
                      return (
                        <span
                          key={i}
                          onClick={() => localResources.toggleResourceBubble(a.name, i, u.max)}
                          className={`h-3 w-3 rounded-full cursor-pointer border transition-all duration-200 hover:scale-120 ${
                            active
                              ? "border-accent bg-accent shadow-[0_0_8px_var(--accent)] hover:bg-accent/85"
                              : "border-accent/40 bg-transparent hover:bg-accent/20"
                          }`}
                          title={
                            active
                              ? "Active use bubble (Click to spend)"
                              : "Spent use bubble (Click to restore)"
                          }
                        />
                      );
                    })}
                  </div>
                  {a.activation && (
                    <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-primary font-semibold select-none">
                      ⚡ {getActivationText(a.activation)}
                    </span>
                  )}
                </div>
              ) : (
                <div
                  className="mt-1.5 flex items-center justify-between gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary/50 border border-border/10 p-[1.5px] flex items-center">
                    <div
                      className="h-full rounded-full bg-accent shadow-[0_0_8px_var(--accent)] transition-all duration-500"
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => localResources.useResource(a.name, u.max)}
                      disabled={u.current <= 0}
                      className="rounded-lg border border-accent/30 bg-accent/5 px-2.5 py-1 text-[9.5px] font-bold text-accent hover:bg-accent/15 disabled:opacity-30 cursor-pointer focus:outline-none transition-all"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => localResources.regainResource(a.name)}
                      disabled={(localResources.spent[a.name] ?? 0) <= 0}
                      className="rounded-lg border border-border/50 bg-secondary/35 px-2.5 py-1 text-[9.5px] font-semibold text-muted-foreground hover:border-accent/40 hover:text-accent hover:bg-secondary/60 disabled:opacity-30 cursor-pointer focus:outline-none transition-all"
                    >
                      Regain
                    </button>
                    {a.activation && (
                      <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-primary font-semibold select-none ml-1">
                        ⚡ {getActivationText(a.activation)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {expandedItems[`res-${a.name}`] && a.description && (
                <div
                  className="text-[10px] leading-relaxed text-muted-foreground/90 mt-2 border-t border-border/10 pt-1.5"
                  dangerouslySetInnerHTML={{ __html: a.description }}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function WeaponMasteriesPanel({
  localWeaponMasteries,
  setLocalWeaponMasteries,
}: {
  localWeaponMasteries: any[];
  setLocalWeaponMasteries: (val: any[]) => void;
}) {
  if (!localWeaponMasteries || localWeaponMasteries.length === 0) return null;

  return (
    <Panel title="Weapon Masteries" icon={Swords}>
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-muted-foreground mb-1 select-none">
          Select and modify your chosen Weapon Mastery properties:
        </p>
        <div className="flex flex-col gap-3">
          {Array.from({ length: localWeaponMasteries.length }).map((_, slotIdx) => {
            const currentOptionName = localWeaponMasteries[slotIdx]?.name || "None";
            return (
              <div
                key={slotIdx}
                className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-secondary/15"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                    Weapon {slotIdx + 1}
                  </span>
                  <CustomSelect
                    value={currentOptionName}
                    onChange={(val) => {
                      const nextMasteries = [...localWeaponMasteries];
                      if (val === "None") {
                        nextMasteries.splice(slotIdx, 1);
                      } else {
                        const newOption = {
                          name: val,
                          description: WEAPON_MASTERY_DICTIONARY[val] || "",
                        };
                        if (slotIdx < nextMasteries.length) {
                          nextMasteries[slotIdx] = newOption;
                        } else {
                          nextMasteries.push(newOption);
                        }
                      }
                      setLocalWeaponMasteries(nextMasteries.filter(Boolean));
                    }}
                    options={["None", ...Object.keys(WEAPON_MASTERY_DICTIONARY)]}
                    triggerClassName="text-accent text-xs font-heading font-extrabold border border-border/30 rounded px-1.5 py-0.5 hover:border-accent/40"
                    optionsWidth="w-56"
                  />
                </div>
                {currentOptionName !== "None" && WEAPON_MASTERY_DICTIONARY[currentOptionName] && (
                  <p className="text-[10.5px] leading-relaxed text-muted-foreground/90 border-t border-border/10 pt-2 mt-1">
                    {WEAPON_MASTERY_DICTIONARY[currentOptionName]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

export function CombatPanel({
  member,
  localRage,
  setLocalRage,
  localWeaponMasteries,
  setLocalWeaponMasteries,
  localResources,
  expandedItems,
  toggleExpand,
}: {
  member: PartyMember;
  localRage: string;
  setLocalRage: (val: string) => void;
  localWeaponMasteries: any[];
  setLocalWeaponMasteries: (val: any[]) => void;
  localResources: any;
  expandedItems: Record<string, boolean>;
  toggleExpand: (key: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="flex flex-col gap-4">
        <AttacksPanel
          member={member}
          localWeaponMasteries={localWeaponMasteries}
          localRage={localRage}
          expandedItems={expandedItems}
          toggleExpand={toggleExpand}
        />
      </div>
      <div className="flex flex-col gap-4">
        <ResourcesPanel
          member={member}
          localRage={localRage}
          setLocalRage={setLocalRage}
          localResources={localResources}
          expandedItems={expandedItems}
          toggleExpand={toggleExpand}
        />
        <WeaponMasteriesPanel
          localWeaponMasteries={localWeaponMasteries}
          setLocalWeaponMasteries={setLocalWeaponMasteries}
        />
      </div>
    </div>
  );
}
