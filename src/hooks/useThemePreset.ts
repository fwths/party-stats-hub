import { useEffect, useState } from "react";

export type ThemeId = "abyssal" | "emerald" | "crimson" | "slate" | "amber" | "parchment";

export interface ThemePreset {
  id: ThemeId;
  name: string;
  dotColor: string; // Tailwind bg color or raw hex for preview
  variables: Record<string, string>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "abyssal",
    name: "Abyssal Void",
    dotColor: "#6809300",
    variables: {
      "--background": "oklch(0.12 0.02 265)",
      "--foreground": "oklch(0.96 0.015 260)",
      "--card": "oklch(0.17 0.025 265)",
      "--card-foreground": "oklch(0.96 0.015 260)",
      "--popover": "oklch(0.17 0.025 265)",
      "--popover-foreground": "oklch(0.96 0.01 260)",
      "--primary": "oklch(0.70 0.08 200)",
      "--primary-foreground": "oklch(0.12 0.01 265)",
      "--secondary": "oklch(0.20 0.03 270)",
      "--secondary-foreground": "oklch(0.96 0.01 260)",
      "--muted": "oklch(0.18 0.025 265)",
      "--muted-foreground": "oklch(0.70 0.03 270)",
      "--accent": "oklch(0.68 0.09 300)",
      "--accent-foreground": "oklch(0.12 0.01 265)",
      "--border": "oklch(0.25 0.04 270)",
      "--input": "oklch(0.23 0.03 270)",
      "--ring": "oklch(0.68 0.09 300)",
      "--sidebar": "oklch(0.17 0.025 265)",
      "--sidebar-primary": "oklch(0.68 0.16 195)",
      "--sidebar-accent": "oklch(0.20 0.03 270)",
      "--sidebar-border": "oklch(0.25 0.04 270)",
      "--sidebar-ring": "oklch(0.66 0.21 305)",
    },
  },
  {
    id: "emerald",
    name: "Emerald Grove",
    dotColor: "#72012145",
    variables: {
      "--background": "oklch(0.12 0.015 140)",
      "--foreground": "oklch(0.96 0.015 140)",
      "--card": "oklch(0.16 0.02 140)",
      "--card-foreground": "oklch(0.96 0.015 140)",
      "--popover": "oklch(0.16 0.02 140)",
      "--popover-foreground": "oklch(0.96 0.01 140)",
      "--primary": "oklch(0.72 0.12 145)",
      "--primary-foreground": "oklch(0.12 0.01 140)",
      "--secondary": "oklch(0.19 0.02 140)",
      "--secondary-foreground": "oklch(0.96 0.01 140)",
      "--muted": "oklch(0.17 0.015 140)",
      "--muted-foreground": "oklch(0.70 0.03 140)",
      "--accent": "oklch(0.78 0.09 90)",
      "--accent-foreground": "oklch(0.12 0.01 140)",
      "--border": "oklch(0.23 0.03 140)",
      "--input": "oklch(0.21 0.02 140)",
      "--ring": "oklch(0.72 0.12 145)",
      "--sidebar": "oklch(0.16 0.02 140)",
      "--sidebar-primary": "oklch(0.72 0.12 145)",
      "--sidebar-accent": "oklch(0.19 0.02 140)",
      "--sidebar-border": "oklch(0.23 0.03 140)",
      "--sidebar-ring": "oklch(0.72 0.12 145)",
    },
  },
  {
    id: "crimson",
    name: "Crimson Bastion",
    dotColor: "#6201520",
    variables: {
      "--background": "oklch(0.12 0.015 15)",
      "--foreground": "oklch(0.96 0.015 15)",
      "--card": "oklch(0.16 0.02 15)",
      "--card-foreground": "oklch(0.96 0.015 15)",
      "--popover": "oklch(0.16 0.02 15)",
      "--popover-foreground": "oklch(0.96 0.01 15)",
      "--primary": "oklch(0.62 0.15 20)",
      "--primary-foreground": "oklch(0.12 0.01 15)",
      "--secondary": "oklch(0.19 0.02 15)",
      "--secondary-foreground": "oklch(0.96 0.01 15)",
      "--muted": "oklch(0.17 0.015 15)",
      "--muted-foreground": "oklch(0.70 0.03 15)",
      "--accent": "oklch(0.75 0.11 45)",
      "--accent-foreground": "oklch(0.12 0.01 15)",
      "--border": "oklch(0.23 0.03 15)",
      "--input": "oklch(0.21 0.02 15)",
      "--ring": "oklch(0.62 0.15 20)",
      "--sidebar": "oklch(0.16 0.02 15)",
      "--sidebar-primary": "oklch(0.62 0.15 20)",
      "--sidebar-accent": "oklch(0.19 0.02 15)",
      "--sidebar-border": "oklch(0.23 0.03 15)",
      "--sidebar-ring": "oklch(0.62 0.15 20)",
    },
  },
  {
    id: "slate",
    name: "Midnight Slate",
    dotColor: "#68011215",
    variables: {
      "--background": "oklch(0.13 0.01 220)",
      "--foreground": "oklch(0.96 0.01 220)",
      "--card": "oklch(0.17 0.015 220)",
      "--card-foreground": "oklch(0.96 0.01 220)",
      "--popover": "oklch(0.17 0.015 220)",
      "--popover-foreground": "oklch(0.96 0.01 220)",
      "--primary": "oklch(0.68 0.11 215)",
      "--primary-foreground": "oklch(0.13 0.01 220)",
      "--secondary": "oklch(0.20 0.015 220)",
      "--secondary-foreground": "oklch(0.96 0.01 220)",
      "--muted": "oklch(0.18 0.01 220)",
      "--muted-foreground": "oklch(0.70 0.03 220)",
      "--accent": "oklch(0.74 0.10 190)",
      "--accent-foreground": "oklch(0.13 0.01 220)",
      "--border": "oklch(0.24 0.02 220)",
      "--input": "oklch(0.22 0.015 220)",
      "--ring": "oklch(0.68 0.11 215)",
      "--sidebar": "oklch(0.17 0.015 220)",
      "--sidebar-primary": "oklch(0.68 0.11 215)",
      "--sidebar-accent": "oklch(0.20 0.015 220)",
      "--sidebar-border": "oklch(0.24 0.02 220)",
      "--sidebar-ring": "oklch(0.68 0.11 215)",
    },
  },
  {
    id: "amber",
    name: "Amber Hearth",
    dotColor: "#7501370",
    variables: {
      "--background": "oklch(0.13 0.02 45)",
      "--foreground": "oklch(0.96 0.015 45)",
      "--card": "oklch(0.18 0.025 45)",
      "--card-foreground": "oklch(0.96 0.015 45)",
      "--popover": "oklch(0.18 0.025 45)",
      "--popover-foreground": "oklch(0.96 0.01 45)",
      "--primary": "oklch(0.75 0.13 70)",
      "--primary-foreground": "oklch(0.13 0.02 45)",
      "--secondary": "oklch(0.21 0.03 45)",
      "--secondary-foreground": "oklch(0.96 0.01 45)",
      "--muted": "oklch(0.19 0.025 45)",
      "--muted-foreground": "oklch(0.70 0.03 45)",
      "--accent": "oklch(0.60 0.16 30)",
      "--accent-foreground": "oklch(0.13 0.02 45)",
      "--border": "oklch(0.26 0.04 45)",
      "--input": "oklch(0.24 0.03 45)",
      "--ring": "oklch(0.75 0.13 70)",
      "--sidebar": "oklch(0.18 0.025 45)",
      "--sidebar-primary": "oklch(0.75 0.13 70)",
      "--sidebar-accent": "oklch(0.21 0.03 45)",
      "--sidebar-border": "oklch(0.26 0.04 45)",
      "--sidebar-ring": "oklch(0.75 0.13 70)",
    },
  },
  {
    id: "parchment",
    name: "Parchment Scroll",
    dotColor: "#d2b48c",
    variables: {
      "--background": "oklch(0.92 0.03 80)",
      "--foreground": "oklch(0.20 0.04 70)",
      "--card": "oklch(0.88 0.04 80)",
      "--card-foreground": "oklch(0.20 0.04 70)",
      "--popover": "oklch(0.88 0.04 80)",
      "--popover-foreground": "oklch(0.20 0.04 70)",
      "--primary": "oklch(0.40 0.12 40)",
      "--primary-foreground": "oklch(0.95 0.02 80)",
      "--secondary": "oklch(0.84 0.05 80)",
      "--secondary-foreground": "oklch(0.25 0.04 70)",
      "--muted": "oklch(0.86 0.04 80)",
      "--muted-foreground": "oklch(0.38 0.04 70)",
      "--accent": "oklch(0.35 0.14 25)",
      "--accent-foreground": "oklch(0.95 0.02 80)",
      "--border": "oklch(0.76 0.06 80)",
      "--input": "oklch(0.82 0.05 80)",
      "--ring": "oklch(0.40 0.12 40)",
      "--sidebar": "oklch(0.86 0.04 80)",
      "--sidebar-primary": "oklch(0.40 0.12 40)",
      "--sidebar-accent": "oklch(0.84 0.05 80)",
      "--sidebar-border": "oklch(0.76 0.06 80)",
      "--sidebar-ring": "oklch(0.40 0.12 40)",
    },
  },
];

const STORAGE_KEY = "party-stats-theme-preset";

export function applyTheme(themeId: ThemeId) {
  const theme = THEME_PRESETS.find((t) => t.id === themeId) || THEME_PRESETS[0];
  const root = document.documentElement;
  Object.entries(theme.variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function useThemePreset() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId;
      if (saved && THEME_PRESETS.some((t) => t.id === saved)) {
        return saved;
      }
    }
    return "abyssal";
  });

  useEffect(() => {
    applyTheme(currentTheme);
    localStorage.setItem(STORAGE_KEY, currentTheme);
  }, [currentTheme]);

  return {
    currentTheme,
    setTheme: setCurrentTheme,
    presets: THEME_PRESETS,
  };
}
