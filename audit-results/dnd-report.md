# D&D Domain Audit

```yaml
report_name: D&D Domain Audit
report_type: Gameplay Rules Review
generated_by: D&D Domain Agent
generated_on: 2026-06-29
repository_version: 8414d575ae938f728e5f6d0d38b3f848d7459494
audit_cycle: Audit #1 - Framework Ready 1.0.1
```

## Repository Snapshot

```yaml
repository_name: party-stats-hub
repository_branch: main
repository_commit: 8414d575ae938f728e5f6d0d38b3f848d7459494
repository_type: Full-stack web application / modular monolith
primary_language: TypeScript
frameworks: TanStack Start, React 19, Drizzle ORM, Zod, Vite, Vitest
database: SQLite
files_reviewed: 34 governance, source, and test files with targeted review of native engine, builder validation, parser spell logic, modifiers, character-v2/v3, party UI state, and architecture-report context
generated_on: 2026-06-29
audit_cycle: Audit #1 - Framework Ready 1.0.1
```

## Scope

Reviewed D&D gameplay correctness surfaces: native character calculation, builder validation, spell eligibility, spell slot calculation, skill/save math, class progression helpers, active effects, conditions, inventory/attunement validation, D&D Beyond parsing, character-v2/v3 hardening experiments, rules regression tests, `RULES_TEST_MATRIX.md`, `FINDINGS_REGISTRY.md`, ADR-001, ADR-003, and the completed architecture report.

## Out Of Scope

Architecture and persistence ownership, campaign ownership workflows, authentication/authorization, deployment, backup/recovery, performance, and general test coverage quality are outside this audit except where they directly produce incorrect D&D gameplay outcomes.

## Executive Summary

Party Stats Hub has a credible rules foundation for the current known party and native-authority direction. Native and parser tests cover multiclass slot rounding, hit dice, HP, proficiency deduplication, item effects, selected feat behavior, and canonical validation checks. The V2/V3 character work is especially strong on exact rule identity, provenance, unresolved migration decisions, and rejecting stale edits.

The production-facing builder and native snapshot path are not yet broadly trustworthy for arbitrary 2024 builds. The highest-risk gameplay issue found in this pass is spell eligibility: selected spell IDs are validated for existence/source, but not for class list, spell level, subclass eligibility, or spellcaster eligibility before the native snapshot treats them as prepared spells. A current test even asserts a Fighter 5 can receive `Shield` through `preparedSpellChoicesByClass`.

Two registry-listed D&D findings remain valid: builder validation still relies on class-specific shortcuts/fixed caps, and condition state is only partially applied to gameplay calculations. Overall, players can trust many covered calculations, but not every character sheet after unusual spell choices, class variants, condition states, or rule-changing features.

## Rules Accuracy Score (1-10)

**6/10.** Core covered calculations are increasingly predictable, and multiclass slot totals have regression protection. Significant risks remain in spell eligibility enforcement, class-specific validation, and condition effect application.

## Character System Assessment

Imported, native, V2, and V3 character paths coexist. From a D&D correctness standpoint, the strongest work is in deterministic snapshot calculation and V3's refusal to silently infer ambiguous imported facts. The production native builder still accepts broad `BuilderState` selections that can become legal-looking compiled sheets even when the selected rule choices are not legal for the character.

## Ability Score Assessment

Ability score assignment and modifiers are handled through builder utilities and native calculation paths. Validation covers standard array, point buy, manual ranges, and background +2/+1 selection. No official ability-score defect met the evidence gate.

## Skill Assessment

Skill proficiency and expertise are calculated in the native engine by applying proficiency once or doubled for expertise. Duplicate proficiency grants are deduplicated in tests. No official skill finding was created.

## Saving Throw Assessment

Saving throw proficiency math is straightforward in the native engine, but conditions and situational effects are not consistently part of the calculated save state. That risk is covered under DND-002 rather than a separate saving throw finding.

## Class Progression Assessment

Native class and feature unlock logic uses class IDs, subclass IDs, and level gates from rule data. Production validation still contains named class branches and hard-coded limits for some mechanics. DND-001 remains valid and should stay open.

## Multiclass Assessment

Multiclass caster slot totals are handled better than earlier risk signals suggested: both parser and native-engine paths have tests for half/third caster rounding and combined caster levels. Remaining multiclass risk is concentrated in per-class spell eligibility and class-specific prepared/known behavior, not slot totals.

## Spellcasting Assessment

Spell slots, pact slots, spell save DC, and spell attack bonus have explicit calculation paths. Spell eligibility is weaker: selected spell IDs are checked for existence/source, but the native snapshot does not verify that the selected spell belongs to the selected class list, is low enough for that class level, or that the selected class is a spellcaster/subclass spellcaster. This is an official High finding because it can put invalid spells directly on a character sheet.

## Condition Assessment

Condition state is visible in UI and local state, and selected effects such as exhaustion speed penalties and speed-zero conditions are applied in some party-card calculations. There is no evidence of a unified condition pass applying poisoned, blinded, prone, stunned, paralyzed, incapacitated, frightened, restrained, and exhaustion consequences across attacks, checks, saves, movement, and combat affordances. DND-002 remains valid.

## Inventory Assessment

Native tests cover custom equipment and item active effects. Builder validation enforces a fixed three-item attunement cap for `customEquipment`, while the V3 direction treats rule-changing limits as data/rule-derived. This remains part of DND-001.

## Gameplay Integrity Risks

- Invalid spell selections can appear as prepared spells on native sheets.
- Legal character builds can be rejected or incompletely validated when mechanics are implemented as fixed class branches or caps.
- Conditions can be tracked without consistently modifying the math players rely on at the table.
- Production does not yet inherit all V3 safeguards for exact provenance, owner-confirmed choices, and stale revision rejection.

## Findings Summary

```text
Critical: 0
High: 1
Medium: 2
Low: 0
Info: 0
```

## Top Findings

1. DND-003 - Native spell selection can prepare spells without class or level eligibility (High, High confidence).
2. DND-001 - Builder validation uses class-specific shortcuts and fixed caps for extensible rules (Medium, High confidence).
3. DND-002 - Conditions are tracked but not consistently applied to gameplay calculations (Medium, High confidence).

## Detailed Findings

### DND-003

```yaml
id: DND-003
title: Native spell selection can prepare spells without class or level eligibility
severity: High
confidence: High
owner: D&D Domain Agent
status: Open
lifecycle: New
first_detected: 2026-06-29
last_reviewed: 2026-06-29
category:
  - Spellcasting
  - Character Calculation
  - Gameplay Integrity
location:
  file: src/lib/native-engine.ts
  line: 1464
description: >
  Native snapshot compilation maps every selected non-cantrip spell into preparedSpells. Validation confirms selected spell IDs exist and pass source policy, but does not verify class spell-list membership, spell level eligibility, subclass spellcasting eligibility, or that the selected class can cast spells. A regression test currently asserts that a Fighter 5 with preparedSpellChoicesByClass.fighter = ["shield"] receives Shield as a prepared spell.
impact: >
  Characters can enter invalid gameplay states with spells they cannot legally know or prepare. The character sheet can then show invalid combat options, spell lists, and tactical choices, directly undermining trust in spellcasting correctness.
recommendation: >
  Validate selected spells against each spellcasting class's canonical spell list, class/subclass spellcasting progression, maximum spell level, known/prepared rules, and always-prepared exceptions before snapshot compilation. Reject or mark unresolved any spell choice that cannot be traced to a legal class, subclass, feat, species, background, item, or owner-confirmed migration decision.
notes: "Registry checked: DND-001 and DND-002 already exist; no duplicate current registry finding covers spell eligibility. ADR-003 supports deterministic rule-derived spell validation but is Proposed."
evidence:
  files:
    - src/lib/native-engine.ts
    - src/lib/rules/validate-character.ts
    - src/components/builder/BuilderUtils.ts
    - src/lib/native-engine.test.ts
  symbols:
    - createNativePartyMember
    - validateCharacterDraft
    - getClassPreparedSpellChoices
    - computeCharacterSnapshot
  lines:
    - "src/lib/native-engine.ts:1464-1469"
    - "src/lib/rules/validate-character.ts:515-531"
    - "src/components/builder/BuilderUtils.ts:538-545"
    - "src/lib/native-engine.test.ts:458-474"
  observed_behavior: >
    The compiler turns selected non-cantrip spell records into prepared spells; validation only checks that selected spell IDs exist and are source-allowed; the test suite expects Shield to be prepared for a Fighter 5 fixture with no Eldritch Knight subclass.
  expected_behavior: >
    Prepared spells should only appear when a selected class/subclass/feat/species/background/item rule legally grants or permits that spell at the character's current level and choices.
  rationale: >
    Spell access and prepared spell legality are high-priority rules-matrix items. The cited code and test demonstrate an invalid spell can become part of a compiled sheet.
  reproduction:
    - Use a native Fighter 5 builder state with preparedSpellChoicesByClass: { fighter: ["shield"] } and no Eldritch Knight subclass.
    - Compile with computeCharacterSnapshot.
    - Observe Shield in result.preparedSpells.
```

### DND-001

```yaml
id: DND-001
title: Builder validation uses class-specific shortcuts and fixed caps for extensible rules
severity: Medium
confidence: High
owner: D&D Domain Agent
status: Open
lifecycle: Existing
first_detected: 2026-06-29
last_reviewed: 2026-06-29
category:
  - Rules Engine
  - Class Progression
  - Spellcasting
  - Inventory
location:
  file: src/lib/rules/validate-character.ts
  line: 576
description: >
  Production validation encodes several gameplay rules as direct class checks or fixed limits. Attunement is hard capped at three custom items, and Wizard spellbook capacity, Warlock Mystic Arcanum, and Druid Wild Shape are explicit class-ID branches rather than rule-derived validators.
impact: >
  Legal characters can be rejected and invalid characters can pass when a source, subclass, optional feature, magic item, or future class changes the default rule. This reduces native-builder trust for arbitrary 2024-compatible content.
recommendation: >
  Move these checks behind rule-derived capabilities or versioned validation metadata. Keep class-specific validators only as adapters fed by canonical rule records, and add regression scenarios for changed attunement limits, alternate spell progression, and class/subclass resource gates.
notes: "Registry checked: existing finding DND-001 reused with Director-calibrated Medium severity."
evidence:
  files:
    - src/lib/rules/validate-character.ts
    - src/lib/rules/class-mechanics.ts
    - src/components/builder/BuilderUtils.ts
  symbols:
    - validateCharacterDraft
    - validateWizardSpellbook
    - validateWarlockMysticArcanum
    - validateDruidWildShape
    - attunedItems
  lines:
    - "src/lib/rules/validate-character.ts:576-584"
    - "src/lib/rules/validate-character.ts:598-660"
    - "src/components/builder/BuilderUtils.ts:706-715"
  observed_behavior: >
    Validation directly branches on Wizard, Warlock, and Druid class IDs, uses a hard attunement cap, and derives some option counts from named feature checks.
  expected_behavior: >
    Character legality should be derived from versioned rule definitions, selected features, and active item/feature modifiers so source variants and future rules can change limits safely.
  rationale: >
    The rules matrix treats progression, spellcasting, and inventory effects as high-priority trust areas. Hardcoded class and item limits can diverge from legal table outcomes.
  reproduction:
    - Inspect validateCharacterDraft class-specific validation branches.
    - Inspect the fixed attunement cap and named-feature option count logic.
```

### DND-002

```yaml
id: DND-002
title: Conditions are tracked but not consistently applied to gameplay calculations
severity: Medium
confidence: High
owner: D&D Domain Agent
status: Open
lifecycle: Existing
first_detected: 2026-06-29
last_reviewed: 2026-06-29
category:
  - Conditions
  - Combat
  - Gameplay Integrity
location:
  file: src/components/party/character-card/get-modified-stats.ts
  line: 4
description: >
  The application contains condition reference text and local condition state, but calculated character and combat surfaces only apply selected condition effects such as exhaustion speed penalties, speed-zero conditions, and a few spell-like tags. There is no evidence of a unified condition rules pass applying disadvantage, advantage, auto-fail saves, attack restrictions, incapacitation, or save/check effects across the sheet.
impact: >
  A character can visibly have Blinded, Poisoned, Prone, Restrained, Stunned, Paralyzed, or Exhaustion while attacks, checks, saves, and combat affordances omit required modifiers. That can produce incorrect table outcomes during live play.
recommendation: >
  Add a condition-effect resolver that maps canonical conditions to attack, save, check, speed, movement, targeting, action availability, and auto-fail consequences. Use it in character detail, combat tracker, and party summary surfaces, and cover high-impact conditions in regression tests.
notes: "Registry checked: existing finding DND-002 reused."
evidence:
  files:
    - src/components/party/character-card/get-modified-stats.ts
    - src/components/party/character-card/condition-state.ts
    - src/lib/party-modifiers.ts
    - src/components/party/character-detail/SkillsPanel.tsx
  symbols:
    - getModifiedStats
    - getLocalConditions
    - getFullyModifiedStats
    - SkillsPanel advantage note extraction
  lines:
    - "src/components/party/character-card/get-modified-stats.ts:4-98"
    - "src/components/party/character-card/condition-state.ts:6-36"
    - "src/lib/party-modifiers.ts:96-114"
    - "src/components/party/character-detail/SkillsPanel.tsx:109-237"
  observed_behavior: >
    Local condition names are stored and merged into member.conditions. Some AC and speed effects are applied, while save/check/attack consequences are handled as notes or not represented in calculated values.
  expected_behavior: >
    Active conditions should consistently drive all relevant gameplay calculations or explicitly remain descriptive with warnings that calculation is manual.
  rationale: >
    Conditions are Priority 1/2 rules-matrix items because they alter attacks, saves, checks, actions, and movement. Partial application creates incorrect game outcomes.
  reproduction:
    - Apply Poisoned, Blinded, Prone, or Stunned through character/party condition state.
    - Compare expected attack/check/save consequences with displayed calculated modifiers.
```

## Observations

```yaml
observation:
  title: Production character authority remains split across import, native, V2/V3, and live-state paths
  owner: Architecture & Data Model Agent
  category: Character Integrity
  location: Multiple Files
  evidence: Architecture report identifies parallel character representations and opaque KV live state.
  reason_not_finding: Source-of-truth ownership is architectural; D&D impact depends on which path becomes authoritative.
  recommended_validation: Resolve ARC-001 before broad native-authority release claims.
```

```yaml
observation:
  title: Rules regression coverage is promising but uneven across UI condition behavior and production/V3 parity
  owner: Code Quality & Reliability Agent
  category: Testing
  location: Multiple Tests
  evidence: Targeted tests pass for native engine, parser regressions, and forge validation; condition resolver behavior and invalid spell eligibility lack failing protections.
  reason_not_finding: Test coverage ownership belongs to Code Quality & Reliability Agent.
  recommended_validation: Add coverage targets around DND-003 and DND-002 remediation.
```

## Not A Findings

```yaml
not_a_finding:
  title: Native multiclass spell slots are globally broken
  reason: Current parser and native-engine tests cover combined caster-level slots, and native-engine code combines caster levels before reading FULL_CASTER_SLOTS.
  evidence_reviewed: src/lib/native-engine.ts:1346-1429; src/lib/native-engine.test.ts:294-333; src/lib/parser/character-rules-regressions.test.ts:55-81
  adr_reviewed: ADR-003 Rules Engine Strategy
  notes: Spell eligibility remains a separate finding.
```

## Most Dangerous Edge Cases

- A non-spellcaster or wrong subclass selecting spells by ID and receiving them as prepared spells.
- Class/subclass variants that alter prepared/known spell rules or spell-list access.
- Magic items or class features that alter the default attunement cap.
- Conditions requiring attack/save/check disadvantage, incapacitation, or automatic saving throw failure.
- Imported D&D Beyond choices where the visible outcome does not prove the original legal source.

## Quick Wins

- Reject prepared/cantrip selections that are not legal for the selected class/subclass and character level.
- Add a regression test that a plain Fighter cannot prepare `Shield` unless a legal rule grants it.
- Replace the fixed attunement cap with a derived limit, even if the default resolver initially returns three.
- Add a small canonical condition-effect map for Poisoned, Blinded, Prone, Restrained, Stunned, Paralyzed, and Exhaustion.

## Long-Term Improvements

- Promote V3 provenance, owner-confirmed choices, and stale-revision safeguards into production before broad native-authority use.
- Build a rules validation registry keyed by exact rule references rather than class names.
- Add full 1-20 progression fixtures for each supported class and representative subclass.
- Treat every D&D Beyond migration uncertainty as unresolved until a canonical rule or owner decision proves it.

## Ownership Referrals

Observation:
Production character authority is split between D&D Beyond imports, native persistence, V2, V3, and local/KV state.

Refer To:
Architecture & Data Model Agent

Reason:
This affects gameplay trust, but source-of-truth ownership is architectural. No finding created.

Observation:
Invalid spell eligibility and condition behavior need regression protection once fixed.

Refer To:
Code Quality & Reliability Agent

Reason:
Test coverage and regression policy ownership belongs to Code Quality. No finding created.

## Confidence Assessment

**High.** Evidence includes the D&D agent instructions, audit bootstrap/checklist, project context, finding schema, severity matrix, registry, report template, rules test matrix, architecture report, ADR-001, ADR-003, targeted source review, and targeted test execution. Confidence is limited by not exhaustively comparing every class/subclass/spell table and not manually exercising every UI workflow.

## Release Impact

**Significant Impact.** The current known-party deployment can continue where its fixtures and imports are validated, but broad native-builder trust should not be claimed while invalid spell selections can compile into prepared spells and conditions remain partial. This D&D audit does not independently block the whole repository release, but it blocks broad arbitrary-character correctness claims.

## Final Recommendation

**Requires Remediation.** The rules engine direction is sound, but spell eligibility, rule-derived validation, and condition effects need targeted remediation before players can fully trust arbitrary native character sheets.

# Overall Assessment

Gameplay correctness is partially trustworthy for covered paths and known fixtures, but production still has important rule legality gaps.

# Top Risks

1. Invalid spell choices can appear as prepared spells on character sheets.
2. Hardcoded class and item limits can reject legal characters or miss invalid ones.
3. Conditions can be displayed without consistently changing game math.

# Recommended Next Actions

Implement spell eligibility validation first, add a regression test for non-spellcaster/wrong-list spell rejection, make class/item limits rule-derived, then wire a shared condition-effect resolver into sheet and combat surfaces.

# Confidence

High, with limits around exhaustive table-rule comparison and runtime UI verification.

# Release Impact

Significant Impact for broad native-builder trust and arbitrary-character correctness claims.
