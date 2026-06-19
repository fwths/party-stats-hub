import React from "react";
import { Settings } from "lucide-react";

interface NotionConfigFormProps {
  notionToken: string;
  setNotionToken: (val: string) => void;
  notionParentId: string;
  setNotionParentId: (val: string) => void;
  notionParentType: "database" | "page" | "workspace";
  setNotionParentType: (val: "database" | "page" | "workspace") => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function NotionConfigForm({
  notionToken,
  setNotionToken,
  notionParentId,
  setNotionParentId,
  notionParentType,
  setNotionParentType,
  onSubmit,
  onCancel,
}: NotionConfigFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-4 rounded-lg bg-secondary/15 border border-border/30 p-4 space-y-3 animate-fade-in select-text"
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1">
        <Settings size={12} />
        Notion Configuration
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
            Integration Token (API Key)
          </label>
          <input
            type="password"
            value={notionToken}
            onChange={(e) => setNotionToken(e.target.value)}
            placeholder="secret_..."
            required
            className="w-full rounded bg-secondary/35 border border-border/40 px-2 py-1.5 text-xs text-foreground placeholder-muted-foreground/35 focus:outline-none focus:border-gold/50"
          />
        </div>

        {notionParentType !== "workspace" && (
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
              Parent ID (Database/Page ID)
            </label>
            <input
              type="text"
              value={notionParentId}
              onChange={(e) => setNotionParentId(e.target.value)}
              placeholder="32-character ID"
              required
              className="w-full rounded bg-secondary/35 border border-border/40 px-2 py-1.5 text-xs text-foreground placeholder-muted-foreground/35 focus:outline-none focus:border-gold/50"
            />
          </div>
        )}

        <div>
          <span className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
            Parent Type
          </span>
          <div className="flex rounded border border-border/40 overflow-hidden text-[10px]">
            {(["database", "page", "workspace"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setNotionParentType(type)}
                className={`flex-1 px-2 py-1 capitalize transition-colors duration-150 cursor-pointer ${
                  notionParentType === type
                    ? "bg-gold/15 text-gold font-bold"
                    : "bg-secondary/25 text-muted-foreground hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded bg-secondary/25 border border-border/40 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded bg-gold/15 hover:bg-gold/25 border border-gold/40 py-1 text-[10px] font-bold text-gold cursor-pointer"
          >
            Save Config
          </button>
        </div>
      </div>
    </form>
  );
}
