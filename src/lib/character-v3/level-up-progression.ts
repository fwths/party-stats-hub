export type LevelUpProgressionRequirement = {
  kind: "prepared-spell" | "cantrip";
  count: number;
  label: string;
};

export type UnsupportedLevelUpProgression = {
  label: string;
  before: number;
  after: number;
  reason: "unsupported-progressing-column";
};

function scalar(value: unknown): number | string | null {
  if (typeof value === "number" || typeof value === "string") return value;
  if (value && typeof value === "object" && "value" in value) {
    const nested = (value as { value?: unknown }).value;
    if (typeof nested === "number" || typeof nested === "string") return nested;
  }
  return null;
}

export function deriveLevelUpProgressionRequirements(input: {
  progressionJson: string | null;
  currentClassLevel: number;
  nextClassLevel: number;
}): LevelUpProgressionRequirement[] {
  if (!input.progressionJson) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.progressionJson);
  } catch {
    throw new Error("Class progression JSON is invalid");
  }
  if (!parsed || typeof parsed !== "object" || !("tableGroups" in parsed)) {
    throw new Error("Class progression table is unavailable");
  }
  const tableGroups = (parsed as { tableGroups?: unknown }).tableGroups;
  if (!Array.isArray(tableGroups)) throw new Error("Class progression groups are invalid");
  const requirements: LevelUpProgressionRequirement[] = [];
  for (const table of tableGroups) {
    if (!table || typeof table !== "object") continue;
    const record = table as Record<string, unknown>;
    const labels = Array.isArray(record.colLabels) ? record.colLabels : [];
    const rows = Array.isArray(record.rows)
      ? record.rows
      : Array.isArray(record.rowsSpellProgression)
        ? record.rowsSpellProgression
        : null;
    if (!rows) continue;
    const beforeRow = rows[input.currentClassLevel - 1];
    const afterRow = rows[input.nextClassLevel - 1];
    if (!Array.isArray(beforeRow) || !Array.isArray(afterRow)) continue;
    labels.forEach((rawLabel, index) => {
      const before = scalar(beforeRow[index]);
      const after = scalar(afterRow[index]);
      if (typeof before !== "number" || typeof after !== "number" || after <= before) return;
      const count = after - before;
      const label = String(rawLabel).replace(/\{@filter\s+([^|}]+).*?\}/g, "$1");
      if (/prepared spells?/i.test(label)) {
        requirements.push({
          kind: "prepared-spell",
          count,
          label: `Choose ${count} prepared spell${count === 1 ? "" : "s"}`,
        });
      } else if (/cantrips?/i.test(label)) {
        requirements.push({
          kind: "cantrip",
          count,
          label: `Choose ${count} cantrip${count === 1 ? "" : "s"}`,
        });
      }
    });
  }
  return requirements;
}

function cleanProgressionLabel(rawLabel: unknown): string {
  return String(rawLabel)
    .replace(/\{@filter\s+([^|}]+).*?\}/g, "$1")
    .trim();
}

function isKnownNonChoiceProgressionLabel(label: string): boolean {
  const normalized = label.toLowerCase();
  if (/^(\d+)(?:st|nd|rd|th)$/.test(normalized)) return true;
  if (/spell slots?/i.test(label)) return true;
  if (/slot level/i.test(label)) return true;
  if (/features?/i.test(label)) return true;
  if (/proficiency bonus/i.test(label)) return true;
  return false;
}

export function deriveUnsupportedLevelUpProgression(input: {
  progressionJson: string | null;
  currentClassLevel: number;
  nextClassLevel: number;
  supportedResourceLabels?: readonly string[];
}): UnsupportedLevelUpProgression[] {
  if (!input.progressionJson) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.progressionJson);
  } catch {
    throw new Error("Class progression JSON is invalid");
  }
  if (!parsed || typeof parsed !== "object" || !("tableGroups" in parsed)) {
    throw new Error("Class progression table is unavailable");
  }
  const tableGroups = (parsed as { tableGroups?: unknown }).tableGroups;
  if (!Array.isArray(tableGroups)) throw new Error("Class progression groups are invalid");
  const unsupported: UnsupportedLevelUpProgression[] = [];
  for (const table of tableGroups) {
    if (!table || typeof table !== "object") continue;
    const record = table as Record<string, unknown>;
    const labels = Array.isArray(record.colLabels) ? record.colLabels : [];
    const rows = Array.isArray(record.rows)
      ? record.rows
      : Array.isArray(record.rowsSpellProgression)
        ? record.rowsSpellProgression
        : null;
    if (!rows) continue;
    const beforeRow = rows[input.currentClassLevel - 1];
    const afterRow = rows[input.nextClassLevel - 1];
    if (!Array.isArray(beforeRow) || !Array.isArray(afterRow)) continue;
    labels.forEach((rawLabel, index) => {
      const before = scalar(beforeRow[index]);
      const after = scalar(afterRow[index]);
      if (typeof before !== "number" || typeof after !== "number" || after <= before) return;
      const label = cleanProgressionLabel(rawLabel);
      if (/prepared spells?/i.test(label) || /cantrips?/i.test(label)) return;
      if (isKnownNonChoiceProgressionLabel(label)) return;
      if (
        input.supportedResourceLabels?.some(
          (supported) => supported.toLowerCase() === label.toLowerCase(),
        )
      )
        return;
      unsupported.push({
        label,
        before,
        after,
        reason: "unsupported-progressing-column",
      });
    });
  }
  return unsupported;
}

function ordinalSpellLevel(label: string): number | null {
  const match = label.trim().match(/^(\d+)(?:st|nd|rd|th)$/i);
  return match ? Number(match[1]) : null;
}

export function deriveMaximumSpellLevelAtClassLevel(input: {
  progressionJson: string | null;
  classLevel: number;
}): number {
  if (!input.progressionJson) return 0;
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.progressionJson);
  } catch {
    throw new Error("Class progression JSON is invalid");
  }
  if (!parsed || typeof parsed !== "object" || !("tableGroups" in parsed)) {
    throw new Error("Class progression table is unavailable");
  }
  const tableGroups = (parsed as { tableGroups?: unknown }).tableGroups;
  if (!Array.isArray(tableGroups)) throw new Error("Class progression groups are invalid");
  let maximum = 0;
  for (const table of tableGroups) {
    if (!table || typeof table !== "object") continue;
    const record = table as Record<string, unknown>;
    const labels = Array.isArray(record.colLabels) ? record.colLabels : [];
    const rows = Array.isArray(record.rows)
      ? record.rows
      : Array.isArray(record.rowsSpellProgression)
        ? record.rowsSpellProgression
        : null;
    if (!rows) continue;
    const row = rows[input.classLevel - 1];
    if (!Array.isArray(row)) continue;
    labels.forEach((rawLabel, index) => {
      const spellLevel = ordinalSpellLevel(cleanProgressionLabel(rawLabel));
      const slots = scalar(row[index]);
      if (spellLevel !== null && typeof slots === "number" && slots > 0) {
        maximum = Math.max(maximum, spellLevel);
      }
    });
  }
  return maximum;
}
