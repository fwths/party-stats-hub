export const SOURCES = {
  core: ["XPHB", "XMM", "XDMG"],
  supplements: ["TCE", "XGE", "FTD", "BGG", "BMT", "MPMM", "VGM", "MTF", "AI", "RHW"],
  settings: [
    "FRAiF",
    "FRHoF",
    "EFA",
    "ERLW",
    "GGR",
    "EGW",
    "MOT",
    "VRGR",
    "SCC",
    "SCAG",
    "AAG",
    "BAM",
    "MPP",
    "SatO",
  ],
} as const;

export type SourceTier = keyof typeof SOURCES;

export const ENABLED_TIERS: SourceTier[] = ["core", "supplements", "settings"];
export const EXCLUDED_SOURCES: string[] = [];

// Keep non-official, prerelease/playtest, and local brew source codes out even if they are
// accidentally added to a tier later.
export const BLOCKED_SOURCES: string[] = [
  "HB",
  "HOMEBREW",
  "UA",
  "UAA",
  "UAB",
  "UACFV",
  "UACFV2",
  "UACFV3",
  "UACFV4",
  "UACFV5",
  "UACFV6",
  "UACFV7",
  "UACFV8",
  "UACFV9",
  "UACFV10",
  "UACFV11",
  "UAE",
  "UAEAG",
  "UAF",
  "UAFPP",
  "UAM",
  "UAR",
  "UAS",
  "UATMC",
  "UATRR",
  "UAWGE",
  "PSA",
  "PSD",
  "PSI",
  "PSK",
  "PSX",
  "PSZ",
  "HAT-TG",
  "HF",
  "HFFOTM",
  "MABJOV",
  "MGELFT",
  "OGA",
  "PAF",
  "TD",
  "XSAC",
];

const SOURCE_PRIORITY: Record<string, number> = {
  XPHB: 1000,
  XMM: 1000,
  XDMG: 1000,
  EFA: 900,
  FRAIF: 850,
  FRHOF: 850,
  RHW: 850,
  BGG: 700,
  BMT: 700,
  FTD: 700,
  MPP: 700,
  SATO: 700,
  MPMM: 650,
  TCE: 600,
  XGE: 600,
  ERLW: 500,
  EGW: 500,
  GGR: 500,
  MOT: 500,
  VRGR: 500,
  SCC: 500,
  SCAG: 400,
  VGM: 300,
  MTF: 300,
  AI: 250,
};

export function normalizeSource(source: string): string {
  return source.trim().toUpperCase();
}

export function getEnabledSources(): string[] {
  const excluded = new Set(EXCLUDED_SOURCES.map(normalizeSource));
  const blocked = new Set(BLOCKED_SOURCES.map(normalizeSource));
  return ENABLED_TIERS.flatMap((tier) => SOURCES[tier]).filter(
    (source) => !excluded.has(normalizeSource(source)) && !blocked.has(normalizeSource(source)),
  );
}

export function isSourceAllowed(source: string | null | undefined): boolean {
  if (!source) return false;
  const blocked = new Set(BLOCKED_SOURCES.map(normalizeSource));
  if (blocked.has(normalizeSource(source))) return false;

  const enabled = new Set(getEnabledSources().map(normalizeSource));
  return enabled.has(normalizeSource(source));
}

export function getSourcePriority(source: string | null | undefined, edition?: string): number {
  if (!source) return 0;
  const normalizedSource = normalizeSource(source);
  const editionBonus = edition === "one" ? 100 : 0;
  return (SOURCE_PRIORITY[normalizedSource] || 100) + editionBonus;
}

export function formatSourceConfigSummary(): string {
  return `Source tiers: ${ENABLED_TIERS.join(", ")} (${getEnabledSources().length} sources enabled)`;
}
