import { RuleChoiceGroup } from "../../lib/rules/choices";
import { ChoiceGroupPicker, SpellChoiceList } from "./WizardSteps";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export function RuleChoiceGroupPicker({
  groups,
  globalOptions,
  selected,
  onChange,
  spells = [],
}: {
  groups: RuleChoiceGroup[];
  globalOptions: { skills: string[]; tools: string[]; languages: string[] };
  selected: Record<string, string[]>;
  onChange: (groupId: string, choices: string[]) => void;
  spells?: any[];
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const currentSelected = selected[group.id] || [];

        if (group.optionType === "spell") {
          let filteredSpells = spells;
          const prerequisites = group.prerequisites;
          if (prerequisites && prerequisites.length > 0) {
            filteredSpells = spells.filter((spell) => {
              for (const req of prerequisites) {
                if (req.type === "level") {
                  if (Number(spell.level || 0) !== Number(req.value)) return false;
                }
                if (req.type === "maxLevel") {
                  if (Number(spell.level || 0) > Number(req.value)) return false;
                  if (Number(spell.level || 0) === 0) return false; // Usually maxLevel means non-cantrip prepared spells
                }
                if (req.type === "class") {
                  if (
                    !spell.classes?.fromClassList?.some(
                      (c: any) => c.name.toLowerCase() === req.value.toLowerCase(),
                    )
                  ) {
                    return false;
                  }
                }
              }
              return true;
            });
          }

          return (
            <SpellChoiceList
              key={group.id}
              title={group.label}
              spells={filteredSpells}
              selected={currentSelected}
              limit={group.max}
              exact={group.exact}
              onChange={(choices) => onChange(group.id, choices)}
            />
          );
        }

        if (group.optionType === "item") {
          return (
            <div
              key={group.id}
              className="space-y-3 rounded-xl border border-border/30 bg-secondary/20 p-4"
            >
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </div>
              <Select
                value={currentSelected[0] || ""}
                onValueChange={(value) => onChange(group.id, [value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Choose ${group.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(group.options) &&
                    group.options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                        {option.description ? `: ${option.description}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        if (group.optionType === "ability") {
          const options = Array.isArray(group.options) ? group.options : [];
          const max = group.max || 1;

          const handleAbilityClick = (abilityId: string) => {
            const count = currentSelected.filter((id) => id === abilityId).length;
            if (group.repeatable) {
              if (currentSelected.length < max) {
                onChange(group.id, [...currentSelected, abilityId]);
              } else if (count > 0) {
                // If max reached and we click one we already have, remove one instance of it
                const index = currentSelected.indexOf(abilityId);
                const newChoices = [...currentSelected];
                newChoices.splice(index, 1);
                onChange(group.id, newChoices);
              }
            } else {
              if (currentSelected.includes(abilityId)) {
                onChange(
                  group.id,
                  currentSelected.filter((id) => id !== abilityId),
                );
              } else if (currentSelected.length < max) {
                onChange(group.id, [...currentSelected, abilityId]);
              }
            }
          };

          return (
            <div
              key={group.id}
              className="space-y-3 rounded-xl border border-border/30 bg-secondary/20 p-4"
            >
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                  const count = currentSelected.filter((id) => id === option.id).length;
                  const isActive = count > 0;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleAbilityClick(option.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        isActive
                          ? "bg-primary/20 text-primary border-primary/40"
                          : "bg-background/50 text-muted-foreground border-border/40 hover:text-foreground"
                      }`}
                    >
                      {option.label}
                      {count > 0 && group.repeatable && (
                        <span className="bg-primary text-primary-foreground text-[10px] w-4 h-4 flex items-center justify-center rounded-full leading-none">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                Selected {currentSelected.length} / {max}
              </div>
            </div>
          );
        }

        // For skills, tools, languages, we map "all" to the global options
        let options: string[] = [];
        if (group.options === "all") {
          if (group.optionType === "skill") options = globalOptions.skills;
          else if (group.optionType === "tool") options = globalOptions.tools;
          else if (group.optionType === "language") options = globalOptions.languages;
        } else {
          options = (group.options as any[]).map((o) => o.id);
        }

        // Translate RuleChoiceGroup to ChoiceGroup format expected by ChoiceGroupPicker
        const choiceGroup = {
          id: group.id,
          label: group.label,
          count: group.max,
          options: options,
        };

        return (
          <ChoiceGroupPicker
            key={group.id}
            groups={[choiceGroup]}
            selected={currentSelected}
            onChange={(choices) => onChange(group.id, choices)}
          />
        );
      })}
    </div>
  );
}
