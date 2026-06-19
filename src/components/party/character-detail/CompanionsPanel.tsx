import { Brain } from "lucide-react";
import { PartyMember } from "@/lib/dndbeyond.types";
import { Panel } from "../CharacterDetailView";

export function CompanionsPanel({ member }: { member: PartyMember }) {
  if (!member.creatures || member.creatures.length === 0) {
    return (
      <Panel>
        <p className="py-8 text-center text-sm text-muted-foreground">No companions active.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Companions & Summons" icon={Brain}>
      <div className="flex flex-col gap-4">
        {member.creatures.map((c) => {
          const def = c.definition;
          const getMod = (val: number) => {
            const m = Math.floor((val - 10) / 2);
            return m >= 0 ? `+${m}` : `${m}`;
          };
          const statNames = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
          return (
            <div
              key={c.id}
              className="flex flex-col gap-3 rounded-xl border border-border/40 bg-gradient-to-br from-secondary/15 to-transparent p-4 transition-all duration-300 hover:border-accent/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {def.avatarUrl ? (
                    <img
                      src={def.avatarUrl}
                      alt={def.name}
                      className="h-12 w-12 rounded-lg object-cover border border-border"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground text-[10px] font-bold uppercase select-none">
                      🐾
                    </div>
                  )}
                  <div>
                    <h4 className="font-heading text-sm font-extrabold text-foreground">
                      {c.name || def.name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5 select-none">
                      {def.armorClassDescription
                        ? `${def.armorClass} AC ${def.armorClassDescription}`
                        : `${def.armorClass} AC`}
                    </p>
                  </div>
                </div>
                <div className="text-right select-none">
                  <div className="text-xs font-bold text-foreground">
                    HP: {def.averageHitPoints - c.removedHitPoints} / {def.averageHitPoints}
                  </div>
                  {def.hitPointDice && (
                    <span className="text-[9px] text-muted-foreground font-mono">
                      ({def.hitPointDice.diceString})
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-6 gap-1 bg-secondary/35 rounded-lg p-2 text-center border border-border/10 select-none">
                {def.stats.map((s, idx) => (
                  <div key={s.statId}>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase">
                      {statNames[idx] || `S${s.statId}`}
                    </div>
                    <div className="text-sm font-extrabold text-foreground mt-0.5">{s.value}</div>
                    <div className="text-[10px] text-muted-foreground/80 font-mono mt-0.5 font-semibold">
                      {getMod(s.value)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Senses and Speeds */}
              <div className="flex flex-wrap gap-1.5 text-[9.5px] select-none">
                {def.movements.map((mv) => (
                  <span
                    key={mv.movementId}
                    className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-primary font-semibold uppercase tracking-wide"
                  >
                    🚶 {mv.speed} ft.
                  </span>
                ))}
                {def.passivePerception && (
                  <span className="rounded-md bg-ui-teal/10 border border-ui-teal/20 px-2 py-0.5 text-ui-teal font-semibold uppercase tracking-wide">
                    👁️ Passive Perception: {def.passivePerception}
                  </span>
                )}
              </div>

              {/* Saving Throws & Skills */}
              {((def.savingThrows && def.savingThrows.length > 0) ||
                (def.skills && def.skills.length > 0)) && (
                <div className="flex flex-col gap-1.5 text-[11px] bg-secondary/20 rounded-lg p-2.5 border border-border/10 select-none">
                  {def.savingThrows && def.savingThrows.length > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
                      <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wide">
                        Saves:
                      </span>
                      {def.savingThrows.map((st) => (
                        <span
                          key={st.name}
                          className="font-semibold text-foreground/95 bg-secondary/40 px-1.5 py-0.5 rounded border border-border/10"
                        >
                          {st.name} {st.value >= 0 ? `+${st.value}` : st.value}
                        </span>
                      ))}
                    </div>
                  )}
                  {def.skills && def.skills.length > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
                      <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wide">
                        Skills:
                      </span>
                      {def.skills.map((sk) => (
                        <span
                          key={sk.name}
                          className="font-semibold text-foreground/95 bg-secondary/40 px-1.5 py-0.5 rounded border border-border/10"
                        >
                          {sk.name} {sk.value >= 0 ? `+${sk.value}` : sk.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Descriptions & Actions */}
              <div className="flex flex-col gap-3.5 border-t border-border/10 pt-3 text-xs leading-relaxed text-muted-foreground/95">
                {def.specialTraitsDescription && (
                  <div>
                    <h5 className="text-[9.5px] font-bold uppercase text-foreground/80 tracking-wider mb-1 select-none">
                      Special Traits
                    </h5>
                    <div
                      dangerouslySetInnerHTML={{ __html: def.specialTraitsDescription }}
                      className="space-y-1 text-muted-foreground/90 pl-1"
                    />
                  </div>
                )}
                {def.actionsDescription && (
                  <div>
                    <h5 className="text-[9.5px] font-bold uppercase text-foreground/80 tracking-wider mb-1 select-none">
                      Actions
                    </h5>
                    <div
                      dangerouslySetInnerHTML={{ __html: def.actionsDescription }}
                      className="space-y-1 text-muted-foreground/90 pl-1"
                    />
                  </div>
                )}
                {def.reactionsDescription && (
                  <div>
                    <h5 className="text-[9.5px] font-bold uppercase text-foreground/80 tracking-wider mb-1 select-none">
                      Reactions
                    </h5>
                    <div
                      dangerouslySetInnerHTML={{ __html: def.reactionsDescription }}
                      className="space-y-1 text-muted-foreground/90 pl-1"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
