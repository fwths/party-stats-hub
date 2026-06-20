import { SOURCES, BLOCKED_SOURCES } from "./source-constants";

export interface ForgeSourcePolicy {
  allowOfficial: boolean;
  allowHomebrew: boolean;
  allowPrerelease: boolean;
  allowPartner: boolean;
  allowedTiers: string[]; // e.g., ["core", "supplements", "settings"]
  excludedSources: string[];
}

export interface ForgeContentToggles {
  prefer2024Rules: boolean;
  allowLegacyContent: boolean;
}

export const DEFAULT_SOURCE_POLICY: ForgeSourcePolicy = {
  allowOfficial: true,
  allowHomebrew: false,
  allowPrerelease: false,
  allowPartner: false,
  allowedTiers: ["core", "supplements", "settings"],
  excludedSources: [],
};

export const DEFAULT_CONTENT_TOGGLES: ForgeContentToggles = {
  prefer2024Rules: true,
  allowLegacyContent: true,
};

/**
 * Checks if a specific source ID is allowed by the given policy.
 */
export function isSourceAllowedByPolicy(
  source: string,
  policy: ForgeSourcePolicy = DEFAULT_SOURCE_POLICY,
): boolean {
  if (!source) return false;

  // 1. Exact exclusions
  if (policy.excludedSources.includes(source)) return false;

  // 2. Blocked homebrew / UA content
  if (BLOCKED_SOURCES.includes(source)) {
    if (source === "HB" || source === "HOMEBREW") {
      return false;
    }
    // UA or other prerelease content
    if (source.startsWith("UA")) {
      return policy.allowPrerelease;
    }
    return false; // Safely block anything else in the list
  }

  // 3. Official Tiers
  let sourceTier = "unknown";
  for (const [tier, sources] of Object.entries(SOURCES)) {
    if (sources.includes(source)) {
      sourceTier = tier;
      break;
    }
  }

  if (sourceTier !== "unknown") {
    // If it's a known official tier, check if that tier is enabled
    if (!policy.allowedTiers.includes(sourceTier)) return false;
    return policy.allowOfficial;
  }

  // If it's not a recognized official source, but isn't explicitly blocked,
  // we assume it is some partner or third-party content.
  // If we only allow official content, we block it.
  if (policy.allowPartner) return true;
  return false;
}
