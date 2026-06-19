import { useThemePreset } from "@/hooks/useThemePreset";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Palette } from "lucide-react";

export function ThemeSelector() {
  const { currentTheme, setTheme, presets } = useThemePreset();

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
          const hasBorder = ["parchment", "minimal", "minimal-light"].includes(preset.id);
          return (
            <Tooltip key={preset.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setTheme(preset.id)}
                  className="group relative h-4 w-4 rounded-full cursor-pointer transition-all duration-300 hover:scale-120 focus:outline-none flex items-center justify-center"
                  aria-label={`Switch to ${preset.name}`}
                >
                  {/* Outer active ring */}
                  <span
                    className={`absolute -inset-[3px] rounded-full border transition-all duration-300 ${
                      isActive
                        ? "scale-100 opacity-100"
                        : "scale-50 opacity-0 group-hover:scale-75 group-hover:opacity-40"
                    }`}
                    style={{
                      borderColor: preset.dotColor,
                    }}
                  />
                  {/* Inner color dot */}
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                      isActive ? "scale-100" : "scale-90 group-hover:scale-100"
                    } ${hasBorder ? "border border-border/35" : ""}`}
                    style={{
                      backgroundColor: preset.dotColor,
                      boxShadow: isActive ? `0 0 10px ${preset.dotColor}aa` : undefined,
                    }}
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
