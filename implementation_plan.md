# Migrate Data Pipeline to New 5etools Data Source

The `new data/` directory contains a complete 5etools data dump. The goal is to rewrite all seeders to ingest from `new data/` instead of the old Open5e source in `src/data/raw/`, with configurable source filtering.

## Decisions

- ✅ **2024 editions only** — skip classic PHB/MM/DMG entries; prefer XPHB/XMM/XDMG
- ✅ **Configurable source tiers** — core + supplements + settings enabled by default, with a config file to toggle tiers or exclude individual books at any time
- ✅ **Old data preserved** — move `src/data/raw/` → `src/data/raw_backup/`

---

## Proposed Changes

### Source Configuration

#### [NEW] [source-config.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/pipeline/source-config.ts)

Central config file that controls which books are imported:

```ts
export const SOURCES = {
  core:        ["XPHB", "XMM", "XDMG"],
  supplements: ["TCE", "XGE", "FTD", "BGG", "BMT", "MPMM", "VGM", "MTF", "AI", "RHW"],
  settings:    ["FRAiF", "FRHoF", "EFA", "ERLW", "GGR", "EGW", "MOT", "VRGR", "SCC", "SCAG", "AAG", "BAM", "MPP", "SatO"],
};

export const ENABLED_TIERS: (keyof typeof SOURCES)[] = ["core", "supplements", "settings"];
export const EXCLUDED_SOURCES: string[] = [];

export function isSourceAllowed(source: string): boolean { ... }
```

To switch to core-only later: change `ENABLED_TIERS` to `["core"]`.  
To drop specific setting books: add them to `EXCLUDED_SOURCES`.  
Re-run `seed.ts` — done.

---

### Shared Utilities

#### [NEW] [5etools-utils.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/pipeline/5etools-utils.ts)

Shared module with:
- **`stripTags(text)`** — Strips `{@tag content|source}` markup → plain text
- **`renderEntries(entries)`** — Recursively flattens 5etools entries arrays → description string
- **`slugify(name, source?)`** — Generates unique slug-IDs
- **Code maps**: school (`A`→Abjuration), size (`M`→Medium), damage type (`S`→Slashing), armor type (`HA`→Heavy)
- **Format helpers**: `parseCr()`, `formatRange()`, `formatDuration()`, `formatCastingTime()`

---

### Seeders — All Rewritten

Each seeder will call `isSourceAllowed(entry.source)` to skip disallowed content, and prefer 2024 editions over classic duplicates.

#### [MODIFY] [seed_spells.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/pipeline/seeders/seed_spells.ts)

- Read all `new data/spells/spells-*.json` files
- Filter by `isSourceAllowed(source)` — skip disallowed sources
- Deduplicate: if both PHB and XPHB versions exist, keep XPHB only
- Transform 5etools format → DB schema:
  - `school` codes → full names
  - `time` array → casting time string
  - `range` object → range string
  - `duration` array → duration string + extract `concentration` boolean
  - `meta.ritual` → `ritual` boolean
  - `components` object → componentsJson
  - `entries` → description text via `renderEntries()`
  - `savingThrow`/`damageInflict` → structured JSON
- Seed `classSpells` junction using `new data/spells/sources.json`

#### [MODIFY] [seed_monsters.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/pipeline/seeders/seed_monsters.ts)

- Read all `new data/bestiary/bestiary-*.json` (skip `fluff-*`, `index.json`, etc.)
- Filter by `isSourceAllowed(source)`
- Deduplicate: prefer XMM over MM
- Transform:
  - `str/dex/con/int/wis/cha` → `statsJson`
  - `ac` array → `acJson`
  - `hp` object → `hpJson`
  - `save`/`skill` objects → JSON
  - `cr` string → numeric (handle fractions)
  - `size` array → readable string
  - `type` (string or `{type, tags}` object) → string
  - `alignment` array → readable string
  - `trait/action/bonus/reaction/legendary` → JSON arrays with rendered entries
  - `languages` array → JSON
  - `passive` + senses → sensesJson

#### [MODIFY] [seed_equipment.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/pipeline/seeders/seed_equipment.ts)

- **Weapons**: Read `new data/items-base.json`, filter `weapon: true` + `isSourceAllowed`
  - `weaponCategory` → "Simple"/"Martial"
  - `type` → "Melee"/"Ranged" (`M`/`R`)
  - `dmg1` → damageDice, `dmgType` code → name, `dmg2` → versatileDice
  - `property` codes → names, `mastery` → mastery name
  - `value` (copper) → GP, `range` → normal/long
- **Armor**: Read `new data/items-base.json`, filter `armor: true` + `isSourceAllowed`
  - `type` → category (`LA`/`MA`/`HA`/`S`)
  - `ac` → acBase, infer acModifier from armor type
  - `strength` → strengthRequirement, `stealth` → stealthDisadvantage
- **Magic Items**: Read `new data/items.json`, filter `isSourceAllowed`
  - `rarity`, `reqAttune` → requiresAttunement/attunementConditions
  - `type` codes → readable names, `entries` → description

#### [MODIFY] [seed_backgrounds_feats.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/pipeline/seeders/seed_backgrounds_feats.ts)

- **Feats**: Read `new data/feats.json` (`{feat: [...]}`)
  - Filter by `isSourceAllowed`
  - Map `category` codes (`G`→General, `O`→Origin, `FS`→Fighting Style, `EB`→Epic Boon)
  - `entries` → description, `prerequisite` → string, extract `levelRequirement`
- **Backgrounds**: Read `new data/backgrounds.json` (`{background: [...]}`)
  - Filter by `isSourceAllowed`
  - `skillProficiencies` → skill name array
  - `toolProficiencies` → tool name array
  - `ability` → abilityScoreIncreases
  - `feats` → originFeatId
  - `startingEquipment` → equipment list
  - `entries` → description

#### [MODIFY] [seed_species.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/pipeline/seeders/seed_species.ts)

- Read `new data/races.json` (`{race: [...]}`)
- Filter by `isSourceAllowed`, deduplicate (prefer XPHB)
- Transform:
  - `size` array → string
  - `speed` object → walk speed integer
  - `entries` → featuresJson + description
  - `darkvision`/senses → sensesJson
  - `languageProficiencies` → languagesJson
  - `ability` → abilityScoreIncreasesJson

#### [MODIFY] [seed_classes.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/pipeline/seeders/seed_classes.ts)

- Read all `new data/class/class-*.json` (skip `fluff-*`, `index.json`, `foundry.json`)
- Filter by `isSourceAllowed`, prefer XPHB editions
- Transform:
  - `hd.faces` → hitDice/hitDiceType
  - Compute hpFirstLevel/hpHigherLevels from hit die
  - `startingProficiencies` → proficienciesJson
  - `startingEquipment` → startingEquipmentJson
  - `spellcastingAbility`/`casterProgression` → spellcastingJson
- Seed `subclasses` from inline `subclass` arrays
- Seed `classFeatures` from `classFeature` + `subclassFeature` arrays

---

### Orchestrator

#### [MODIFY] [seed.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/pipeline/seed.ts)

- Print enabled tiers and source count at start
- No structural changes — already calls all seeders in order

---

### Zod Schemas

#### [MODIFY] [zodSchemas.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/pipeline/zodSchemas.ts)

- Relax `BackgroundSchema` for 5etools format (different abilityScoreIncreases shape)
- Update `SpellSchema` components (5etools uses `m: "string"` not separate booleans)
- Loosen `WeaponSchema` category enum for edge cases

---

### Backup

#### [MOVE] `src/data/raw/` → `src/data/raw_backup/`

Preserve old Open5e data as backup. No code references the backup path.

---

## Verification Plan

### Automated Tests
- `npx tsx src/pipeline/seed.ts` — runs clean with no errors
- `npx tsx src/db/validate-all-data.ts` — row counts and schema correctness
- Spot-check key entries via SQLite queries (Fireball, Longsword, Beholder, Fighter)

### Manual Verification
- Compare row counts before/after (expect significantly more data)
- Verify web app renders correctly with new data
- Test source filtering: re-run with `ENABLED_TIERS = ["core"]` and confirm reduced row counts
