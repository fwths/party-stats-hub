import { useState } from "react";
import { PARTY_CHARACTER_IDS } from "@/lib/party-config";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { partyQueryOptions } from "@/lib/party";
import { PartyMember } from "@/lib/dndbeyond.types";

function parseCharacterIdInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/(\d{4,})/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function ManagePartyDialog({
  ids,
  onChange,
  onClose,
}: {
  ids: number[];
  onChange: (ids: number[]) => void;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(partyQueryOptions(ids));
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const byId = new Map<number, PartyMember>(data.members.map((m: PartyMember) => [m.id, m]));

  const add = () => {
    const id = parseCharacterIdInput(input);
    if (!id) {
      setError("Paste a D&D Beyond character URL or ID.");
      return;
    }
    if (ids.includes(id)) {
      setError("Already in the party.");
      return;
    }
    if (ids.length >= 12) {
      setError("Maximum 12 characters.");
      return;
    }
    setError(null);
    setInput("");
    onChange([...ids, id]);
  };

  const remove = (id: number) => {
    onChange(ids.filter((x) => x !== id));
  };

  const reset = () => {
    onChange([...PARTY_CHARACTER_IDS]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={onClose}
    >
      <div
        className="card-arcane w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-accent">Manage Party</h2>
          <button
            onClick={onClose}
            className="rounded border border-border bg-secondary/60 px-2 py-0.5 text-sm hover:border-accent/60"
          >
            ✕
          </button>
        </div>

        <div className="mb-3 flex flex-col gap-1">
          {ids.map((id) => {
            const m = byId.get(id);
            return (
              <div
                key={id}
                className="flex items-center justify-between gap-2 rounded border border-border bg-secondary/40 px-2 py-1.5 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {m?.avatarUrl ? (
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="h-6 w-6 rounded border border-border object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded border border-border bg-muted" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-foreground">{m?.name ?? `Character ${id}`}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{id}</div>
                  </div>
                </div>
                <button
                  onClick={() => remove(id)}
                  className="rounded border border-destructive/60 bg-destructive/10 px-2 py-0.5 text-xs text-destructive hover:bg-destructive/20"
                >
                  Remove
                </button>
              </div>
            );
          })}
          {ids.length === 0 && <p className="text-xs text-muted-foreground">No characters yet.</p>}
        </div>

        <div className="mb-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Add character (URL or ID)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
              placeholder="https://www.dndbeyond.com/characters/12345678"
              className="flex-1 rounded border border-border bg-secondary/40 px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
            />
            <button
              onClick={add}
              className="rounded border border-accent/60 bg-accent/15 px-3 py-1 text-sm text-accent hover:bg-accent/25"
            >
              Add
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>

        <div className="mb-2 border-t border-border/50 pt-2 mt-3 pb-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Or build your own
          </label>
          <div className="mt-1">
            <button
              onClick={() => {
                window.location.href = "/builder";
              }}
              className="w-full rounded border border-accent/60 bg-accent/15 px-3 py-2 text-sm text-accent hover:bg-accent/25 transition-colors flex justify-center items-center gap-2 font-medium"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Create Character Natively
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
          <button onClick={reset} className="text-muted-foreground underline hover:text-accent">
            Reset to defaults
          </button>
          <button
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["party"] });
              onClose();
            }}
            className="rounded border border-border bg-secondary/60 px-3 py-1 hover:border-accent/60"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
