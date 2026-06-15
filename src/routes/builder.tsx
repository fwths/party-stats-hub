import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Swords, Dices, Save, ChevronRight, ChevronLeft } from "lucide-react";
import { getAllRaces, getAllClasses, SRDRace, SRDClass } from "@/lib/srd-engine";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/builder")({
  component: BuilderWizard,
});

type BuilderState = {
  name: string;
  raceId: string | null;
  subraceId: string | null;
  classId: string | null;
  subclassId: string | null;
  level: number;
  abilities: Record<string, number>;
};

function BuilderWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [character, setCharacter] = useState<BuilderState>({
    name: "Unnamed Hero",
    raceId: null,
    subraceId: null,
    classId: null,
    subclassId: null,
    level: 1,
    abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
  });

  const updateCharacter = (updates: Partial<BuilderState>) => {
    setCharacter((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => setStep((s) => Math.min(4, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const saveCharacter = async () => {
    try {
      const { createNativePartyMember, saveNativeCharacter } = await import("@/lib/native-engine");
      const { STORAGE_KEY, COOKIE_KEY } = await import("@/lib/party");

      const newMember = createNativePartyMember(character);
      const newId = await saveNativeCharacter({ data: newMember });

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
    if (step === 1) return character.name.trim() !== "" && character.raceId !== null;
    if (step === 2) return character.classId !== null;
    if (step === 3) return Object.values(character.abilities).every((val: number) => val > 0);
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
          { id: 2, label: "Path", icon: Swords },
          { id: 3, label: "Attributes", icon: Dices },
          { id: 4, label: "Review", icon: Save },
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
        {step === 2 && <StepClass character={character} updateCharacter={updateCharacter} />}
        {step === 3 && <StepAbilities character={character} updateCharacter={updateCharacter} />}
        {step === 4 && <StepReview character={character} saveCharacter={saveCharacter} />}
      </div>

      <div className="flex justify-between mt-8 max-w-3xl mx-auto">
        <Button variant="outline" onClick={prevStep} disabled={step === 1}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        {step < 4 ? (
          <Button onClick={nextStep} disabled={!isStepValid()}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={saveCharacter}>
            Save Character <Save className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Subcomponents for steps

function StepRace({ character, updateCharacter }: any) {
  const races = getAllRaces();
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-4xl mx-auto">
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

      <div>
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <User className="text-primary h-6 w-6" />
          Choose your Heritage
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {races.map((race) => (
            <Card
              key={race.id}
              className={`cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                character.raceId === race.id
                  ? "border-primary shadow-[0_0_30px_rgba(var(--primary),0.15)] bg-primary/5 scale-[1.02] ring-1 ring-primary/30"
                  : "hover:border-primary/40 hover:bg-secondary/20 hover:-translate-y-1 bg-card/40 border-border/40"
              }`}
              onClick={() => updateCharacter({ raceId: race.id, subraceId: null })}
            >
              {character.raceId === race.id && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-2xl font-heading group-hover:text-primary transition-colors">
                  {race.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-sm text-muted-foreground leading-relaxed min-h-[60px]">
                  {race.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-border/30">
                  {race.abilityBonuses.map((b: any) => (
                    <span
                      key={b.ability}
                      className="text-xs font-bold bg-accent/10 border border-accent/20 text-accent px-2.5 py-1 rounded-md shadow-sm"
                    >
                      +{b.bonus} {b.ability}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {character.raceId && races.find((r) => r.id === character.raceId)?.subraces && (
        <div className="mt-8 bg-secondary/20 p-6 rounded-xl border border-border/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Choose Subrace / Lineage
          </label>
          <div className="max-w-md">
            <Select
              value={character.subraceId || ""}
              onValueChange={(val) => updateCharacter({ subraceId: val })}
            >
              <SelectTrigger className="w-full bg-background/50 border-border/50 focus:ring-primary shadow-sm h-12">
                <SelectValue placeholder="Select a subrace...">
                  {character.subraceId
                    ? races
                        .find((r) => r.id === character.raceId)
                        ?.subraces?.find((s) => s.id === character.subraceId)?.name
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {races
                  .find((r) => r.id === character.raceId)
                  ?.subraces?.map((sub) => (
                    <SelectItem
                      key={sub.id}
                      value={sub.id}
                      className="py-3 focus:bg-primary/10 cursor-pointer"
                    >
                      <div className="font-bold text-primary">{sub.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 max-w-xs whitespace-normal">
                        {sub.description}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

function StepClass({ character, updateCharacter }: any) {
  const classes = getAllClasses();
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-4xl mx-auto">
      <div>
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Swords className="text-primary h-6 w-6" />
          Choose your Path
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => (
            <Card
              key={cls.id}
              className={`cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                character.classId === cls.id
                  ? "border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.15)] bg-amber-500/5 scale-[1.02] ring-1 ring-amber-500/30"
                  : "hover:border-amber-500/40 hover:bg-secondary/20 hover:-translate-y-1 bg-card/40 border-border/40"
              }`}
              onClick={() => updateCharacter({ classId: cls.id, subclassId: null })}
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
                <p className="text-sm text-muted-foreground leading-relaxed min-h-[60px]">
                  {cls.description}
                </p>
                <div className="mt-5 flex gap-4 text-xs pt-4 border-t border-border/30">
                  <div className="bg-secondary/50 px-2.5 py-1.5 rounded-md">
                    <span className="font-bold text-foreground">Hit Dice:</span>{" "}
                    <span className="text-amber-500">d{cls.hitDice}</span>
                  </div>
                  <div className="bg-secondary/50 px-2.5 py-1.5 rounded-md">
                    <span className="font-bold text-foreground">Saves:</span>{" "}
                    <span className="text-amber-500">{(cls.saves ?? []).join(", ")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
              onChange={(e) => updateCharacter({ level: parseInt(e.target.value) || 1 })}
              className="flex-1 accent-amber-500 h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-3xl font-black text-amber-500 w-12 text-center bg-background border border-border rounded-lg py-1 shadow-inner">
              {character.level}
            </div>
          </div>

          {character.level >= 3 && classes.find((c) => c.id === character.classId)?.subclasses && (
            <div className="mt-8 pt-6 border-t border-border/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 text-amber-500">
                Choose Subclass / Path (Level 3+)
              </label>
              <div className="max-w-md">
                <Select
                  value={character.subclassId || ""}
                  onValueChange={(val) => updateCharacter({ subclassId: val })}
                >
                  <SelectTrigger className="w-full bg-background/50 border-amber-500/30 focus:ring-amber-500 shadow-sm h-12">
                    <SelectValue placeholder="Select a subclass...">
                      {character.subclassId
                        ? classes
                            .find((c) => c.id === character.classId)
                            ?.subclasses?.find((s) => s.id === character.subclassId)?.name
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {classes
                      .find((c) => c.id === character.classId)
                      ?.subclasses?.map((sub) => (
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
        </div>
      )}
    </div>
  );
}

function StepAbilities({ character, updateCharacter }: any) {
  const [method, setMethod] = useState<"standard" | "pointbuy" | "roll">("standard");
  const abilitiesList = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

  const updateStat = (ab: string, val: number) => {
    updateCharacter({ abilities: { ...character.abilities, [ab]: val } });
  };

  const getRacialBonus = (ab: string) => {
    if (!character.raceId) return 0;
    const race = getAllRaces().find((r) => r.id === character.raceId);
    if (!race) return 0;
    const bonus = race.abilityBonuses.find((b) => b.ability === ab);
    return bonus ? bonus.bonus : 0;
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
    for (const ab of abilitiesList) {
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
  const getAvailableArrayValues = (currentStatAb: string) => {
    const used = abilitiesList
      .filter((ab) => ab !== currentStatAb)
      .map((ab) => character.abilities[ab]);
    return standardArray.filter(
      (v) => !used.includes(v) || character.abilities[currentStatAb] === v,
    );
  };

  // Roll Logic
  const roll4d6DropLowest = () => {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1).sort(
      (a, b) => a - b,
    );
    return rolls[1] + rolls[2] + rolls[3];
  };

  const rollAll = () => {
    const newAbilities = { ...character.abilities };
    abilitiesList.forEach((ab) => {
      newAbilities[ab] = roll4d6DropLowest();
    });
    updateCharacter({ abilities: newAbilities });
  };

  const setStandardArrayDefaults = () => {
    // Just reset them all to 0 so user can pick
    const newAbilities: any = {};
    abilitiesList.forEach((ab) => (newAbilities[ab] = 0));
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
          Choose your generation method. Racial bonuses from your heritage are applied
          automatically.
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
            abilitiesList.forEach((ab) => (newAbilities[ab] = 8));
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
        {abilitiesList.map((ab) => {
          const base = character.abilities[ab];
          const racial = getRacialBonus(ab);
          const total = base + racial;
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
                          const usedElsewhere = abilitiesList.some(
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
                {racial > 0 && (
                  <div className="flex items-center justify-between text-xs animate-in fade-in zoom-in duration-500">
                    <span className="text-accent font-semibold uppercase tracking-wider">
                      Racial
                    </span>
                    <span className="bg-accent/20 text-accent px-2 py-0.5 rounded font-bold">
                      +{racial}
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

function StepReview({ character, saveCharacter }: any) {
  const race = getAllRaces().find((r) => r.id === character.raceId);
  const cls = getAllClasses().find((c) => c.id === character.classId);
  const subrace = race?.subraces?.find((s) => s.id === character.subraceId);
  const subclass = cls?.subclasses?.find((s) => s.id === character.subclassId);

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
          <span className="text-accent">{subrace ? subrace.name : race?.name}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
          <span className="text-amber-500">{subclass ? subclass.name : cls?.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 my-8">
        {Object.entries(character.abilities).map(([ab, base]: [string, any]) => {
          const racial = race?.abilityBonuses.find((b) => b.ability === ab)?.bonus || 0;
          const total = base + racial;
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
              <div
                className={`absolute bottom-0 left-0 w-full h-1 ${mod > 0 ? "bg-emerald-500/50" : mod < 0 ? "bg-destructive/50" : "bg-transparent"}`}
              />
            </div>
          );
        })}
      </div>

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
