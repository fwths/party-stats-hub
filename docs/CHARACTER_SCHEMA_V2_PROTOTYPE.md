# Character Schema V2 Prototype

Status: isolated experiment; not connected to production routes or persistence.

## Purpose

Test whether a hybrid character model can safely represent the five Mother of Bob characters while supporting native progression under the current 2024-compatible rules ecosystem and synchronized live state.

The prototype deliberately separates:

- character identity and ownership;
- a versioned, strictly validated build document;
- separately versioned live state;
- item instances;
- import reconciliation issues;
- auditable state commands.

Derived sheet values are not part of the authoritative build contract.

## Results

All five cached MOB imports validate successfully:

| Owner | Character | Class | Level | Import result |
| --- | --- | --- | ---: | --- |
| Qemuel | Qemuel | Artificer | 7 | Valid, reconciliation required |
| Nikos | Willow Alatáriel | Sorcerer | 7 | Valid, reconciliation required |
| Eleni | Arion “Ari” Starfire | Bard | 6 | Valid, reconciliation required |
| Alexia | Echo | Druid | 6 | Valid, reconciliation required |
| Andreas | Dresana Silvakias | Barbarian | 6 | Valid, reconciliation required |

All five are currently single-class characters. Their ordered class levels can therefore be reconstructed without guessing about multiclass order.

The focused suite contains 16 passing tests covering:

- strict validation of all five imports;
- JSON round-trip stability;
- explicit unverified import provenance;
- level-history invariants;
- invalid HP and duplicate-resource rejection;
- immutable build revisions;
- stale level-up rejection;
- owner-only live-state editing;
- audit-event generation;
- concurrent stale-write rejection;
- idempotent mutation retries;
- isolated resource spending.

## Important findings

The cached D&D Beyond payloads do not prove every historical decision required to rebuild a native 2024 character from level 1.

In particular, the prototype currently treats these as reconciliation work:

- exact acquisition level of every feat and option;
- historical HP gain at each level;
- canonical 2024 IDs for imported rules;
- non-feat class, species, background, and spell-choice history;
- imported item-container relationships.

The prototype records uncertainty instead of inventing data. A future multiclass import becomes blocking when its exact class-level order cannot be established.

## Architecture supported by the experiment

The experiment supports a hybrid design:

1. Relational records for users, campaigns, ownership, party membership, item instances, live resources, conditions, and audit events.
2. One versioned and validated character-build document for origin, abilities, ordered levels, subclasses, choices, and explicit overrides.
3. A compiled character sheet derived from build data, live state, and versioned 2024 rule content.

It does not support retaining the current collection of overlapping JSON blobs and normalized tables as independent sources of truth.

## What this prototype does not prove

- It is not a production database migration.
- It does not yet match imported references to canonical local 2024 rule records.
- It does not validate class-specific level-up requirements.
- It does not implement SSE delivery between browsers.
- It does not persist audit events or idempotency keys.
- It does not replace the current parser or character sheet.

## Canonical reconciliation and next-level experiment

The second experiment maps imports to the local rule catalog without treating the 2024 Player's Handbook as the only accepted source. The accepted policy is:

- core 2024 records such as XPHB;
- newer records explicitly marked as compatible with the 2024 rules generation (`edition: one`);
- source provenance remains visible in both cases.

Older records without a current-compatibility marker are retained but require an explicit migration or grandfathering decision. Missing content is never silently replaced.

Seventeen additional focused tests pass against the real local SQLite catalog.

| Character | Next level | Fixed HP option | Canonical preview |
| --- | ---: | ---: | --- |
| Qemuel | Artificer 8 | 5 | Ability Score Improvement or eligible feat |
| Willow | Sorcerer 8 | 4 | Ability Score Improvement or eligible feat |
| Ari | Bard 7 | 5 | Countercharm |
| Echo | Druid 7 | 5 | Elemental Fury: choose Potent Spellcasting or Primal Strike |
| Dresana | Barbarian 7 | 7 | Feral Instinct and Instinctive Pounce |

Qemuel's EFA Artificer and Armorer are accepted as current 2024-compatible content. They are not treated as exceptions merely because they are outside XPHB.

The catalog currently requires review for:

- Fey Touched, which currently resolves only to the older TCE catalog row;
- Echo's MPMM Firbolg;
- Dresana's PHB Half-Orc and Outlander background.

The Fey Touched result exposes an important catalog-design risk: plain slug IDs such as `fey-touched` cannot safely retain multiple source or edition variants. Canonical V2 rule identity must include kind, source, upstream identity, and content revision. A display-name slug alone is not a durable primary key.

## Rule identity and unresolved-choice experiment

The third experiment corrects two assumptions from the earlier prototype.

First, a D&D Beyond feat wrapper is not proof that all its required selections were completed. The importer now checks the matching choice rows. When a choice has available `optionIds` but a null `optionValue`, it is stored as `unresolved-required-choice` and blocks detachment by default. Qemuel's payload contains a Dark Bargain wrapper in that state. Qemuel's player confirmed that he does not have a Dark Bargain, so MOB migration explicitly excludes DDB definition `2048517` and stores the reason as an auditable migration resolution. The generic importer still detects the unresolved wrapper when no such decision is supplied.

Second, canonical rules now have two identities:

- a family key, such as `feat:fey-touched`, representing the concept;
- an exact version key, such as `feat:xphb:fey-touched@2024`, representing one source revision.

This permits TCE and XPHB Fey Touched to coexist. Existing characters remain pinned to an exact version, while new selections can prefer the newest version accepted by the current-compatible rules policy. Duplicate exact keys are rejected.

The full repository suite now contains 142 passing tests across 22 test files.

## Verified Dresana 6 to 7 vertical slice

The first complete native advancement proof uses Dresana because Barbarian 7 has no player choice and no changing progression-table value. Ari was rejected as the first slice after deeper inspection because Bard 7 also increases prepared spells and therefore requires a spell choice that the initial feature-only preview did not expose.

The verified transaction:

- canonicalizes every imported Barbarian level and the Path of the Wild Heart subclass before appending a level;
- keeps legacy Half-Orc and Outlander references explicit and unverified;
- advances Barbarian 6 to Barbarian 7 rather than accidentally creating a second class track;
- applies fixed HP 7, Constitution +3, and Tough +2 for a total maximum-HP increase of 12;
- uses the explicit `preserve-damage` policy, changing 41/77 HP to 53/89 while keeping 36 damage;
- changes 6/6d12 hit dice to 7/7d12;
- grants Feral Instinct and Instinctive Pounce, including initiative advantage from Feral Instinct;
- preserves abilities, AC, initiative modifier, speed, skills, saves, attacks, spell slots, and limited-use resources exactly;
- now imports Rage (3/4) and Relentless Endurance (1/1), which the first migration prototype had omitted;
- persists before and after checkpoints, reloads the after state exactly, and rolls the current pointer back to the exact before state.

This storage is intentionally isolated and in-memory in the test. It proves the transaction shape and reversibility, but it is not wired to production routes or the production database.

## Next experiment

Generalize the remaining non-spell class resources and feat/feature choices, then expose the validated transaction through a level-up review UI.

## Rule-driven effects and level-choice preflight

The compiler no longer recognizes Tough or Feral Instinct by name. It parses their canonical Foundry effect metadata into validated V2 effects:

- `system.attributes.hp.bonuses.level ADD 2` becomes a hit-points-per-character-level effect;
- `flags.dnd5e.initiativeAdv OVERRIDE true` becomes an initiative-advantage effect.

Unknown prose and malformed metadata produce no mechanical effect. This prevents a display name from silently becoming executable rules.

Progression-table changes now create required choices. The current MOB preflight is:

| Character | Required decision(s) | Automatic progression |
| --- | --- | --- |
| Qemuel 8 | ASI or eligible feat | — |
| Willow 8 | ASI/feat and one prepared spell | Sorcery Points 7→8; fourth-level slots 1→2 |
| Ari 7 | One prepared spell | First fourth-level slot; Countercharm |
| Echo 7 | Elemental Fury and one prepared spell | First fourth-level slot |
| Dresana 7 | None | Already verified end to end |

The Ari preflight now hydrates the prepared-spell decision from canonical `class_spells` links, limits candidates to Bard spells of levels 1–4, excludes already prepared spells, rejects legacy/unverified candidates under the current-content policy, and uses exact source/version rule keys. Invalid and duplicate submissions are rejected.

With an explicitly supplied eligible selection, the generalized transaction can append Bard 7, record the selected canonical spell as a native build choice, add it to the compiled spellbook, unlock Countercharm, and create the new fourth-level spell-slot resource. The test selection is synthetic and is not recorded as Ari's real choice; the player must choose before production migration.
