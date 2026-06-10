import { useSuspenseQuery } from "@tanstack/react-query";
import { partyQueryOptions } from "@/lib/party";
import { Skeleton } from "@/components/ui/skeleton";
import { PartyMember } from "@/lib/dndbeyond.functions";
import { SKILL_ABILITY } from "@/lib/constants";

export function PartyHighlights({ ids }: { ids: number[] }) {
  const { data } = useSuspenseQuery(partyQueryOptions(ids));
  const members = data.members.filter((m) => !m.error);
  if (members.length === 0) return null;

  const skillNames = Object.keys(SKILL_ABILITY);
  const bestBySkill = skillNames
    .map((name) => {
      let best: { member: PartyMember; mod: number } | null = null;
      for (const m of members) {
        const s = m.skills.find((k) => k.name === name);
        if (!s) continue;
        if (!best || s.modifier > best.mod) best = { member: m, mod: s.modifier };
      }
      return best ? { name, member: best.member, mod: best.mod } : null;
    })
    .filter((x): x is { name: string; member: PartyMember; mod: number } => !!x);

  return (
    <details className="group card-arcane mb-4 rounded-lg border border-border p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-accent">
        <span>Best at Each Skill</span>
        <span className="ml-2 transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
        {bestBySkill.map(({ name, member, mod }) => (
          <div key={name} className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-foreground">{name}</div>
              <div className="truncate text-[10px] text-muted-foreground">{member.name}</div>
            </div>
            <span className="font-mono text-accent">{mod >= 0 ? `+${mod}` : mod}</span>
          </div>
        ))}
      </div>
    </details>
  );
}