import { Minus, Plus, Hourglass, Tent } from "lucide-react";
import { PartyMember } from "@/lib/dndbeyond.functions";
import { parseHitDice } from "./hooks";

interface RestModalsProps {
  restModal: { type: "short" | "long" } | null;
  onClose: () => void;
  member: PartyMember;
  localHp: {
    spentHitDice: Record<string, number>;
    shortRest: (healAmount: number) => void;
    spendHitDie: (die: string, count: number) => void;
    longRest: () => void;
  };
  localSlots: {
    restSlots: (isLongRest: boolean) => void;
  };
  localResources: {
    restResources: (isLongRest: boolean) => void;
  };
  shortRestDiceSpend: Record<string, number>;
  setShortRestDiceSpend: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  shortRestHealInput: string;
  setShortRestHealInput: (val: string) => void;
  setLocalInnateSorcery: (val: boolean) => void;
  setLocalStarryForm: (val: "None" | "Archer" | "Chalice" | "Dragon") => void;
  setLocalMantleOfMajesty: (val: boolean) => void;
}

export function RestModals({
  restModal,
  onClose,
  member,
  localHp,
  localSlots,
  localResources,
  shortRestDiceSpend,
  setShortRestDiceSpend,
  shortRestHealInput,
  setShortRestHealInput,
  setLocalInnateSorcery,
  setLocalStarryForm,
  setLocalMantleOfMajesty,
}: RestModalsProps) {
  if (!restModal) return null;

  return (
    <>
      {/* SHORT REST MODAL */}
      {restModal.type === "short" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-popover p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="font-heading text-lg font-bold text-foreground mb-1.5 flex items-center gap-2">
              <Hourglass size={18} className="text-accent/80" />
              <span>Take a Short Rest</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Restores pact magic spell slots and resets matching class resources. You can also roll
              hit dice to heal.
            </p>
            {(() => {
              const pools = parseHitDice(member.hitDice);
              const availablePools = pools.filter(
                (p) => p.remaining - (localHp.spentHitDice[p.die] ?? 0) > 0,
              );
              if (availablePools.length === 0) return null;
              return (
                <div className="mb-4 rounded-lg border border-border/40 bg-secondary/10 p-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Spend Hit Dice for Healing
                  </label>
                  <div className="flex flex-col gap-2.5">
                    {availablePools.map((pool) => {
                      const remaining = pool.remaining - (localHp.spentHitDice[pool.die] ?? 0);
                      const chosen = shortRestDiceSpend[pool.die] ?? 0;
                      return (
                        <div key={pool.die} className="flex items-center justify-between text-xs">
                          <span className="font-mono text-muted-foreground">
                            {pool.die} ({remaining} remaining)
                          </span>
                          <div className="flex items-center rounded border border-border/40 bg-secondary/20 p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setShortRestDiceSpend((prev) => ({
                                  ...prev,
                                  [pool.die]: Math.max(0, (prev[pool.die] ?? 0) - 1),
                                }));
                              }}
                              disabled={chosen <= 0}
                              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 cursor-pointer focus:outline-none"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="w-6 text-center font-mono text-[11px] font-bold select-none">
                              {chosen}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setShortRestDiceSpend((prev) => ({
                                  ...prev,
                                  [pool.die]: Math.min(remaining, (prev[pool.die] ?? 0) + 1),
                                }));
                              }}
                              disabled={chosen >= remaining}
                              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 cursor-pointer focus:outline-none"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <div className="mb-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Hit Points Regained
              </label>
              <input
                type="number"
                value={shortRestHealInput}
                onChange={(e) => setShortRestHealInput(e.target.value)}
                placeholder="0"
                className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm font-mono text-foreground focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const healAmt = parseInt(shortRestHealInput, 10) || 0;
                  localHp.shortRest(healAmt);

                  // Consume selected hit dice
                  Object.entries(shortRestDiceSpend).forEach(([die, count]) => {
                    if (count > 0) {
                      localHp.spendHitDie(die, count);
                    }
                  });

                  localSlots.restSlots(false);
                  localResources.restResources(false);
                  setLocalInnateSorcery(false);
                  setLocalStarryForm("None");
                  setLocalMantleOfMajesty(false);
                  onClose();
                }}
                className="rounded bg-accent px-4 py-1.5 text-xs font-bold text-accent-foreground hover:bg-accent/90 cursor-pointer"
              >
                Apply Rest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LONG REST MODAL */}
      {restModal.type === "long" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-popover p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="font-heading text-lg font-bold text-foreground mb-1.5 flex items-center gap-2">
              <Tent size={18} className="text-accent/80" />
              <span>Take a Long Rest</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Are you sure you want to take a Long Rest? This will fully restore Hit Points, fully
              restore hit dice, reset all spell slots, and reset long-rest class resources.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localHp.longRest();
                  localSlots.restSlots(true);
                  localResources.restResources(true);
                  setLocalInnateSorcery(false);
                  setLocalStarryForm("None");
                  setLocalMantleOfMajesty(false);
                  onClose();
                }}
                className="rounded bg-accent px-4 py-1.5 text-xs font-bold text-accent-foreground hover:bg-accent/90 cursor-pointer"
              >
                Confirm Long Rest
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
