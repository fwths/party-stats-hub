# Character Forge Completion Implementation Plan

Created: 2026-06-20

## Objective

Make Character Forge a complete D&D character builder that consumes the canonical 5etools-derived database, saves native characters into a rich canonical character model, and lets imported DDB characters resolve through the same rule/effect system.

The target is not just "more choices in the UI." The target is:

1. The Forge sees all official, non-homebrew canonical content that is relevant to character creation.
2. Every choice shown in the Forge comes from typed database rows or typed rule grants, not scattered hardcoded lists.
3. Every saved native character stores enough canonical IDs, selected choices, grants, resources, actions, proficiencies, spellcasting data, inventory references, and provenance to be recomputed.
4. Imported DDB characters normalize into the same internal model without double-counting.
5. The app can explain why a choice is available, unavailable, granted, overridden, or invalid.

## Current State

Done:

- The database has expanded canonical tables for core character-building and rule-reference data.
- The builder route now loads many additional canonical tables: skills, senses, conditions, rules actions, optional features, char options, mundane gear, weapon masteries, item metadata, magic variants, challenge ratings, and creature builder entries.
- Skills and tools now derive from database-backed helpers in Forge UI, validation, and native saved skills.
- Raw `compendium_entries` remains in SQLite only and is intentionally not loaded into the Forge payload.
- Database validation and production build pass.

Not done:

- Many loaded canonical tables are not yet driving UI, validation, or saved character output.
- Feature and feat choices are still partially handled by name checks and synthetic helpers.
- Equipment selection does not fully use mundane gear, item groups, item properties, magic variants, or item references.
- Rules validation is incomplete.
- Native character persistence is still closer to a display snapshot than a canonical recomputable character record.
- Source/book policy exists at import level, but the Forge needs explicit content availability controls.

## Definition Of Done

The Forge can be considered complete when all of these are true:

- A level 1-20 single-class or multiclass native character can be built using all enabled official sources without manual data entry for standard rules content.
- Species, species variants, backgrounds, classes, subclasses, feats, optional features, spells, equipment, proficiencies, languages, senses, actions, resources, defenses, and active effects are all computed from canonical data.
- The Forge blocks invalid builds and explains validation failures.
- Saved native characters persist canonical source IDs and selected choices, not only derived display fields.
- DDB imports map into the same canonical model and use overlap detection to avoid double application of the same grants.
- All generated party-member display data can be recomputed from the canonical character record.
- The user can filter/select enabled source books and exclude homebrew/prerelease content.
- Test coverage includes canonical data counts, choice generation, validation, save/load round trips, and representative full builds.

## Guiding Rules

- Keep raw 5etools JSON for provenance and migration fallback, but do not make the Forge depend on raw JSON at runtime.
- Prefer typed table fields and normalized grant records over text parsing.
- Text parsing is acceptable only as a temporary adapter with tests and migration notes.
- No homebrew content should be imported or shown unless a future explicit opt-in mode is built.
- Avoid loading huge tables into `/builder`. Use targeted typed tables and server functions for search-heavy surfaces.
- Every new choice type needs three integrations: UI, validation, and save/recompute.
- Every grant type needs a stable canonical shape and a provenance link back to the source entity.

---

# Phase 0: Baseline, Inventory, And Safety Harness

Goal: establish exact current Forge coverage and create guardrails before deeper rewrites.

## 0.1 Create a Forge Coverage Matrix

Add a maintained document or generated report: `docs/forge-coverage-matrix.md` or `src/pipeline/audit-forge-coverage.ts`.

Track these columns for every content family:

- Table name
- Loaded by `/builder`
- Used in UI
- Used in validation
- Saved as canonical ID
- Recomputed by native engine
- Used by DDB import normalization
- Source/book filter support
- Test coverage
- Status: missing, partial, complete, excluded

Initial rows:

- `species`
- `species_variants`
- `backgrounds`
- `classes`
- `subclasses`
- `class_features`
- `feats`
- `spells`
- `class_spells`
- `skills`
- `languages`
- `senses`
- `conditions`
- `rules_actions`
- `optional_features`
- `char_options`
- `weapons`
- `armor`
- `mundane_gear`
- `magic_items`
- `weapon_masteries`
- `item_properties`
- `item_types`
- `item_groups`
- `magic_variants`
- `item_card_references`
- `active_effects`
- `feature_active_effects`
- `item_active_effects`
- `spell_active_effects`

Acceptance:

- The report can be run locally.
- It fails or warns when a loaded table has no declared Forge use.
- It explicitly marks raw compendium data as not directly loaded by Forge.

## 0.2 Add Representative Character Fixtures

Create test fixtures for builds that exercise the rules engine:

1. Simple martial: Fighter 1.
2. Simple caster: Wizard 1.
3. Species with variants: a species/subrace from a non-PHB official source.
4. Background with ASI, origin feat, skills, tools, languages, and equipment.
5. Origin feat with nested choices: Skilled, Crafter, Magic Initiate.
6. General feat with ASI: Skill Expert, Resilient, Ability Score Improvement.
7. Multiclass: Fighter/Wizard or Rogue/Ranger.
8. Subclass at delayed choice level.
9. Character with custom/magic equipment, attunement, and active item effects.
10. Character using enabled setting/supplement content.

Acceptance:

- Fixtures are data-driven and can run without browser automation.
- Each fixture checks generated abilities, proficiencies, skills, saves, languages, senses, actions, spellcasting, inventory, and feature grants.

## 0.3 Add Forge Regression Tests

Recommended files:

- `src/components/builder/BuilderUtils.test.ts`
- `src/lib/native-engine.test.ts`
- `src/lib/character-rules.test.ts`
- `src/pipeline/audit-forge-coverage.test.ts`

Test categories:

- Choice group generation.
- Rule grant normalization.
- Validation failures.
- Save/recompute round trip.
- Source filtering.
- DDB/native overlap behavior.

Acceptance:

- `npx vitest` includes Forge coverage tests.
- `npm run build` remains the final production check.

---

# Phase 1: Canonical Forge Data Contract

Goal: make the Forge route, UI, validation, and save engine share one typed data contract.

## 1.1 Create `ForgeData`

Add `src/lib/forge-data.ts` or `src/lib/forge/forge-data.ts`.

Define:

- `ForgeData`
- `ForgeSourcePolicy`
- `ForgeContentToggles`
- `ForgeLookupIndexes`
- `ForgeEntityRef`
- `ForgeValidationContext`

`ForgeData` should include typed arrays for all character-relevant tables currently loaded by `/builder`.

Acceptance:

- `builder.tsx`, `builder.lazy.tsx`, `WizardSteps.tsx`, `BuilderUtils.ts`, and `native-engine.ts` stop relying on broad `any` loader payload assumptions.
- Helper functions accept `ForgeData` or narrow slices of it.

## 1.2 Build Lookup Indexes Once

Add a helper:

- `createForgeIndexes(data: ForgeData): ForgeLookupIndexes`

Indexes:

- Species by ID
- Species variants by species ID
- Backgrounds by ID
- Classes by ID
- Subclasses by class ID
- Class features by class/subclass/level
- Feats by ID
- Spells by ID
- Class spell links by class ID
- Skills by normalized name and ID
- Languages by normalized name and ID
- Tools/items by normalized name and ID
- Active effects by source entity
- Item metadata by item ID/name

Acceptance:

- Common `.find()` and `.filter()` chains in save/validation paths are replaced with indexes where practical.
- Behavior is unchanged after replacement.

## 1.3 Split Large Payloads From Search Payloads

Keep `/builder` fast:

- Load compact typed rows needed for character creation.
- Use separate server functions for search-heavy equipment/magic item lookups if payload grows too large.
- Never load `compendium_entries` into the Forge route.

Acceptance:

- Builder route payload remains bounded and documented.
- Equipment search can page or query server-side if needed.

---

# Phase 2: Source And Content Availability Policy

Goal: official content appears consistently, homebrew stays excluded, and users can control enabled sources.

## 2.1 Normalize Source Metadata

Ensure every Forge-relevant row has:

- `source`
- `sourceId` or canonical source key
- `sourceLabel`
- `page`
- optional `sourceCategory`: core, supplement, setting, adventure, partner, legacy, prerelease, homebrew
- optional `rulesEdition`: 2014, 2024, both, unknown

Acceptance:

- Source labels are human-readable everywhere.
- Book names no longer display as unresolved abbreviations unless no label exists.

## 2.2 Implement Forge Source Policy

Create `src/lib/source-policy.ts` or extend `src/pipeline/source-config.ts` for runtime use.

Policy inputs:

- Official only by default.
- Homebrew excluded.
- Prerelease/playtest excluded.
- Non-D&D app content excluded.
- Source tiers can be enabled/disabled.
- Individual source exclusions can override tiers.

Acceptance:

- The Forge receives only content allowed by the active policy.
- Policy is testable without UI.

## 2.3 Add Source Filters To Forge UI

Add per-step filters:

- Species books
- Background books
- Class/subclass books
- Feat books
- Spell books
- Equipment books

Add global content settings:

- Core only
- Core plus supplements
- Include settings
- Include adventures, if desired
- Legacy content toggle
- 2024 rules-first toggle

Acceptance:

- Filters do not hide already-selected invalid/disabled content without warning.
- Disabled content is shown as unavailable if already selected in a draft.

## 2.4 Source Policy Tests

Tests:

- Homebrew never appears.
- Excluded book content never appears.
- Enabled setting books appear.
- 2024-preferred mode prefers 2024 replacements where applicable.

Acceptance:

- Test fixtures prove Forge availability matches policy.

---

# Phase 3: Generic Choice And Grant Normalization

Goal: replace one-off feature/feat logic with a reusable canonical choice/grant system.

## 3.1 Define Canonical Choice Shapes

Add `src/lib/rules/choices.ts`.

Types:

- `RuleChoiceGroup`
- `RuleChoiceOption`
- `RuleChoicePrerequisite`
- `RuleChoiceGrant`
- `RuleChoiceState`
- `RuleChoiceValidationResult`

Choice group fields:

- `id`
- `sourceEntity`
- `label`
- `description`
- `min`
- `max`
- `exact`
- `repeatable`
- `optionType`
- `options`
- `prerequisites`
- `defaultSelection`
- `scalesByLevel`
- `provenance`

Option types:

- ability
- skill
- tool
- language
- weapon
- armor
- spell
- feat
- class
- subclass
- invocation
- maneuver
- weapon mastery
- resistance
- sense
- action
- resource
- item
- free text, only when official rules require it

Acceptance:

- Existing `ChoiceGroup`, `TraitChoiceGroup`, and `FeatureOptionGroup` can be mapped into this model.

## 3.2 Define Canonical Grant Shapes

Add `src/lib/rules/grants.ts`.

Grant types:

- Ability score bonus
- Skill proficiency
- Skill expertise
- Tool proficiency
- Weapon proficiency
- Armor proficiency
- Language
- Sense
- Speed
- Size
- Condition immunity
- Damage resistance
- Damage immunity
- Damage vulnerability
- Save proficiency
- Spell known
- Spell prepared
- Spellcasting feature
- Action
- Bonus action
- Reaction
- Resource / uses
- Item grant
- Weapon mastery
- Active effect
- Feature reference

Each grant should include:

- `id`
- `type`
- `value`
- `mode`: fixed, choose, derived, scaling
- `sourceEntity`
- `level`
- `conditions`
- `provenance`

Acceptance:

- Grants from species/background/class/feat/equipment can be represented uniformly.

## 3.3 Build Adapters From Existing Data

Adapters:

- `speciesToRuleChoicesAndGrants`
- `backgroundToRuleChoicesAndGrants`
- `classToRuleChoicesAndGrants`
- `subclassToRuleChoicesAndGrants`
- `classFeatureToRuleChoicesAndGrants`
- `featToRuleChoicesAndGrants`
- `spellToRuleChoicesAndGrants`
- `itemToRuleChoicesAndGrants`
- `conditionToRuleChoicesAndGrants`
- `optionalFeatureToRuleChoicesAndGrants`

Acceptance:

- Existing builder behavior is expressed through adapters first, then old helpers can be removed gradually.

## 3.4 Replace Name-Based Synthetic Logic

Current examples to remove or isolate:

- Feature handling based on names like `Expertise`.
- Feat handling based on names like Skilled, Crafter, Magic Initiate, Skill Expert, Resilient.
- Invocation/fighting style/weapon mastery special cases.

Implementation approach:

1. Keep temporary special adapters under `src/lib/rules/adapters/legacy-specials.ts`.
2. Add tests for every special case before migrating.
3. Move each special into canonical choice/grant data.
4. Delete the special when canonical data covers it.

Acceptance:

- No user-facing choice depends only on string matching without a test and TODO migration note.

---

# Phase 4: Species, Background, Class, And Multiclass Completion

Goal: make the core builder steps complete and rule-correct.

## 4.1 Species Completion

Integrate:

- Size choices
- Speed and alternate speeds
- Senses
- Languages
- Skill/tool/weapon/armor proficiencies
- Damage resistances/immunities
- Condition immunities
- Innate spellcasting
- Trait choices
- Species variants/subraces
- Source/edition replacements

UI:

- Show fixed grants and choice grants separately.
- Explain which trait grants each rule.
- Show unavailable variants and why, if source policy disables them.

Validation:

- Required species variant selected when needed.
- Required trait choices complete.
- Choice selections are from allowed options.

Save output:

- Store `speciesId`
- Store `speciesVariantId`
- Store selected species choices
- Store fixed and selected grants with source references

Acceptance:

- Eberron: Forge of the Artificer species and variants appear when source is enabled.
- Species languages, senses, speeds, and proficiencies appear in review and saved output.

## 4.2 Background Completion

Integrate:

- 2024 background ability score bonuses
- Background skills
- Tool proficiencies
- Languages
- Origin feat
- Starting equipment
- Source-specific background variants

UI:

- Make fixed background grants obvious.
- Origin feat choices should open inline and be validated as part of background completion.

Validation:

- Exactly valid ASI distribution.
- Required tool/language/equipment/origin feat choices complete.
- Origin feat prerequisites handled.

Save output:

- Store `backgroundId`
- Store ASI choices
- Store origin feat and nested choices
- Store background grants

Acceptance:

- Saving a native character never drops default characters or previous party IDs.
- Background-driven ASI is complete for 2024 rules.

## 4.3 Class And Subclass Completion

Integrate:

- Primary ability
- Hit die
- Save proficiencies
- Skill/tool/weapon/armor proficiencies
- Starting equipment
- Subclass choice level
- Class features by level
- Subclass features by level
- Resources and uses
- Weapon mastery
- Fighting styles
- Invocations, maneuvers, infusions, metamagic, and similar optional feature systems

UI:

- Timeline of class features by level.
- Required choices grouped by feature.
- Multiclass feature display separated from primary class.

Validation:

- Required proficiencies complete.
- Required subclass selected at correct level.
- Feature choices complete at every unlocked level.
- Invalid multiclass level distribution blocked.

Save output:

- Store primary class and level.
- Store subclass.
- Store multiclass records with subclass and level.
- Store per-class feature choices.
- Store per-class resources and spellcasting metadata.

Acceptance:

- Level 1-20 class build can be represented without losing feature grants.

## 4.4 Multiclass Rules

Implement:

- Ability prerequisites for multiclassing.
- Multiclass proficiency grants.
- Multiclass spell slot progression.
- Pact Magic plus Spellcasting interaction.
- Per-class spell choice buckets.
- Per-class hit die tracking.
- Per-class feature unlocks.

Validation:

- Cannot multiclass without meeting prerequisites unless optional override is enabled.
- Total level cannot exceed 20.
- Class levels cannot be zero.
- Duplicate class entries blocked.

Acceptance:

- Multiclass spellcasters compute slots and prepared spell limits correctly.
- Multiclass saved output includes class details in canonical structure.

---

# Phase 5: Feats, Optional Features, And Character Options

Goal: make feats and optional character options generic, complete, and canonical.

## 5.1 Generic Feat Prerequisites

Represent prerequisites:

- Level
- Ability score
- Species
- Class
- Spellcasting
- Proficiency
- Feat dependency
- Campaign/source rule

UI:

- Show unavailable feats with reason, or hide them behind a toggle.

Validation:

- Cannot save invalid feat choices unless marked as override.

Acceptance:

- General, origin, fighting style, epic boon, and source-specific feats use one prerequisite system.

## 5.2 Generic Feat Grants

Support grants:

- ASI
- Skill proficiency
- Expertise
- Tool proficiency
- Spell choices
- Spellcasting ability choices
- Save proficiency
- Damage resistance
- Actions/resources
- Item/weapon mastery grants

Acceptance:

- Skilled, Crafter, Magic Initiate, Skill Expert, Resilient, Ability Score Improvement, and Epic Boons are represented by the generic system.

## 5.3 Optional Features And Character Options

Integrate:

- Optional class features
- Fighting styles
- Eldritch invocations
- Maneuvers
- Infusions or equivalent source options
- Char options from canonical table

UI:

- Optional feature step or class-feature subsection.
- Toggle whether optional features are allowed by campaign policy.

Validation:

- Prerequisites and level gating enforced.
- Counts scale by class level.

Save output:

- Store selected optional feature IDs and grants.

Acceptance:

- Optional feature choices are available without special-case hardcoding.

---

# Phase 6: Spellcasting Completion

Goal: make spells, spell choices, prepared spells, and spellcasting metadata rule-correct.

## 6.1 Spell Availability

Compute availability from:

- Class spell links
- Subclass spell lists
- Feat-granted spell lists
- Species innate spellcasting
- Optional features
- Source policy

Acceptance:

- Spell list is correct per active class/subclass/feat/source policy.

## 6.2 Spell Choice Rules

Support:

- Cantrips known
- Prepared spells
- Known spells
- Always prepared spells
- Ritual casting
- Spellbook mechanics where relevant
- Spellcasting ability selection
- Multiclass spell slot progression
- Pact Magic

Validation:

- Correct number of cantrips.
- Prepared/known limits enforced.
- Spell level limits enforced.
- Spells from disabled sources blocked.

Save output:

- Store selected spell IDs by source and class.
- Store spellcasting ability per spell source.
- Store preparation/known/always-prepared status.

Acceptance:

- Native engine can recompute spell attack, save DC, spell slots, and prepared list from canonical data.

## 6.3 Spell Effects

Integrate:

- Passive active effects from spells.
- Actions created by selected spells.
- Resource usage and recharge data where available.

Acceptance:

- Spell-granted actions and passive effects appear in saved character output where canonical data supports them.

---

# Phase 7: Equipment, Inventory, And Items

Goal: make equipment selection complete and canonical.

## 7.1 Canonical Equipment Catalog

Merge catalog sources:

- Weapons
- Armor
- Mundane gear
- Tools
- Adventuring gear
- Magic items
- Magic variants
- Item groups
- Item type metadata
- Item properties
- Item cards/references

UI:

- Search by name, type, source, rarity, property, attunement, magic/mundane.
- Filter by allowed sources.
- Show canonical item detail.

Acceptance:

- Equipment picker no longer relies only on weapons, armor, and magic items.

## 7.2 Starting Equipment Resolution

Implement:

- Background equipment packages.
- Class equipment packages.
- Currency grants.
- Choice groups within equipment packages.
- Item quantities.
- Container/package groups.

Validation:

- Required equipment choices complete.
- Selected equipment comes from allowed package options.

Save output:

- Store selected package IDs.
- Store selected item IDs and quantities.
- Store currency grants.

Acceptance:

- Starting equipment can be recomputed from source packages and selected choices.

## 7.3 Item Proficiencies And Warnings

Compute:

- Weapon proficiencies
- Armor proficiencies
- Tool proficiencies
- Shield proficiency
- Whether equipped item is usable without penalty

UI:

- Warn when equipping armor/weapon without proficiency.
- Warn when attunement limit exceeded.
- Warn when strength/stealth armor properties apply.

Acceptance:

- Equipment state affects AC, attacks, warnings, and saved output.

## 7.4 Item Active Effects

Integrate:

- Item active effects
- Attunement requirements
- Equipped-only effects
- Charges/resources
- Granted actions
- Damage/attack metadata

Acceptance:

- Magic item effects apply only when equipped and attuned if required.

---

# Phase 8: Conditions, Senses, Actions, Defenses, And Resources

Goal: make non-choice rules data visible and computable.

## 8.1 Senses

Integrate:

- Species senses
- Class/feature senses
- Spell/item senses
- Active effect senses

Save output:

- Store canonical senses with range and source.

Acceptance:

- Senses show in review and character sheet.

## 8.2 Conditions And Defenses

Integrate:

- Condition immunities
- Damage resistances
- Damage immunities
- Damage vulnerabilities
- Condition references from spells/items/features

Save output:

- Store defenses with type, value, and source.

Acceptance:

- Defenses are recomputed and displayed with provenance.

## 8.3 Actions

Integrate:

- Rules actions
- Species actions
- Class feature actions
- Feat actions
- Spell actions
- Item actions
- Reactions and bonus actions

Save output:

- Store action name, activation, range, attack/save info, damage, resource use, and source.

Acceptance:

- Character sheet action list is generated from canonical grants.

## 8.4 Resources

Represent:

- Uses per rest
- Proficiency bonus uses
- Ability modifier uses
- Level scaling uses
- Charges
- Recharge

Acceptance:

- Features like limited-use actions become resources with correct max values.

---

# Phase 9: Rules Validation Engine

Goal: centralize rules validation and produce actionable explanations.

## 9.1 Create `validateCharacterDraft`

Add `src/lib/rules/validate-character.ts`.

Inputs:

- Character draft
- ForgeData
- Source policy
- Rule toggles

Outputs:

- Errors
- Warnings
- Suggestions
- Blocking status

Validation categories:

- Required choices
- Source availability
- Prerequisites
- Level limits
- Multiclass rules
- Spell rules
- Equipment rules
- Attunement
- Duplicate grants
- Invalid stored IDs

Acceptance:

- `getBuilderValidationIssues` becomes a wrapper or is replaced.

## 9.2 Explain Validation Failures

Every issue should include:

- Code
- Severity
- Message
- Step ID
- Source entity
- Suggested action

Acceptance:

- Review step groups issues by step.
- Clicking an issue can navigate to the relevant step later.

## 9.3 Optional Overrides

Support future campaign override:

- Allow invalid source
- Ignore prerequisites
- Manual ability scores
- Custom item
- Custom language/tool

Default:

- Strict official mode.

Acceptance:

- Overrides are explicit and saved as overrides, not silently accepted.

---

# Phase 10: Canonical Native Character Persistence

Goal: stop treating native characters as only display snapshots.

## 10.1 Define Canonical Character Schema

Add or update typed database tables:

- `characters`
- `character_classes`
- `character_choices`
- `character_grants`
- `character_inventory`
- `character_spells`
- `character_resources`
- `character_actions`
- `character_proficiencies`
- `character_defenses`
- `character_sources`
- `character_overrides`

Minimum canonical record:

- Character ID
- Name
- Player name
- Level
- Species ID
- Species variant ID
- Background ID
- Class records
- Selected choices
- Inventory selections
- Spell selections
- Source policy snapshot
- Derived snapshot version

Acceptance:

- Native save writes canonical data plus a derived display snapshot.
- Existing local storage party IDs continue to work.

## 10.2 Recompute Derived PartyMember

Add:

- `computeCharacterSnapshot(canonicalCharacter, ForgeData): PartyMember`

Flow:

1. Load canonical character.
2. Resolve sources and choices.
3. Apply grants.
4. Apply active effects.
5. Generate PartyMember display snapshot.

Acceptance:

- Existing character cards can render from recomputed snapshots.

## 10.3 Migration For Existing Native Characters

Implement:

- Detect old native saved format.
- Preserve old snapshot.
- Create best-effort canonical record.
- Mark uncertain fields as migration warnings.

Acceptance:

- Existing native characters do not disappear.
- User can still load old characters.

---

# Phase 11: DDB Import Normalization And Overlap

Goal: imported DDB characters and native characters use one canonical rule/effect engine.

## 11.1 Map DDB Entities To Canonical IDs

Mappings:

- Species
- Background
- Class
- Subclass
- Feats
- Spells
- Items
- Skills
- Languages
- Conditions/defenses where available

Store:

- DDB source ID
- Canonical ID
- Confidence
- Match reason

Acceptance:

- DDB imports preserve raw DDB data but also resolve to canonical references where possible.

## 11.2 Normalize DDB Modifiers Into Grants

Convert DDB modifiers into `RuleGrant` objects.

Grant types:

- Ability bonuses
- Proficiencies
- Expertise
- Defenses
- Senses
- Speeds
- Spell grants
- Item effects
- Actions/resources

Acceptance:

- Imported character display is generated by the same grant/effect pipeline as native characters.

## 11.3 Overlap Detection

Detect and prevent double-counting:

- Same grant from canonical feature and DDB modifier.
- Same proficiency from multiple sources.
- Same active effect from item and imported modifier.
- Same spell grant from class and subclass.

Rules:

- Proficiencies dedupe by type/value.
- Expertise upgrades proficiency.
- Bonuses stack only when rules allow.
- Same source entity does not apply twice.

Acceptance:

- DDB and native generated stats match expected values in representative fixtures.

---

# Phase 12: UI Completion

Goal: make the Forge feel like a complete builder, not a sequence of partial forms.

## 12.1 Step Structure

Recommended final steps:

1. Identity and source settings
2. Species
3. Background
4. Class and subclass
5. Abilities
6. Feats and optional features
7. Spells
8. Equipment
9. Biography
10. Review and save

Acceptance:

- Each step has complete, contextual validation.
- Review step shows fixed grants, choices, warnings, and final derived stats.

## 12.2 Choice UX

Improve:

- Choice cards show source, prerequisite, grant summary.
- Unavailable options show reason.
- Fixed grants are visible but not editable.
- Search/filter/sort exists for large lists.
- Already-selected values remain visible even if filters change.

Acceptance:

- User can understand why every value appears on the final sheet.

## 12.3 Review UX

Review should show:

- Character identity
- Source policy
- Species/background/class/subclass
- Ability scores and sources
- Proficiencies and sources
- Languages and sources
- Senses and defenses
- Actions and resources
- Spells by source/class
- Equipment, attunement, warnings
- Validation issues

Acceptance:

- Review is complete enough to audit a character before save.

---

# Phase 13: Data Quality And Migration Work

Goal: remove remaining schema/import gaps that block Forge correctness.

## 13.1 Audit Typed Table Completeness

Run:

- `npx tsx src/db/validate-all-data.ts`
- `npx tsx src/pipeline/audit-5etools-coverage.ts`, once present/updated
- Future `npx tsx src/pipeline/audit-forge-coverage.ts`

Acceptance:

- Every Forge-relevant 5etools array is typed, explicitly excluded, or intentionally raw-only with reason.

## 13.2 Link Fluff And Foundry Data

For each typed entity:

- Preserve raw JSON.
- Link fluff entries.
- Link foundry/effect data.
- Normalize useful rule effect data into grants/effects.

Acceptance:

- UI can show descriptions without losing rule structure.

## 13.3 Data Normalization Backfill

Backfill:

- Source labels
- Entity references
- Choice groups
- Grants
- Active effects
- Prerequisites
- Scaling by level

Acceptance:

- Adapters rely less on text parsing after each backfill.

---

# Phase 14: Testing And Verification Matrix

Goal: prevent regressions while the builder becomes more complete.

## 14.1 Unit Tests

Test:

- Source policy filtering
- Choice parsing
- Grant application
- Validation rules
- Skill/tool/language option derivation
- Spell slot calculation
- Equipment calculation
- Active effects

## 14.2 Integration Tests

Test complete builds:

- Fighter 1
- Wizard 1
- Rogue with Expertise
- Cleric with prepared spells
- Warlock with invocations
- Multiclass caster
- Species with innate spellcasting
- Background with origin feat
- Magic item attunement
- Setting-source species/background/feat

## 14.3 Browser Tests

Use the in-app browser or Playwright to verify:

- Every step loads.
- Filters work.
- Validation blocks incomplete builds.
- Save creates a character without removing existing defaults.
- Review shows expected grants.

## 14.4 Data Tests

Assertions:

- No homebrew rows in enabled Forge data.
- Expected row counts for canonical tables.
- Required source books present.
- Important source labels resolve.

Acceptance:

- `npx vitest`
- `npx tsx src/db/validate-all-data.ts`
- `npm run build`
- Browser smoke test

---

# Phase 15: Execution Order

Recommended implementation sequence:

1. Phase 0: coverage matrix and fixtures.
2. Phase 1: typed Forge data contract and indexes.
3. Phase 2: runtime source policy and source filters.
4. Phase 3: canonical choice/grant model.
5. Phase 4: species/background/class completion.
6. Phase 5: feats/optional features/char options.
7. Phase 6: spellcasting completion.
8. Phase 7: equipment completion.
9. Phase 8: senses/actions/defenses/resources.
10. Phase 9: centralized validation engine.
11. Phase 10: canonical native persistence.
12. Phase 11: DDB normalization and overlap.
13. Phase 12: UI completion.
14. Phase 13: data quality backfills.
15. Phase 14: full test matrix.

This order minimizes churn because the early phases create the shared data and rule model used by later UI and persistence work.

---

# Immediate Next Sprint

The next practical sprint should be:

## Sprint A: Forge Data Contract And Coverage

1. Add `ForgeData` type.
2. Add `createForgeIndexes`.
3. Add `audit-forge-coverage.ts`.
4. Convert builder loader and helpers to use `ForgeData`.
5. Add fixtures for 5 representative native builds.
6. Add tests for current DB-backed skill/tool behavior.
7. Add source policy runtime helper with official-only default.
8. Verify `npm run build`.

Deliverable:

- No new user-facing behavior except stronger correctness and coverage reporting.
- Foundation ready for generic choices/grants.

## Sprint B: Generic Choices And Grants

1. Add canonical `RuleChoiceGroup` and `RuleGrant` types.
2. Add adapters for species, backgrounds, classes, class features, feats, and items.
3. Make existing UI consume generated choice groups.
4. Keep existing special cases behind adapter layer.
5. Add validation for generated groups.
6. Add save output for generated grants.
7. Verify fixtures.

Deliverable:

- Feature/feat choices start moving out of hardcoded UI branches.

## Sprint C: Equipment And Validation

1. Build canonical equipment catalog from all item tables.
2. Replace biography custom equipment picker with full equipment step.
3. Add attunement and proficiency warnings.
4. Add centralized validation issue objects.
5. Store selected equipment IDs and quantities.
6. Verify save/load and review.

Deliverable:

- Equipment becomes rule-aware instead of mostly display/custom-entry oriented.

---

# File Map

Likely new files:

- `src/lib/forge/forge-data.ts`
- `src/lib/forge/forge-indexes.ts`
- `src/lib/forge/source-policy.ts`
- `src/lib/rules/choices.ts`
- `src/lib/rules/grants.ts`
- `src/lib/rules/adapters/species.ts`
- `src/lib/rules/adapters/backgrounds.ts`
- `src/lib/rules/adapters/classes.ts`
- `src/lib/rules/adapters/features.ts`
- `src/lib/rules/adapters/feats.ts`
- `src/lib/rules/adapters/items.ts`
- `src/lib/rules/validate-character.ts`
- `src/lib/rules/compute-character.ts`
- `src/pipeline/audit-forge-coverage.ts`
- `src/test/fixtures/characters/*.ts`

Likely changed files:

- `src/routes/builder.tsx`
- `src/routes/builder.lazy.tsx`
- `src/components/builder/WizardSteps.tsx`
- `src/components/builder/BuilderUtils.ts`
- `src/lib/native-engine.ts`
- `src/lib/dndbeyond.functions.ts`
- `src/lib/dndbeyond.server.ts`
- `src/lib/db-functions.ts`
- `src/db/schema.ts`
- `src/pipeline/seed.ts`
- all relevant seeders as normalization expands

---

# Risks And Controls

Risk: Loading too much data into the Forge.

Control: Keep raw compendium out of `/builder`; use compact typed rows and server-side search.

Risk: Rule effects double-count between native grants, active effects, and DDB modifiers.

Control: Every grant/effect needs source identity and dedupe rules.

Risk: Name-based parsing creates hidden bugs.

Control: Migrate name checks behind tested adapters, then replace with structured data.

Risk: Existing native characters break.

Control: Add migration and keep old display snapshots until canonical recompute is proven.

Risk: Source policy hides user drafts.

Control: Preserve selected disabled content with warnings instead of silently dropping it.

Risk: Scope is large.

Control: Execute in phases with fixtures and acceptance checks after each phase.

