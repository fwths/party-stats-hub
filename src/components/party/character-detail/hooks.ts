import { useState, useEffect } from "react";
import { SpellSlotLevel, ActionInfo } from "@/lib/dndbeyond.types";
import { syncedLocalStorage as syncedStorage } from "@/lib/synced-storage";

export interface LocalHpData {
  hpCurrent: number;
  tempHp: number;
  spentHitDice: Record<string, number>;
  deathSaves?: {
    successes: number;
    failures: number;
    stabilized: boolean;
  };
}

export interface LocalSlotsData {
  spellSlotsUsed: Record<number, number>;
  pactSlotsUsed: Record<number, number>;
}

export interface LocalResourcesData {
  spent: Record<string, number>;
}

export function parseHitDice(hitDiceStr: string) {
  if (!hitDiceStr || hitDiceStr === "—") return [];
  return hitDiceStr
    .split("+")
    .map((part) => {
      const m = part.trim().match(/(\d+)\/(\d+)d(\d+)/);
      if (m) {
        return {
          remaining: parseInt(m[1], 10),
          total: parseInt(m[2], 10),
          die: `d${m[3]}`,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{ remaining: number; total: number; die: string }>;
}

export function useLocalRage(memberId: number) {
  const storageKey = `party-stats:rage:${memberId}`;
  const [rage, setRage] = useState<string>(() => {
    try {
      const stored = syncedStorage.getItem(storageKey);
      if (stored !== null) {
        return stored;
      }
    } catch (e) {
      console.warn("Failed to load Rage state from localStorage:", e);
    }
    return "None";
  });

  const updateRage = (nextRage: string) => {
    setRage(nextRage);
    try {
      syncedStorage.setItem(storageKey, nextRage);
    } catch (e) {
      console.warn("Failed to save Rage state to localStorage:", e);
    }
  };

  return [rage, updateRage] as const;
}

export function useLocalMetamagic(
  memberId: number,
  initialMetamagic: Array<{ name: string; description: string }>,
) {
  const storageKey = `party-stats:metamagic:${memberId}`;
  const [metamagic, setMetamagic] = useState<Array<{ name: string; description: string }>>(() => {
    try {
      const stored = syncedStorage.getItem(storageKey);
      if (stored !== null) {
        return stored === "null" ? [] : JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load metamagic from localStorage:", e);
    }
    return initialMetamagic;
  });

  const updateMetamagic = (nextMetamagic: Array<{ name: string; description: string }>) => {
    setMetamagic(nextMetamagic);
    try {
      syncedStorage.setItem(storageKey, JSON.stringify(nextMetamagic));
    } catch (e) {
      console.warn("Failed to save metamagic to localStorage:", e);
    }
  };

  return [metamagic, updateMetamagic] as const;
}

export function useLocalWeaponMasteries(
  memberId: number,
  initialMasteries: Array<{ name: string; description: string }>,
) {
  const storageKey = `party-stats:weapon-masteries:${memberId}`;
  const [masteries, setMasteries] = useState<Array<{ name: string; description: string }>>(() => {
    try {
      const stored = syncedStorage.getItem(storageKey);
      if (stored !== null) {
        return stored === "null" ? [] : JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load weapon masteries from localStorage:", e);
    }
    return initialMasteries;
  });

  const updateMasteries = (nextMasteries: Array<{ name: string; description: string }>) => {
    setMasteries(nextMasteries);
    try {
      syncedStorage.setItem(storageKey, JSON.stringify(nextMasteries));
    } catch (e) {
      console.warn("Failed to save weapon masteries to localStorage:", e);
    }
  };

  return [masteries, updateMasteries] as const;
}

export function useLocalHpState(
  memberId: number,
  hpMax: number,
  hpCurrentInit: number,
  tempHpInit: number,
  hitDiceStr: string,
  deathSavesInit: { successes: number; failures: number; stabilized: boolean },
) {
  const storageKey = `party-stats:hp:${memberId}`;
  const [localData, setLocalData] = useState<LocalHpData>(() => {
    try {
      const stored = syncedStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          typeof parsed.hpCurrent === "number" &&
          typeof parsed.tempHp === "number" &&
          parsed.spentHitDice
        ) {
          return {
            ...parsed,
            deathSaves: parsed.deathSaves ?? deathSavesInit,
          };
        }
      }
    } catch (e) {
      console.warn("Failed to load HP data from localStorage:", e);
    }
    return {
      hpCurrent: hpCurrentInit,
      tempHp: tempHpInit,
      spentHitDice: {},
      deathSaves: deathSavesInit,
    };
  });

  useEffect(() => {
    try {
      syncedStorage.setItem(storageKey, JSON.stringify(localData));
    } catch (e) {
      console.warn("Failed to save HP data to localStorage:", e);
    }
  }, [localData, storageKey]);

  const damage = (amount: number) => {
    setLocalData((prev) => {
      let newTemp = prev.tempHp;
      let newHp = prev.hpCurrent;
      let newSuccesses = prev.deathSaves?.successes ?? 0;
      let newFailures = prev.deathSaves?.failures ?? 0;
      let newStabilized = prev.deathSaves?.stabilized ?? false;

      if (newTemp > 0) {
        if (amount <= newTemp) {
          newTemp -= amount;
          amount = 0;
        } else {
          amount -= newTemp;
          newTemp = 0;
        }
      }

      if (amount > 0) {
        if (newHp > 0) {
          newHp = Math.max(0, newHp - amount);
          if (newHp === 0) {
            newSuccesses = 0;
            newFailures = 0;
            newStabilized = false;
          }
        } else {
          newFailures = Math.min(3, newFailures + 1);
        }
      }

      return {
        ...prev,
        hpCurrent: newHp,
        tempHp: newTemp,
        deathSaves: {
          successes: newSuccesses,
          failures: newFailures,
          stabilized: newStabilized,
        },
      };
    });
  };

  const heal = (amount: number) => {
    setLocalData((prev) => {
      const newHp = Math.min(hpMax, prev.hpCurrent + amount);
      const newDeathSaves =
        newHp > 0
          ? { successes: 0, failures: 0, stabilized: false }
          : (prev.deathSaves ?? { successes: 0, failures: 0, stabilized: false });

      return {
        ...prev,
        hpCurrent: newHp,
        deathSaves: newDeathSaves,
      };
    });
  };

  const setTempHp = (amount: number) => {
    setLocalData((prev) => ({ ...prev, tempHp: Math.max(0, amount) }));
  };

  const setDeathSaveSuccesses = (val: number) => {
    setLocalData((prev) => ({
      ...prev,
      deathSaves: {
        successes: Math.min(3, Math.max(0, val)),
        failures: prev.deathSaves?.failures ?? 0,
        stabilized: val === 3 ? true : (prev.deathSaves?.stabilized ?? false),
      },
    }));
  };

  const setDeathSaveFailures = (val: number) => {
    setLocalData((prev) => ({
      ...prev,
      deathSaves: {
        successes: prev.deathSaves?.successes ?? 0,
        failures: Math.min(3, Math.max(0, val)),
        stabilized: prev.deathSaves?.stabilized ?? false,
      },
    }));
  };

  const setStabilized = (stabilized: boolean) => {
    setLocalData((prev) => ({
      ...prev,
      deathSaves: {
        successes: stabilized ? 3 : (prev.deathSaves?.successes ?? 0),
        failures: stabilized ? 0 : (prev.deathSaves?.failures ?? 0),
        stabilized,
      },
    }));
  };

  const spendHitDie = (die: string, count: number = 1) => {
    const pools = parseHitDice(hitDiceStr);
    const pool = pools.find((p) => p.die === die);
    if (!pool) return;

    setLocalData((prev) => {
      const spent = prev.spentHitDice[die] ?? 0;
      const amountToSpend = Math.min(count, pool.remaining - spent);
      if (amountToSpend <= 0) return prev;
      return {
        ...prev,
        spentHitDice: {
          ...prev.spentHitDice,
          [die]: spent + amountToSpend,
        },
      };
    });
  };

  const regainHitDie = (die: string, count: number = 1) => {
    const pools = parseHitDice(hitDiceStr);
    const pool = pools.find((p) => p.die === die);
    if (!pool) return;

    setLocalData((prev) => {
      const spent = prev.spentHitDice[die] ?? 0;
      const maxRegain = spent - (pool.remaining - pool.total);
      const amountToRegain = Math.min(count, maxRegain);
      if (amountToRegain <= 0) return prev;
      return {
        ...prev,
        spentHitDice: {
          ...prev.spentHitDice,
          [die]: spent - amountToRegain,
        },
      };
    });
  };

  const shortRest = (healAmount: number = 0) => {
    setLocalData((prev) => ({
      ...prev,
      hpCurrent: Math.min(hpMax, prev.hpCurrent + healAmount),
    }));
  };

  const longRest = () => {
    const pools = parseHitDice(hitDiceStr);
    const newSpent: Record<string, number> = {};
    pools.forEach((pool) => {
      newSpent[pool.die] = pool.remaining - pool.total;
    });

    setLocalData((_prev) => {
      return {
        hpCurrent: hpMax,
        tempHp: 0,
        spentHitDice: newSpent,
        deathSaves: { successes: 0, failures: 0, stabilized: false },
      };
    });
  };

  const reset = () => {
    setLocalData({
      hpCurrent: hpCurrentInit,
      tempHp: tempHpInit,
      spentHitDice: {},
      deathSaves: deathSavesInit,
    });
    syncedStorage.removeItem(storageKey);
  };

  return {
    hpCurrent: localData.hpCurrent,
    tempHp: localData.tempHp,
    spentHitDice: localData.spentHitDice,
    deathSaves: localData.deathSaves ?? deathSavesInit,
    damage,
    heal,
    setTempHp,
    setDeathSaveSuccesses,
    setDeathSaveFailures,
    setStabilized,
    spendHitDie,
    regainHitDie,
    shortRest,
    longRest,
    reset,
  };
}

export function useLocalSpellSlots(
  memberId: number,
  initialSpellSlots: SpellSlotLevel[],
  initialPactSlots: SpellSlotLevel[],
) {
  const storageKey = `party-stats:slots:${memberId}`;
  const [localData, setLocalData] = useState<LocalSlotsData>(() => {
    try {
      const stored = syncedStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.spellSlotsUsed && parsed.pactSlotsUsed) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load spell slots from localStorage:", e);
    }
    return { spellSlotsUsed: {}, pactSlotsUsed: {} };
  });

  useEffect(() => {
    try {
      syncedStorage.setItem(storageKey, JSON.stringify(localData));
    } catch (e) {
      console.warn("Failed to save spell slots to localStorage:", e);
    }
  }, [localData, storageKey]);

  const toggleSlot = (level: number, index: number, isPact: boolean) => {
    setLocalData((prev) => {
      const usedMap = { ...(isPact ? prev.pactSlotsUsed : prev.spellSlotsUsed) };
      const maxSlots =
        (isPact ? initialPactSlots : initialSpellSlots).find((s) => s.level === level)?.max ?? 0;
      const currentUsedOnServer =
        (isPact ? initialPactSlots : initialSpellSlots).find((s) => s.level === level)?.used ?? 0;

      const prevUsed = usedMap[level] ?? currentUsedOnServer;
      const available = maxSlots - prevUsed;
      let newUsed = prevUsed;
      if (index < available) {
        newUsed = Math.min(maxSlots, prevUsed + 1);
      } else {
        newUsed = Math.max(0, prevUsed - 1);
      }

      return {
        ...prev,
        [isPact ? "pactSlotsUsed" : "spellSlotsUsed"]: {
          ...usedMap,
          [level]: newUsed,
        },
      };
    });
  };

  const restSlots = (isLongRest: boolean) => {
    setLocalData((prev) => {
      const newSpellSlots = { ...prev.spellSlotsUsed };
      const newPactSlots = { ...prev.pactSlotsUsed };

      if (isLongRest) {
        initialSpellSlots.forEach((s) => {
          newSpellSlots[s.level] = 0;
        });
        initialPactSlots.forEach((s) => {
          newPactSlots[s.level] = 0;
        });
      } else {
        initialPactSlots.forEach((s) => {
          newPactSlots[s.level] = 0;
        });
      }

      return {
        spellSlotsUsed: newSpellSlots,
        pactSlotsUsed: newPactSlots,
      };
    });
  };

  const reset = () => {
    setLocalData({ spellSlotsUsed: {}, pactSlotsUsed: {} });
    syncedStorage.removeItem(storageKey);
  };

  const getEffectiveSlots = (slots: SpellSlotLevel[], isPact: boolean) => {
    return slots.map((s) => {
      const localUsed = (isPact ? localData.pactSlotsUsed : localData.spellSlotsUsed)[s.level];
      return {
        level: s.level,
        max: s.max,
        used: localUsed !== undefined ? localUsed : s.used,
      };
    });
  };

  const changeSlotUsed = (level: number, delta: number, isPact: boolean) => {
    setLocalData((prev) => {
      const usedMap = { ...(isPact ? prev.pactSlotsUsed : prev.spellSlotsUsed) };
      const currentUsedOnServer =
        (isPact ? initialPactSlots : initialSpellSlots).find((s) => s.level === level)?.used ?? 0;
      const prevUsed = usedMap[level] !== undefined ? usedMap[level] : currentUsedOnServer;
      const newUsed = Math.max(0, prevUsed + delta);
      return {
        ...prev,
        [isPact ? "pactSlotsUsed" : "spellSlotsUsed"]: {
          ...usedMap,
          [level]: newUsed,
        },
      };
    });
  };

  return {
    spellSlots: getEffectiveSlots(initialSpellSlots, false),
    pactSlots: getEffectiveSlots(initialPactSlots, true),
    toggleSlot,
    restSlots,
    reset,
    changeSlotUsed,
  };
}

export function useLocalResourcesState(memberId: number, initialActions: ActionInfo[]) {
  const storageKey = `party-stats:resources:${memberId}`;
  const [localData, setLocalData] = useState<LocalResourcesData>(() => {
    try {
      const stored = syncedStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.spent) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load class resources from localStorage:", e);
    }
    return { spent: {} };
  });

  useEffect(() => {
    try {
      syncedStorage.setItem(storageKey, JSON.stringify(localData));
    } catch (e) {
      console.warn("Failed to save class resources to localStorage:", e);
    }
  }, [localData, storageKey]);

  const useResource = (name: string, max: number) => {
    setLocalData((prev) => {
      const currentSpent = prev.spent[name] ?? 0;
      if (currentSpent >= max) return prev;
      return {
        spent: {
          ...prev.spent,
          [name]: currentSpent + 1,
        },
      };
    });
  };

  const useResourceAmount = (name: string, amount: number, max: number) => {
    setLocalData((prev) => {
      const currentSpent = prev.spent[name] ?? 0;
      if (currentSpent >= max) return prev;
      return {
        spent: {
          ...prev.spent,
          [name]: Math.min(max, currentSpent + amount),
        },
      };
    });
  };

  const regainResource = (name: string) => {
    setLocalData((prev) => {
      const currentSpent = prev.spent[name] ?? 0;
      if (currentSpent <= 0) return prev;
      return {
        spent: {
          ...prev.spent,
          [name]: currentSpent - 1,
        },
      };
    });
  };

  const toggleResourceBubble = (name: string, index: number, max: number) => {
    setLocalData((prev) => {
      const currentSpent = prev.spent[name] ?? 0;
      const remaining = max - currentSpent;
      let newSpent = currentSpent;
      if (index < remaining) {
        newSpent = Math.min(max, currentSpent + 1);
      } else {
        newSpent = Math.max(0, currentSpent - 1);
      }
      return {
        spent: {
          ...prev.spent,
          [name]: newSpent,
        },
      };
    });
  };

  const restResources = (isLongRest: boolean) => {
    setLocalData((prev) => {
      const nextSpent = { ...prev.spent };
      initialActions.forEach((a) => {
        const u = a.uses;
        if (!u) return;
        const resetType = u.reset ? u.reset.toLowerCase() : "";
        const isShortRestResource =
          resetType.includes("short") || resetType === "rest" || resetType.includes("combat");
        const shouldReset = isLongRest || isShortRestResource;
        if (shouldReset) {
          nextSpent[a.name] = 0;
        }
      });

      // Reset spell uses
      Object.keys(nextSpent).forEach((key) => {
        if (key.startsWith("spell-uses:")) {
          const parts = key.split(":");
          const resetType = parts[2] ? parts[2].toLowerCase() : "long rest";
          const isShortRestResource =
            resetType.includes("short") || resetType === "rest";
          const shouldReset = isLongRest || isShortRestResource;
          if (shouldReset) {
            nextSpent[key] = 0;
          }
        }
      });

      return { spent: nextSpent };
    });
  };

  const reset = () => {
    setLocalData({ spent: {} });
    syncedStorage.removeItem(storageKey);
  };

  const getEffectiveResource = (a: ActionInfo) => {
    const spent = localData.spent[a.name] ?? 0;
    const current = Math.max(0, (a.uses?.max ?? 0) - spent);
    return {
      ...a,
      uses: a.uses
        ? {
            ...a.uses,
            current,
            spent,
          }
        : undefined,
    };
  };

  return {
    spent: localData.spent,
    useResource,
    useResourceAmount,
    regainResource,
    toggleResourceBubble,
    restResources,
    reset,
    getEffectiveResource,
  };
}

export function useLocalInventoryState(memberId: number, initialItems: any[]) {
  const storageKey = `party-stats:item-overrides:${memberId}`;
  const customItemsKey = `party-stats:custom-items:${memberId}`;

  const [overrides, setOverrides] = useState<
    Record<string, { equipped?: boolean; attuned?: boolean }>
  >(() => {
    try {
      const saved = syncedStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [customItems, setCustomItems] = useState<any[]>(() => {
    try {
      const saved = syncedStorage.getItem(customItemsKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleItemEquipped = (itemName: string) => {
    const isCustom = customItems.some((i) => i.name === itemName);
    if (isCustom) {
      setCustomItems((prev) => {
        const next = prev.map((item) => {
          if (item.name !== itemName) return item;
          return { ...item, equipped: !item.equipped };
        });

        const targetItem = next.find((i) => i.name === itemName);
        if (targetItem?.equipped) {
          const isShield = (i: any) =>
            i.armorTypeId === 4 || i.definition?.armorTypeId === 4 || i.isShield;
          const isBodyArmor = (i: any) =>
            (i.type?.toLowerCase().includes("armor") ||
              i.type === "Armor" ||
              i.definition?.filterType === "Armor" ||
              i.filterType === "Armor") &&
            (i.armorTypeId ?? 0) <= 3 &&
            !isShield(i);

          const checkShield = isShield(targetItem);
          const checkArmor = isBodyArmor(targetItem);

          if (checkShield || checkArmor) {
            const finalNext = next.map((other) => {
              if (other.name === itemName) return other;
              const isOtherConflicting = checkShield ? isShield(other) : isBodyArmor(other);
              if (isOtherConflicting) {
                return { ...other, equipped: false };
              }
              return other;
            });

            setOverrides((prevOver) => {
              const nextOver = { ...prevOver };
              initialItems.forEach((other) => {
                const isOtherConflicting = checkShield ? isShield(other) : isBodyArmor(other);
                if (isOtherConflicting) {
                  const otherOver = prevOver[other.name] ?? {};
                  const otherEquipped =
                    otherOver.equipped !== undefined ? otherOver.equipped : other.equipped;
                  if (otherEquipped) {
                    nextOver[other.name] = {
                      ...otherOver,
                      equipped: false,
                    };
                  }
                }
              });
              try {
                syncedStorage.setItem(storageKey, JSON.stringify(nextOver));
              } catch {}
              return nextOver;
            });

            try {
              syncedStorage.setItem(customItemsKey, JSON.stringify(finalNext));
            } catch {}
            return finalNext;
          }
        }

        try {
          syncedStorage.setItem(customItemsKey, JSON.stringify(next));
        } catch {}
        return next;
      });
      return;
    }

    setOverrides((prev) => {
      const current = prev[itemName] ?? {};
      const initialItem = initialItems.find((i) => i.name === itemName);
      const defaultEquipped = initialItem ? initialItem.equipped : false;
      const currentEquipped = current.equipped !== undefined ? current.equipped : defaultEquipped;
      const nextEquipped = !currentEquipped;

      const next = {
        ...prev,
        [itemName]: {
          ...current,
          equipped: nextEquipped,
        },
      };

      if (nextEquipped) {
        const isShield = (i: any) =>
          i.armorTypeId === 4 || i.definition?.armorTypeId === 4 || i.isShield;
        const isBodyArmor = (i: any) =>
          (i.type?.toLowerCase().includes("armor") ||
            i.type === "Armor" ||
            i.definition?.filterType === "Armor" ||
            i.filterType === "Armor") &&
          (i.armorTypeId ?? 0) <= 3 &&
          !isShield(i);

        const targetItem = initialItem;
        if (targetItem) {
          const checkShield = isShield(targetItem);
          const checkArmor = isBodyArmor(targetItem);

          if (checkShield || checkArmor) {
            initialItems.forEach((other) => {
              if (other.name === itemName) return;
              const isOtherConflicting = checkShield ? isShield(other) : isBodyArmor(other);
              if (isOtherConflicting) {
                const otherOver = prev[other.name] ?? {};
                const otherEquipped =
                  otherOver.equipped !== undefined ? otherOver.equipped : other.equipped;
                if (otherEquipped) {
                  next[other.name] = {
                    ...otherOver,
                    equipped: false,
                  };
                }
              }
            });

            setCustomItems((prevCustom) => {
              const nextCustom = prevCustom.map((other) => {
                const isOtherConflicting = checkShield ? isShield(other) : isBodyArmor(other);
                if (isOtherConflicting) {
                  return { ...other, equipped: false };
                }
                return other;
              });
              try {
                syncedStorage.setItem(customItemsKey, JSON.stringify(nextCustom));
              } catch {}
              return nextCustom;
            });
          }
        }
      }

      try {
        syncedStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleItemAttuned = (itemName: string) => {
    const isCustom = customItems.some((i) => i.name === itemName);
    if (isCustom) {
      setCustomItems((prev) => {
        const next = prev.map((item) => {
          if (item.name !== itemName) return item;
          return { ...item, attuned: !item.attuned };
        });
        try {
          syncedStorage.setItem(customItemsKey, JSON.stringify(next));
        } catch {}
        return next;
      });
      return;
    }

    setOverrides((prev) => {
      const current = prev[itemName] ?? {};
      const initialItem = initialItems.find((i) => i.name === itemName);
      const defaultAttuned = initialItem ? initialItem.attuned : false;
      const currentAttuned = current.attuned !== undefined ? current.attuned : defaultAttuned;
      const next = {
        ...prev,
        [itemName]: {
          ...current,
          attuned: !currentAttuned,
        },
      };
      try {
        syncedStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const setAllOverrides = (newOverrides: any) => {
    setOverrides(newOverrides);
  };

  const addCustomItem = (newItem: any) => {
    setCustomItems((prev) => {
      const next = [...prev, newItem];
      try {
        syncedStorage.setItem(customItemsKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const deleteCustomItem = (itemName: string) => {
    setCustomItems((prev) => {
      const next = prev.filter((item) => item.name !== itemName);
      try {
        syncedStorage.setItem(customItemsKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const mappedInitial = initialItems.map((item) => {
    const over = overrides[item.name];
    return {
      ...item,
      equipped: over?.equipped !== undefined ? over.equipped : item.equipped,
      attuned: over?.attuned !== undefined ? over.attuned : item.attuned,
    };
  });

  const items = [...mappedInitial, ...customItems];

  return [
    items,
    toggleItemEquipped,
    toggleItemAttuned,
    setAllOverrides,
    addCustomItem,
    deleteCustomItem,
    setCustomItems,
  ] as const;
}

export function useLocalArmorModel(memberId: number, initialArmorModel: string | null) {
  const storageKey = `party-stats:armor-model:${memberId}`;
  const [armorModel, setArmorModel] = useState<string | null>(() => {
    try {
      const stored = syncedStorage.getItem(storageKey);
      if (stored !== null) {
        return stored === "null" ? null : stored;
      }
    } catch (e) {
      console.warn("Failed to load armor model from localStorage:", e);
    }
    return initialArmorModel;
  });

  const updateArmorModel = (model: string | null) => {
    setArmorModel(model);
    try {
      if (model === null) {
        syncedStorage.setItem(storageKey, "null");
      } else {
        syncedStorage.setItem(storageKey, model);
      }
    } catch (e) {
      console.warn("Failed to save armor model to localStorage:", e);
    }
  };

  return [armorModel, updateArmorModel] as const;
}

export function useLocalActiveInfusions(memberId: number, initialActiveInfusions: string[]) {
  const storageKey = `party-stats:active-infusions:${memberId}`;
  const [activeInfusions, setActiveInfusions] = useState<string[]>(() => {
    try {
      const saved = syncedStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : initialActiveInfusions;
    } catch (e) {
      console.warn("Failed to load active infusions from localStorage:", e);
      return initialActiveInfusions;
    }
  });

  const toggleInfusion = (name: string) => {
    setActiveInfusions((prev) => {
      const next = prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name];
      try {
        syncedStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to save active infusions to localStorage:", e);
      }
      return next;
    });
  };

  return [activeInfusions, toggleInfusion, setActiveInfusions] as const;
}

export function useLocalTotemAspects(
  memberId: number,
  initialAspects: Array<{ name: string; description: string }>,
) {
  const storageKey = `party-stats:totem-aspects:${memberId}`;
  const [aspects, setAspects] = useState<Array<{ name: string; description: string }>>(() => {
    try {
      const stored = syncedStorage.getItem(storageKey);
      if (stored !== null) {
        return stored === "null" ? [] : JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load totem aspects from localStorage:", e);
    }
    return initialAspects;
  });

  const updateAspects = (nextAspects: Array<{ name: string; description: string }>) => {
    setAspects(nextAspects);
    try {
      syncedStorage.setItem(storageKey, JSON.stringify(nextAspects));
    } catch (e) {
      console.warn("Failed to save totem aspects to localStorage:", e);
    }
  };

  return [aspects, updateAspects] as const;
}
