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
export function isSourceAllowedByPolicy(source: string, policy: ForgeSourcePolicy = DEFAULT_SOURCE_POLICY): boolean {
  if (!source) return false;
  if (policy.excludedSources.includes(source)) return false;
  
  // Note: Detailed resolution mapping source IDs to their tiers/status
  // requires access to the source catalog data, which can be done at runtime.
  // This default helper enforces explicit exclusions and general official-only logic.
  
  // Currently, we assume all sources passed to the builder are official
  // and pre-filtered by the global source config, unless homebrew.
  return policy.allowOfficial;
}
