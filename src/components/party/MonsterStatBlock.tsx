import { useState, useEffect } from "react";
import { Dice5, Shield, Heart, BookOpen } from "lucide-react";
import { getMonsterFluffByName } from "@/lib/db-functions";

interface MonsterStatBlockProps {
  monster: any;
  onRoll?: (rollName: string, formula: string, resultText: string) => void;
  compact?: boolean;
}

function stripTags(value: unknown): string {
  return String(value ?? "")
    .replace(
      /\{@(?:spell|item|condition|skill|sense|action|dc|damage|filter|book|note|b|i|scaledice|dice)\s+([^}|]+)(?:\|[^}]*)?\}/g,
      "$1",
    )
    .replace(/\{@[^}]+\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveFluffImage(pathStr: string): string {
  if (!pathStr) return "";
  if (pathStr.startsWith("http://") || pathStr.startsWith("https://")) {
    return pathStr;
  }
  return `https://5e.tools/img/${pathStr}`;
}

function EntryRenderer({
  entry,
  depth = 0,
}: {
  entry: any;
  depth?: number;
}): React.JSX.Element | null {
  if (!entry) return null;

  if (typeof entry === "string") {
    return <p className="text-foreground/80 leading-relaxed mb-3 text-xs">{stripTags(entry)}</p>;
  }

  if (Array.isArray(entry)) {
    return (
      <>
        {entry.map((sub, i) => (
          <EntryRenderer key={i} entry={sub} depth={depth} />
        ))}
      </>
    );
  }

  const type = entry.type || "entries";

  switch (type) {
    case "section":
    case "entries": {
      const HeadingTag = depth === 0 ? "h4" : "h5";
      const headingClass =
        depth === 0
          ? "text-xs font-bold mt-4 mb-2 border-b border-amber-600/20 pb-0.5 text-amber-500 uppercase tracking-wide"
          : "text-[11px] font-bold mt-3 mb-1 text-foreground/90";

      return (
        <div className="mb-3">
          {entry.name && <HeadingTag className={headingClass}>{stripTags(entry.name)}</HeadingTag>}
          {entry.entries && <EntryRenderer entry={entry.entries} depth={depth + 1} />}
        </div>
      );
    }
    case "list": {
      return (
        <ul className="list-disc pl-4 space-y-1 mb-3 text-foreground/75 text-xs">
          {entry.items?.map((item: any, i: number) => (
            <li key={i}>
              <EntryRenderer entry={item} depth={depth} />
            </li>
          ))}
        </ul>
      );
    }
    case "table": {
      return (
        <div className="overflow-x-auto my-3 rounded border border-amber-600/10 bg-secondary/5">
          <table className="w-full text-[11px] border-collapse text-left">
            {entry.caption && (
              <caption className="p-2 text-[10px] font-semibold text-muted-foreground text-center bg-secondary/15">
                {stripTags(entry.caption)}
              </caption>
            )}
            {entry.colHeaders && (
              <thead>
                <tr className="bg-secondary/20 border-b border-amber-600/15">
                  {entry.colHeaders.map((header: string, i: number) => (
                    <th key={i} className="p-2 font-semibold text-foreground">
                      {stripTags(header)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {entry.rows?.map((row: any[], rIdx: number) => (
                <tr
                  key={rIdx}
                  className="border-b border-border/10 last:border-0 hover:bg-secondary/5"
                >
                  {row.map((cell: any, cIdx: number) => (
                    <td key={cIdx} className="p-2 text-foreground/70">
                      <EntryRenderer entry={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "image": {
      const pathStr = entry.href?.path || entry.path;
      if (!pathStr) return null;
      const imageUrl = resolveFluffImage(pathStr);
      return (
        <div className="my-3 flex flex-col items-center gap-1">
          <img
            src={imageUrl}
            alt={entry.title || "Illustration"}
            className="rounded max-w-full max-h-48 shadow border border-border/20 object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          {entry.title && (
            <span className="text-[10px] text-muted-foreground italic">
              {stripTags(entry.title)}
            </span>
          )}
        </div>
      );
    }
    default:
      if (entry.entries) {
        return <EntryRenderer entry={entry.entries} depth={depth} />;
      }
      if (entry.entry) {
        return <EntryRenderer entry={entry.entry} depth={depth} />;
      }
      return null;
  }
}

export function MonsterStatBlock({ monster, onRoll, compact = false }: MonsterStatBlockProps) {
  const [fluff, setFluff] = useState<any>(null);

  useEffect(() => {
    let active = true;
    if (monster?.name) {
      getMonsterFluffByName({ data: { name: monster.name } })
        .then((fluffJson) => {
          if (!active) return;
          if (fluffJson) {
            try {
              setFluff(JSON.parse(fluffJson));
            } catch {
              setFluff(null);
            }
          } else {
            setFluff(null);
          }
        })
        .catch(() => {
          if (active) setFluff(null);
        });
    } else {
      setFluff(null);
    }
    return () => {
      active = false;
    };
  }, [monster?.name]);

  if (!monster) return null;

  // Helper to format ability modifier
  const getMod = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // Helper to trigger a dice roll
  const triggerRoll = (
    name: string,
    formula: string,
    _type: "check" | "damage" | "save" | "attack",
  ) => {
    if (!onRoll) return;

    // Basic dice roller parser
    // Supported forms: "1d20+4", "1d6+2", "2d6", etc.
    const match = formula
      .toLowerCase()
      .replace(/\s+/g, "")
      .match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) {
      // Fallback if it's just a modifier (like +4)
      if (formula.startsWith("+") || formula.startsWith("-") || !isNaN(Number(formula))) {
        const mod = parseInt(formula, 10) || 0;
        const d20 = Math.floor(Math.random() * 20) + 1;
        const total = d20 + mod;
        onRoll(
          `${monster.name}: ${name}`,
          `1d20${mod >= 0 ? "+" : ""}${mod}`,
          `Rolled: [${d20}] ${mod >= 0 ? "+" : ""}${mod} = **${total}**`,
        );
      } else {
        // Raw text roll fallback
        onRoll(`${monster.name}: ${name}`, formula, `Calculated raw text roll: ${formula}`);
      }
      return;
    }

    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    const rolls: number[] = [];
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      sum += roll;
    }

    const total = sum + modifier;
    const rollsStr = rolls.length > 1 ? `[${rolls.join(", ")}]` : `[${sum}]`;
    const modStr = modifier !== 0 ? ` ${modifier >= 0 ? "+" : ""}${modifier}` : "";
    const resultText = `Rolled ${formula}: ${rollsStr}${modStr} = **${total}**`;

    onRoll(`${monster.name}: ${name}`, formula, resultText);
  };

  // Extract AC
  const acValue = Array.isArray(monster.armor_class)
    ? (monster.armor_class[0]?.value ?? 10)
    : ((typeof monster.armor_class === "object"
        ? monster.armor_class.value
        : monster.armor_class) ?? 10);
  const acDesc =
    Array.isArray(monster.armor_class) && monster.armor_class[0]?.description
      ? ` (${monster.armor_class[0].description})`
      : Array.isArray(monster.armor_class) && monster.armor_class[0]?.armor?.length
        ? ` (${monster.armor_class[0].armor.map((a: any) => a.name).join(", ")})`
        : "";

  // Extract speed
  const formatSpeed = () => {
    if (typeof monster.speed === "string") return monster.speed;
    if (typeof monster.speed === "object" && monster.speed !== null) {
      return Object.entries(monster.speed)
        .map(([k, v]) => `${k} ${v}`)
        .join(", ");
    }
    return "30 ft.";
  };

  // Extract saving throws and skills
  const savesList: string[] = [];
  const skillsList: string[] = [];

  if (Array.isArray(monster.proficiencies)) {
    monster.proficiencies.forEach((p: any) => {
      const name = p.proficiency?.name ?? "";
      if (name.startsWith("Saving Throw:")) {
        const stat = name.replace("Saving Throw: ", "");
        savesList.push(`${stat} +${p.value}`);
      } else if (name.startsWith("Skill:")) {
        const skill = name.replace("Skill: ", "");
        skillsList.push(`${skill} +${p.value}`);
      }
    });
  }

  // Extract immunities/resistances
  const parseList = (list: any) => {
    if (Array.isArray(list)) {
      return list.map((item) => (typeof item === "object" ? item.name : item)).join(", ");
    }
    if (typeof list === "string") return list;
    return "";
  };

  const damageResistances = parseList(monster.damage_resistances);
  const damageImmunities = parseList(monster.damage_immunities);
  const damageVulnerabilities = parseList(monster.damage_vulnerabilities);
  const conditionImmunities = parseList(monster.condition_immunities);

  // Extract senses
  const formatSenses = () => {
    if (typeof monster.senses === "object" && monster.senses !== null) {
      return Object.entries(monster.senses)
        .map(([k, v]) => `${k.replace("_", " ")} ${v}`)
        .join(", ");
    }
    return "passive Perception 10";
  };

  return (
    <div
      className={`text-sm select-none border-t-4 border-b-4 border-amber-600/40 bg-zinc-950/40 p-4 rounded shadow-md border-x border-x-border/30 max-w-2xl ${compact ? "p-3" : ""}`}
    >
      {/* Title */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="font-heading text-xl font-extrabold tracking-tight text-amber-500 uppercase">
            {monster.name}
          </h2>
          <p className="text-xs italic text-muted-foreground mt-0.5">
            {monster.size} {monster.type}
            {monster.subtype ? ` (${monster.subtype})` : ""}, {monster.alignment}
          </p>
        </div>
        {(() => {
          const firstFluffImage =
            fluff?.images?.[0]?.href?.path || fluff?.images?.[0]?.path || null;
          const showLargeImage = !compact && firstFluffImage;
          if (showLargeImage) {
            return null; // Render large image below title/info for better layout
          }
          if (firstFluffImage) {
            return (
              <img
                src={resolveFluffImage(firstFluffImage)}
                alt={monster.name}
                className="w-16 h-16 rounded-lg border border-amber-600/30 bg-secondary/20 object-cover shadow-md"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            );
          }
          if (monster.image) {
            return (
              <img
                src={`https://www.dnd5eapi.co${monster.image}`}
                alt={monster.name}
                className="w-12 h-12 rounded-lg border border-border bg-secondary/20 object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            );
          }
          return null;
        })()}
      </div>

      {/* Large Showcase Image for Non-Compact layout */}
      {(() => {
        const firstFluffImage = fluff?.images?.[0]?.href?.path || fluff?.images?.[0]?.path || null;
        if (!compact && firstFluffImage) {
          return (
            <div className="my-3 overflow-hidden rounded border border-amber-600/20 max-w-full h-48 bg-secondary/10 flex justify-center items-center">
              <img
                src={resolveFluffImage(firstFluffImage)}
                alt={monster.name}
                className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          );
        }
        return null;
      })()}

      {/* Decorative red line */}
      <hr className="border-t border-amber-600/30 my-2" />

      {/* Basic stats block */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <Shield size={12} className="text-amber-500/70" />
          <span className="font-bold text-muted-foreground uppercase tracking-wide">
            Armor Class:
          </span>
          <span className="text-foreground font-semibold">
            {acValue}
            {acDesc}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Heart size={12} className="text-rose-500/70" />
          <span className="font-bold text-muted-foreground uppercase tracking-wide">
            Hit Points:
          </span>
          <span className="text-foreground font-semibold">
            {monster.hit_points} ({monster.hit_points_roll || monster.hit_dice})
          </span>
          {onRoll && (
            <button
              onClick={() =>
                triggerRoll("HP Roll", monster.hit_points_roll || monster.hit_dice, "damage")
              }
              className="p-1 rounded bg-secondary/50 border border-border/50 text-muted-foreground hover:text-accent hover:border-accent/40 cursor-pointer active:scale-95 transition-all"
              title="Roll Hit Points"
            >
              <Dice5 size={10} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-muted-foreground uppercase tracking-wide">Speed:</span>
          <span className="text-foreground font-semibold">{formatSpeed()}</span>
        </div>
      </div>

      {/* Decorative red line */}
      <hr className="border-t border-amber-600/30 my-2" />

      {/* Ability Scores Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 text-center gap-1 my-2 bg-secondary/20 py-1.5 rounded border border-border/30">
        <div>
          <p className="font-bold text-[10px] text-amber-500/80 uppercase">Str</p>
          <button
            onClick={() => onRoll && triggerRoll("STR Check", getMod(monster.strength), "check")}
            className={`font-semibold text-sm hover:text-accent cursor-pointer ${onRoll ? "underline decoration-dotted" : ""}`}
          >
            {monster.strength}{" "}
            <span className="text-xs text-muted-foreground">({getMod(monster.strength)})</span>
          </button>
        </div>
        <div>
          <p className="font-bold text-[10px] text-amber-500/80 uppercase">Dex</p>
          <button
            onClick={() => onRoll && triggerRoll("DEX Check", getMod(monster.dexterity), "check")}
            className={`font-semibold text-sm hover:text-accent cursor-pointer ${onRoll ? "underline decoration-dotted" : ""}`}
          >
            {monster.dexterity}{" "}
            <span className="text-xs text-muted-foreground">({getMod(monster.dexterity)})</span>
          </button>
        </div>
        <div>
          <p className="font-bold text-[10px] text-amber-500/80 uppercase">Con</p>
          <button
            onClick={() =>
              onRoll && triggerRoll("CON Check", getMod(monster.constitution), "check")
            }
            className={`font-semibold text-sm hover:text-accent cursor-pointer ${onRoll ? "underline decoration-dotted" : ""}`}
          >
            {monster.constitution}{" "}
            <span className="text-xs text-muted-foreground">({getMod(monster.constitution)})</span>
          </button>
        </div>
        <div>
          <p className="font-bold text-[10px] text-amber-500/80 uppercase">Int</p>
          <button
            onClick={() =>
              onRoll && triggerRoll("INT Check", getMod(monster.intelligence), "check")
            }
            className={`font-semibold text-sm hover:text-accent cursor-pointer ${onRoll ? "underline decoration-dotted" : ""}`}
          >
            {monster.intelligence}{" "}
            <span className="text-xs text-muted-foreground">({getMod(monster.intelligence)})</span>
          </button>
        </div>
        <div>
          <p className="font-bold text-[10px] text-amber-500/80 uppercase">Wis</p>
          <button
            onClick={() => onRoll && triggerRoll("WIS Check", getMod(monster.wisdom), "check")}
            className={`font-semibold text-sm hover:text-accent cursor-pointer ${onRoll ? "underline decoration-dotted" : ""}`}
          >
            {monster.wisdom}{" "}
            <span className="text-xs text-muted-foreground">({getMod(monster.wisdom)})</span>
          </button>
        </div>
        <div>
          <p className="font-bold text-[10px] text-amber-500/80 uppercase">Cha</p>
          <button
            onClick={() => onRoll && triggerRoll("CHA Check", getMod(monster.charisma), "check")}
            className={`font-semibold text-sm hover:text-accent cursor-pointer ${onRoll ? "underline decoration-dotted" : ""}`}
          >
            {monster.charisma}{" "}
            <span className="text-xs text-muted-foreground">({getMod(monster.charisma)})</span>
          </button>
        </div>
      </div>

      {/* Decorative red line */}
      <hr className="border-t border-amber-600/30 my-2" />

      {/* Saves, Skills, Immunities, Senses, Languages, CR */}
      <div className="space-y-1 text-xs">
        {savesList.length > 0 && (
          <div>
            <span className="font-bold text-muted-foreground uppercase tracking-wide mr-1">
              Saving Throws:
            </span>
            <span className="text-foreground">
              {savesList.map((save, idx) => {
                const parts = save.split(" ");
                return (
                  <span key={idx}>
                    {idx > 0 && ", "}
                    <button
                      onClick={() => onRoll && triggerRoll(`${parts[0]} Save`, parts[1], "save")}
                      className={`hover:text-accent cursor-pointer ${onRoll ? "underline decoration-dotted" : ""}`}
                    >
                      {save}
                    </button>
                  </span>
                );
              })}
            </span>
          </div>
        )}
        {skillsList.length > 0 && (
          <div>
            <span className="font-bold text-muted-foreground uppercase tracking-wide mr-1">
              Skills:
            </span>
            <span className="text-foreground">
              {skillsList.map((skill, idx) => {
                const parts = skill.split(" +");
                return (
                  <span key={idx}>
                    {idx > 0 && ", "}
                    <button
                      onClick={() =>
                        onRoll && triggerRoll(`${parts[0]} Check`, `+${parts[1]}`, "check")
                      }
                      className={`hover:text-accent cursor-pointer ${onRoll ? "underline decoration-dotted" : ""}`}
                    >
                      {skill}
                    </button>
                  </span>
                );
              })}
            </span>
          </div>
        )}
        {damageVulnerabilities && (
          <div>
            <span className="font-bold text-muted-foreground uppercase tracking-wide mr-1">
              Damage Vulnerabilities:
            </span>
            <span className="text-foreground">{damageVulnerabilities}</span>
          </div>
        )}
        {damageResistances && (
          <div>
            <span className="font-bold text-muted-foreground uppercase tracking-wide mr-1">
              Damage Resistances:
            </span>
            <span className="text-foreground">{damageResistances}</span>
          </div>
        )}
        {damageImmunities && (
          <div>
            <span className="font-bold text-muted-foreground uppercase tracking-wide mr-1">
              Damage Immunities:
            </span>
            <span className="text-foreground">{damageImmunities}</span>
          </div>
        )}
        {conditionImmunities && (
          <div>
            <span className="font-bold text-muted-foreground uppercase tracking-wide mr-1">
              Condition Immunities:
            </span>
            <span className="text-foreground">{conditionImmunities}</span>
          </div>
        )}
        <div>
          <span className="font-bold text-muted-foreground uppercase tracking-wide mr-1">
            Senses:
          </span>
          <span className="text-foreground">{formatSenses()}</span>
        </div>
        <div>
          <span className="font-bold text-muted-foreground uppercase tracking-wide mr-1">
            Languages:
          </span>
          <span className="text-foreground">{monster.languages || "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-muted-foreground uppercase tracking-wide">
            Challenge:
          </span>
          <span className="text-foreground font-semibold">
            {monster.challenge_rating >= 0.125 && monster.challenge_rating < 1
              ? monster.challenge_rating === 0.5
                ? "1/2"
                : monster.challenge_rating === 0.25
                  ? "1/4"
                  : "1/8"
              : monster.challenge_rating}{" "}
            ({monster.xp?.toLocaleString() ?? 0} XP)
          </span>
        </div>
      </div>

      {/* Traits Section */}
      {monster.special_abilities?.length > 0 && (
        <>
          <hr className="border-t border-amber-600/30 my-2" />
          <div className="space-y-2">
            {monster.special_abilities.map((ability: any, idx: number) => (
              <div key={idx} className="text-xs">
                <span className="font-extrabold italic text-amber-500/95 mr-1">
                  {ability.name}.
                </span>
                <span className="text-foreground/90">{ability.desc}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Actions Section */}
      {monster.actions?.length > 0 && (
        <>
          <hr className="border-t-2 border-amber-600/40 my-3" />
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-amber-500 border-b border-amber-600/20 pb-0.5 mb-2">
            Actions
          </h3>
          <div className="space-y-3">
            {monster.actions.map((action: any, idx: number) => (
              <div key={idx} className="text-xs space-y-1">
                <div>
                  <span className="font-extrabold italic text-amber-500/95 mr-1">
                    {action.name}.
                  </span>
                  <span className="text-foreground/90">{action.desc}</span>
                </div>
                {onRoll && (action.attack_bonus !== undefined || action.damage?.length > 0) && (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {action.attack_bonus !== undefined && (
                      <button
                        onClick={() =>
                          triggerRoll(
                            `${action.name} (To Hit)`,
                            `+${action.attack_bonus}`,
                            "attack",
                          )
                        }
                        className="inline-flex items-center gap-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 px-2 py-0.5 text-[10px] font-semibold text-amber-400 cursor-pointer active:scale-95 transition-all"
                      >
                        <Dice5 size={10} />
                        <span>To Hit (+{action.attack_bonus})</span>
                      </button>
                    )}
                    {action.damage?.map((dmg: any, dIdx: number) => {
                      if (!dmg.damage_dice) return null;
                      return (
                        <button
                          key={dIdx}
                          onClick={() =>
                            triggerRoll(`${action.name} Damage`, dmg.damage_dice, "damage")
                          }
                          className="inline-flex items-center gap-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 px-2 py-0.5 text-[10px] font-semibold text-rose-400 cursor-pointer active:scale-95 transition-all"
                        >
                          <Dice5 size={10} />
                          <span>
                            Dmg ({dmg.damage_dice}
                            {dmg.damage_type?.name ? ` ${dmg.damage_type.name}` : ""})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Reactions Section */}
      {monster.reactions?.length > 0 && (
        <>
          <hr className="border-t-2 border-amber-600/40 my-3" />
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-amber-500 border-b border-amber-600/20 pb-0.5 mb-2">
            Reactions
          </h3>
          <div className="space-y-2">
            {monster.reactions.map((reaction: any, idx: number) => (
              <div key={idx} className="text-xs">
                <span className="font-extrabold italic text-amber-500/95 mr-1">
                  {reaction.name}.
                </span>
                <span className="text-foreground/90">{reaction.desc}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Legendary Actions Section */}
      {monster.legendary_actions?.length > 0 && (
        <>
          <hr className="border-t-2 border-amber-600/40 my-3" />
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-amber-500 border-b border-amber-600/20 pb-0.5 mb-2">
            Legendary Actions
          </h3>
          <p className="text-[10px] italic text-muted-foreground mb-2">
            The creature can take 3 legendary actions, choosing from the options below. Only one
            legendary action option can be used at a time and only at the end of another creature's
            turn. The creature regains spent legendary actions at the start of its turn.
          </p>
          <div className="space-y-2">
            {monster.legendary_actions.map((la: any, idx: number) => (
              <div key={idx} className="text-xs">
                <span className="font-extrabold italic text-amber-500/95 mr-1">{la.name}.</span>
                <span className="text-foreground/90">{la.desc}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Lore & Description Section */}
      {fluff?.entries && fluff.entries.length > 0 && (
        <>
          <hr className="border-t-2 border-amber-600/40 my-3" />
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-amber-500 border-b border-amber-600/20 pb-0.5 mb-2 flex items-center gap-1.5">
            <BookOpen size={14} className="text-amber-500/80" />
            Lore & Description
          </h3>
          <div className="space-y-2 pr-1 max-h-60 overflow-y-auto custom-scrollbar">
            <EntryRenderer entry={fluff.entries} />
          </div>
        </>
      )}
    </div>
  );
}
