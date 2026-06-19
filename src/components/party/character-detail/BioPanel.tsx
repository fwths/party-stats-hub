import { User } from "lucide-react";
import { PartyMember } from "@/lib/dndbeyond.functions";
import { Panel } from "../CharacterDetailView";

export function BioPanel({ member }: { member: PartyMember }) {
  const chars = member.characteristics;
  const hasPhysicalDetails =
    chars?.gender ||
    chars?.age ||
    chars?.height ||
    chars?.weight ||
    chars?.eyes ||
    chars?.skin ||
    chars?.hair;

  const physicalDetails = [
    { label: "Gender", value: chars?.gender },
    { label: "Age", value: chars?.age },
    { label: "Height", value: chars?.height },
    { label: "Weight", value: chars?.weight },
    { label: "Eyes", value: chars?.eyes },
    { label: "Skin", value: chars?.skin },
    { label: "Hair", value: chars?.hair },
  ].filter((d) => d.value);

  const hasContent =
    hasPhysicalDetails ||
    chars?.appearance ||
    chars?.backstory ||
    chars?.personalityTraits ||
    chars?.ideals ||
    chars?.bonds ||
    chars?.flaws ||
    chars?.organizations ||
    chars?.allies ||
    chars?.enemies ||
    chars?.otherNotes;

  if (!hasContent) {
    return (
      <Panel>
        <p className="py-8 text-center text-sm text-muted-foreground">No biography traits found.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Biography & Backstory" icon={User}>
      <div className="flex flex-col gap-4 text-xs">
        {/* Physical Details Grid */}
        {hasPhysicalDetails && (
          <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
            <h4 className="mb-2.5 font-bold uppercase tracking-wider text-accent select-none">
              Physical Characteristics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {physicalDetails.map((detail) => (
                <div
                  key={detail.label}
                  className="rounded-md border border-border/30 bg-secondary/25 p-2 text-center"
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                    {detail.label}
                  </div>
                  <div
                    className="mt-0.5 text-xs font-semibold text-foreground truncate"
                    title={detail.value}
                  >
                    {detail.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Appearance Description */}
        {chars?.appearance && (
          <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
            <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
              Appearance Details
            </h4>
            <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
              {chars.appearance}
            </p>
          </div>
        )}

        {/* Backstory */}
        {chars?.backstory && (
          <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
            <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
              Backstory
            </h4>
            <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
              {chars.backstory}
            </p>
          </div>
        )}

        {/* Personality, Ideals, Bonds, Flaws */}
        <div className="grid gap-3 md:grid-cols-2">
          {chars?.personalityTraits && (
            <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
              <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                Personality Traits
              </h4>
              <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                {chars.personalityTraits}
              </p>
            </div>
          )}
          {chars?.ideals && (
            <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
              <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                Ideals
              </h4>
              <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                {chars.ideals}
              </p>
            </div>
          )}
          {chars?.bonds && (
            <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
              <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                Bonds
              </h4>
              <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                {chars.bonds}
              </p>
            </div>
          )}
          {chars?.flaws && (
            <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
              <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                Flaws
              </h4>
              <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                {chars.flaws}
              </p>
            </div>
          )}
        </div>

        {/* Allies, Enemies, Organizations, Other Notes */}
        <div className="grid gap-3 md:grid-cols-2">
          {chars?.organizations && (
            <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
              <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                Organizations
              </h4>
              <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                {chars.organizations}
              </p>
            </div>
          )}
          {chars?.allies && (
            <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
              <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                Allies
              </h4>
              <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                {chars.allies}
              </p>
            </div>
          )}
          {chars?.enemies && (
            <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
              <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                Enemies
              </h4>
              <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                {chars.enemies}
              </p>
            </div>
          )}
          {chars?.otherNotes && (
            <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
              <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                Other Notes
              </h4>
              <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                {chars.otherNotes}
              </p>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
