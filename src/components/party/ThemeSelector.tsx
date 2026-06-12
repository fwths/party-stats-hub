import { useThemePreset, ThemeId } from "@/hooks/useThemePreset";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Palette } from "lucide-react";

export function ThemeSelector() {
  const { currentTheme, setTheme, presets } = useThemePreset();

  // Helper to map theme IDs to visual tailwind dot colors
  const getDotStyles = (id: ThemeId) => {
    switch (id) {
      case "abyssal":
        return "bg-purple-500 shadow-purple-500/50";
      case "emerald":
        return "bg-emerald-500 shadow-emerald-500/50";
      case "crimson":
        return "bg-rose-500 shadow-rose-500/50";
      case "slate":
        return "bg-sky-500 shadow-sky-500/50";
      case "amber":
        return "bg-amber-500 shadow-amber-500/50";
      case "parchment":
        return "bg-amber-200 border border-amber-800/40 shadow-amber-800/10";
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/35 px-2.5 py-1.5 backdrop-blur-md select-none transition-all duration-300">
      <div className="flex items-center gap-1.5 pr-1.5 border-r border-border/40 text-muted-foreground/80">
        <Palette size={13} className="text-accent animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
          Theme
        </span>
      </div>
      <div className="flex items-center gap-2">
        {presets.map((preset) => {
          const isActive = currentTheme === preset.id;
          return (
            <Tooltip key={preset.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setTheme(preset.id)}
                  className={`group relative h-4 w-4 rounded-full cursor-pointer transition-all duration-300 hover:scale-120 focus:outline-none flex items-center justify-center`}
                  aria-label={`Switch to ${preset.name}`}
                >
                  {/* Outer active ring */}
                  <span
                    className={`absolute -inset-[3px] rounded-full border transition-all duration-300 ${
                      isActive
                        ? "border-accent scale-100 opacity-100"
                        : "border-transparent scale-50 opacity-0 group-hover:scale-75 group-hover:opacity-40 group-hover:border-accent/40"
                    }`}
                  />
                  {/* Inner color dot */}
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${getDotStyles(
                      preset.id,
                    )} ${isActive ? "scale-100 shadow-[0_0_8px_var(--accent)]" : "scale-90 group-hover:scale-100"}`}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-semibold px-2 py-1 bg-popover text-popover-foreground border border-border">
                {preset.name}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
