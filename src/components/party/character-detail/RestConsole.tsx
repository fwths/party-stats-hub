import { useState } from "react";
import { Moon, Hourglass, Tent } from "lucide-react";
import { PartyMember } from "@/lib/dndbeyond.types";
import { Panel } from "../CharacterDetailView";
import { parseHitDice } from "./hooks";
import { cn } from "@/lib/utils";

function DieSvg({ die, className, active }: { die: string; className?: string; active?: boolean }) {
  const normDie = die.toLowerCase();
  const activeColor = "var(--accent)";
  const strokeColor = active ? activeColor : "currentColor";
  const strokeWidth = "1.5";
  const fillOpacity = active ? "0.15" : "0";
  const lineOpacity = active ? "0.8" : "0.3";

  let content = null;

  if (normDie === "d4") {
    content = (
      <>
        <polygon
          points="50,12 90,83 10,83"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={active ? activeColor : "none"}
          fillOpacity={fillOpacity}
          strokeLinejoin="round"
        />
        <line
          x1="50"
          y1="58"
          x2="50"
          y2="12"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="58"
          x2="90"
          y2="83"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="58"
          x2="10"
          y2="83"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <text
          x="50"
          y="74"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fontFamily="monospace"
          fill={active ? activeColor : "currentColor"}
          opacity={active ? "1" : "0.5"}
        >
          4
        </text>
      </>
    );
  } else if (normDie === "d6") {
    content = (
      <>
        <polygon
          points="50,12 85,32 85,72 50,92 15,72 15,32"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={active ? activeColor : "none"}
          fillOpacity={fillOpacity}
          strokeLinejoin="round"
        />
        <line
          x1="50"
          y1="52"
          x2="50"
          y2="12"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="52"
          x2="85"
          y2="72"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="52"
          x2="15"
          y2="72"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <line
          x1="15"
          y1="32"
          x2="50"
          y2="52"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <line
          x1="85"
          y1="32"
          x2="50"
          y2="52"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fontFamily="monospace"
          fill={active ? activeColor : "currentColor"}
          opacity={active ? "1" : "0.5"}
        >
          6
        </text>
      </>
    );
  } else if (normDie === "d8") {
    content = (
      <>
        <polygon
          points="50,12 85,52 50,92 15,52"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={active ? activeColor : "none"}
          fillOpacity={fillOpacity}
          strokeLinejoin="round"
        />
        <line
          x1="15"
          y1="52"
          x2="85"
          y2="52"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="12"
          x2="50"
          y2="92"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <line
          x1="15"
          y1="52"
          x2="50"
          y2="35"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="85"
          y1="52"
          x2="50"
          y2="35"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="15"
          y1="52"
          x2="50"
          y2="69"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="85"
          y1="52"
          x2="50"
          y2="69"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fontFamily="monospace"
          fill={active ? activeColor : "currentColor"}
          opacity={active ? "1" : "0.5"}
        >
          8
        </text>
      </>
    );
  } else if (normDie === "d10") {
    content = (
      <>
        <polygon
          points="50,10 85,38 85,62 50,90 15,62 15,38"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={active ? activeColor : "none"}
          fillOpacity={fillOpacity}
          strokeLinejoin="round"
        />
        <line
          x1="50"
          y1="52"
          x2="50"
          y2="10"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="52"
          x2="85"
          y2="38"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="52"
          x2="85"
          y2="62"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="52"
          x2="50"
          y2="90"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="52"
          x2="15"
          y2="62"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="52"
          x2="15"
          y2="38"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
          strokeLinecap="round"
        />
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fontFamily="monospace"
          fill={active ? activeColor : "currentColor"}
          opacity={active ? "1" : "0.5"}
        >
          10
        </text>
      </>
    );
  } else if (normDie === "d12") {
    content = (
      <>
        <polygon
          points="50,10 80,24 95,50 80,76 50,90 20,76 5,50 20,24"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={active ? activeColor : "none"}
          fillOpacity={fillOpacity}
          strokeLinejoin="round"
        />
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="10"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="50"
          y1="50"
          x2="80"
          y2="24"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="50"
          y1="50"
          x2="95"
          y2="50"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="50"
          y1="50"
          x2="80"
          y2="76"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="90"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="50"
          y1="50"
          x2="20"
          y2="76"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="50"
          y1="50"
          x2="5"
          y2="50"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="50"
          y1="50"
          x2="20"
          y2="24"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fontSize="15"
          fontWeight="bold"
          fontFamily="monospace"
          fill={active ? activeColor : "currentColor"}
          opacity={active ? "1" : "0.5"}
        >
          12
        </text>
      </>
    );
  } else if (normDie === "d20") {
    content = (
      <>
        <polygon
          points="50,10 90,32 90,68 50,90 10,68 10,32"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={active ? activeColor : "none"}
          fillOpacity={fillOpacity}
          strokeLinejoin="round"
        />
        <polygon
          points="50,30 78,48 50,78 22,48"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={lineOpacity}
        />
        <line
          x1="50"
          y1="10"
          x2="50"
          y2="30"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="90"
          y1="32"
          x2="78"
          y2="48"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="90"
          y1="68"
          x2="78"
          y2="48"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="50"
          y1="90"
          x2="50"
          y2="78"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="10"
          y1="68"
          x2="22"
          y2="48"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="10"
          y1="32"
          x2="22"
          y2="48"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="50"
          y1="30"
          x2="78"
          y2="48"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="50"
          y1="30"
          x2="22"
          y2="48"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="50"
          y1="78"
          x2="78"
          y2="48"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <line
          x1="50"
          y1="78"
          x2="22"
          y2="48"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={lineOpacity}
        />
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize="15"
          fontWeight="bold"
          fontFamily="monospace"
          fill={active ? activeColor : "currentColor"}
          opacity={active ? "1" : "0.5"}
        >
          20
        </text>
      </>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)}>
      {content}
    </svg>
  );
}

export function RestConsole({
  member,
  localHp,
  setShortRestHealInput,
  setShortRestDiceSpend,
  setRestModal,
}: {
  member: PartyMember;
  localHp: any;
  setShortRestHealInput: (val: string) => void;
  setShortRestDiceSpend: (val: Record<string, number>) => void;
  setRestModal: (val: { type: "short" | "long" } | null) => void;
}) {
  const pools = parseHitDice(member.hitDice);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768; // collapsed by default on mobile
    }
    return true;
  });

  return (
    <section className="card-arcane card-arcane-hover rounded-xl border border-border/40 p-3.5 py-3 shadow-lg">
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "flex items-center justify-between w-full text-left font-bold uppercase tracking-widest text-accent text-glow-accent select-none focus:outline-none cursor-pointer text-[10px]",
          !isCollapsed && "border-b border-border/20 pb-2 mb-3",
        )}
      >
        <span className="flex items-center gap-2">
          <Moon size={13} className="text-accent animate-pulse" />
          <span>Rest & Hit Dice Tracker</span>
        </span>
        <span className="text-[10px] text-muted-foreground font-semibold lowercase tracking-normal bg-secondary/40 border border-border/30 rounded px-1.5 py-0.5 hover:text-accent hover:border-accent/40 transition-colors">
          {isCollapsed ? "expand" : "collapse"}
        </span>
      </button>

      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isCollapsed
            ? "grid-rows-[0fr] opacity-0 pointer-events-none"
            : "grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="overflow-hidden">
          <div className="grid gap-4 md:grid-cols-[1fr_2fr] items-start">
            {/* Left/Top: Rest Controls */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none pl-1">
                Rest Controls
              </span>
              <div className="flex flex-row md:flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShortRestHealInput("0");
                    setShortRestDiceSpend({});
                    setRestModal({ type: "short" });
                  }}
                  className="flex-1 rounded-lg border border-border bg-secondary/35 py-2 text-xs font-semibold tracking-wide text-muted-foreground hover:border-accent hover:text-accent hover:bg-secondary/60 cursor-pointer focus:outline-none flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <Hourglass size={12} className="text-accent/80" />
                  <span>Short Rest</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRestModal({ type: "long" });
                  }}
                  className="flex-1 rounded-lg border border-border bg-secondary/35 py-2 text-xs font-semibold tracking-wide text-muted-foreground hover:border-accent hover:text-accent hover:bg-secondary/60 cursor-pointer focus:outline-none flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <Tent size={12} className="text-accent/80" />
                  <span>Long Rest</span>
                </button>
              </div>
            </div>

            {/* Right/Bottom: Hit Dice Pools */}
            {pools.length > 0 ? (
              <div className="flex flex-col gap-2 border-t border-border/10 pt-4 md:border-t-0 md:pt-0 md:border-l md:border-border/10 md:pl-4">
                {pools.map((pool) => {
                  const spent = localHp.spentHitDice[pool.die] ?? 0;
                  const remaining = pool.remaining - spent;

                  return (
                    <div
                      key={pool.die}
                      className="group/hd relative overflow-hidden rounded-lg border border-border/40 bg-secondary/10 p-2.5 transition-all duration-200 hover:border-accent/40 hover:bg-secondary/20"
                    >
                      <div className="flex flex-col gap-2">
                        {/* Header Row */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-muted-foreground select-none">
                            <span className="w-4 h-4 text-accent/80 inline-block">
                              <DieSvg die={pool.die} active={true} />
                            </span>
                            <span>{pool.die} Pool</span>
                          </span>
                          <span className="font-mono font-bold text-muted-foreground">
                            <strong className="text-foreground">{remaining}</strong> / {pool.total}{" "}
                            Remaining
                          </span>
                        </div>

                        {/* Visual Dice Slot Grid */}
                        <div className="flex flex-wrap gap-1 py-0.5">
                          {Array.from({ length: pool.total }).map((_, i) => {
                            const active = i < remaining;
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  if (active) {
                                    localHp.spendHitDie(pool.die, 1);
                                  } else {
                                    localHp.regainHitDie(pool.die, 1);
                                  }
                                }}
                                className="h-8 w-8 flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none hover:scale-105 active:scale-95"
                                title={
                                  active
                                    ? `Click to spend 1 ${pool.die}`
                                    : `Click to regain 1 ${pool.die}`
                                }
                              >
                                <DieSvg die={pool.die} active={active} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center text-xs text-muted-foreground border-t border-border/10 pt-4 md:border-t-0 md:pt-0 md:border-l md:border-border/10 md:pl-4 py-4">
                No hit dice available
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
