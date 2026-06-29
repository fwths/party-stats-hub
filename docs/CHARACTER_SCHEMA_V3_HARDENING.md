# Character Schema V3 Hardening

Status: isolated schema and migration experiment; not connected to production persistence or routes.

## Authority boundaries

V3 deliberately stores only authored or mutable character facts:

- identity, campaign, and owner;
- exact versioned rule references;
- ordered class levels and typed player decisions;
- authoritative spell selections;
- typed custom overrides;
- an explicit HP ledger;
- inventory instances;
- mutable live state;
- profile text and currencies.

A compiled character sheet is not part of the authoritative aggregate. It may later be cached with a source revision and checksum, but it must always be disposable and reproducible.

Maximum HP is no longer duplicated in live state. It is calculated from the HP ledger. Imported characters have one transparent baseline through their current level; every native level after migration must append a gain containing the die/fixed contribution, Constitution modifier, named bonuses, and verified total.

## Exact rule identity

Every rule reference contains:

- family key;
- exact version key;
- source and upstream ID;
- content revision;
- 2024 compatibility classification;
- verification state.

The schema recomputes and verifies exact version keys. Legacy content cannot claim `verified` status.

## Typed decisions and spells

The arbitrary V2 decision payload is gone. Decisions are a strict union of:

- ability-score increases;
- rule selections such as feats, proficiencies, languages, tools, and feature options;
- spell selections.

Selected rule kinds must match the decision kind. Ability increases cannot repeat an ability or exceed two points. Spell instances reference their decision, class version, selection mode, exact spell version, spell level, and acquisition level. Cross-aggregate validation rejects mismatches and dangling references.

Imported exclusions and content-version decisions are also typed aggregate records. Qemuel's confirmed exclusion of DDB definition `2048517` is retained with its reason, preventing a later import from resurrecting Dark Bargain.

## Imported capability baseline

DDB-derived languages, tools, armor and weapon proficiencies, defenses, and senses are preserved in a typed `migrationBaseline`. Every entry is explicitly marked `imported-unreconciled`; it is not allowed to masquerade as a native rule grant. The baseline exists so detachment work never loses visible character capabilities while their exact sources are being identified.

## Exact catalog reconciliation

V3 reconciliation walks rule references throughout the aggregate, including classes, subclasses, origin, decisions, spells, HP bonuses, overrides, items, and conditions. Accepted core-2024 and newer current-compatible records receive exact source/version keys. Legacy, ambiguous, and missing records remain unverified and require an explicit decision.

The process updates dependent class and spell version keys together and revalidates the entire aggregate. Artificer from EFA is accepted as current-compatible without being mislabeled as core PHB content. Half-Orc and Outlander remain explicit legacy decisions.

## Owner-approved content decisions

Legacy references are not resolved by a hidden migration default. The character owner can:

- retain the exact imported version temporarily; or
- accept the single matched catalog version while keeping its legacy/unverified classification.

The operation is owner-only, requires the expected build revision, records the reason and selected version, increments the build revision, emits an audit event, and revalidates the complete aggregate. A recorded decision changes reconciliation status to `resolved-by-decision`; it does not rewrite legacy content as verified 2024 content.

Native-authority readiness also counts every imported capability baseline as a blocker. Resolving rule references alone cannot accidentally declare a character detached while languages, proficiencies, defenses, or senses still depend on the migration snapshot.

## Fixed starting-class capability provenance

The first native capability adapter reads only deterministic `starting.armor` and `starting.weapons` grants from the exact verified starting-class record. It supports the canonical fixed groups Light Armor, Medium Armor, Heavy Armor, Shields, Simple Weapons, and Martial Weapons. Unknown or choice-shaped values produce issues rather than guessed grants.

Exact matches removed from the migration baseline in the verified tests are:

| Character | Proven fixed class matches | Intentionally unresolved class-related baseline |
| --- | ---: | --- |
| Qemuel | 6 | Heavy Armor (Armorer, not base Artificer) |
| Willow | 1 | — |
| Ari | 2 | — |
| Echo | 4 | — |
| Dresana | 5 | — |

The additional fixed matches are Artificer Thieves' Tools and Tinker's Tools, plus Druid Herbalism Kit. Artificer's artisan-tool choice and Bard's three instrument choices remain explicitly deferred.

Armorer's structured Tools of the Trade feature safely proves Heavy Armor and removes that baseline separately with the exact feature version as its source. Smith's Tools is acquisition-order dependent and remains unresolved until Qemuel confirms his earlier Artificer artisan-tool choice. If that choice was not Smith's Tools, the feature deterministically grants Smith's Tools. If it was Smith's Tools, the feature instead creates one owner-confirmed “other artisan tool” requirement that excludes Smith's Tools. Imported decisions alone cannot activate either branch; the earlier choice must be backed by an owner-confirmation resolution.

Each removal records the original baseline capability ID, exact source rule version, capability kind and label, and the `exact-fixed-rule-match` method. The operation is owner-only, revision-protected, report-revision-protected, and emits an audit event. Unproven languages, choice-derived tools, defenses, and senses remain in the baseline.

## Fixed species capability provenance

Species capabilities are derived only from structured catalog fields and only when the exact species version is either verified current content or explicitly approved through a content-version decision.

- Qemuel and Ari: Tiefling Darkvision 60 feet is proven. Fire Resistance remains unresolved because it depends on the selected Fiendish Legacy; the base species catalog correctly represents it as a choice.
- Willow: Elf Darkvision 60 feet is proven. Magical Sleep immunity is present only in prose, and Psychic Resistance is not a fixed Elf grant, so both remain unresolved.
- Echo: Firbolg is legacy and produces no grants without an explicit version decision.
- Dresana: Half-Orc produces no grants without an explicit version decision. A test-only approval proves that its structured Darkvision, Common, and Orc grants can then be reconciled while Goblin remains unresolved.

Sense provenance records both label and numeric range. Unsupported structures and malformed JSON become report issues; the adapter never falls back to prose interpretation.

## Fixed background capability provenance

Background tool and language data now follows the same deterministic boundary. Exact authorized Sage and Acolyte records prove Calligrapher's Supplies for Qemuel, Willow, and Echo. Those matches can be removed from the DDB migration baseline with the exact background version recorded as their source.

Choice-shaped grants are deliberately not matched by outcome. Ari's Entertainer background emits one unresolved musical-instrument choice; none of her seven imported instruments is silently selected. Outlander remains blocked until its legacy version is owner-approved, and even a test-only approval leaves Dresana's one instrument and one standard-language choice unresolved. A later owner-confirmation operation must validate those choices against canonical option identities.

The content database currently preserves exact XPHB tool and instrument records in the compendium, while the flattened mundane-gear table can retain a legacy duplicate. Choice confirmation must therefore use the exact compendium registry rather than labels or the flattened table.

## Owner-confirmed capability choices

Background choices now hydrate into typed requirements containing the exact source rule, capability kind, required count, eligible option set, character ID, and build revision. Entertainer produces one musical-instrument requirement. An approved Outlander produces one musical-instrument and one standard-language requirement.

Confirmation is owner-only and revision-protected. Each selected imported baseline must resolve to exactly one eligible, verified catalog option. The operation rejects duplicate IDs, incorrect capability kinds, missing or ambiguous options, stale requirements, unauthorized source versions, and replay of an already resolved requirement. Successful confirmation removes only the selected baseline entry, creates an authoritative typed `rule-selection` decision, records an `owner-confirmed-rule-choice` resolution, increments the build revision, and emits an audit event.

Tests demonstrate this flow with an explicit Bagpipes selection for Ari solely as an operation test; it is not a claim that Bagpipes was her actual Entertainer choice. The real MOB choice remains for Eleni to confirm.

The same contract now hydrates starting-class choices independently from background choices. Ari receives a three-instrument Bard requirement and a separate one-instrument Entertainer requirement; their IDs and exact sources cannot collide. Qemuel receives the Artificer's one-artisan-tool requirement. Tests exercise a simulated Bard selection only to prove count and provenance handling; they do not establish Ari's historical selections.

Origin-feat capabilities are also source-specific. Entertainer's exact XPHB Musician feat contributes a third, independent requirement for three musical instruments. Together Musician, Bard, and Entertainer provide seven instrument slots, matching Ari's seven imported instrument outcomes without assigning any instrument to a source. The test selections are simulations only; Eleni must confirm the real grouping. Sage and Acolyte grant Magic Initiate, whose structured choices concern spell list, spellcasting ability, cantrips, and a level 1 spell rather than capability baselines; those belong to the spell-decision hardening phase.

## Source-aware granted spells

The Magic Initiate audit exposed a flaw in the initial V3 spell snapshot: every imported spell was assigned to the primary class and same-name spells were deduplicated without considering their source. V3 spell instances now require exactly one source: either a class version or an exact grant-source reference. Granted spells also preserve their casting ability independently of the character's class ability.

Raw DDB feat spell groups are now migrated separately with their feat component as an imported, unverified source. This preserves Qemuel's Magic Initiate (Wizard) spells with Intelligence, Willow's Magic Initiate (Cleric) spells with Charisma, and Echo's Magic Initiate (Wizard) spells with Wisdom. Feat-only copies are removed from the flattened primary-class snapshot, while a genuine same-name class copy would remain as a separate spell instance. Reconciliation now walks and replaces grant-source references as well as spell references.

The same source-aware migration now covers species, background, and item spell groups. Repeated DDB rows for the same source/spell are deduplicated without collapsing distinct sources. Qemuel's Tiefling spells, Willow's Elf spells, and Echo's Firbolg spells retain their species source and casting ability; Qemuel's Sending remains item-granted by Sending Stones rather than appearing as an Artificer spell. If a class genuinely grants the same spell, its separate class instance is preserved.

Willow's High Elf lineage is now an atomic typed decision. It requires exactly one verified Wizard cantrip plus Detect Magic and Misty Step, all tied to the exact Elf version and one permitted casting ability. Willow's imported bundle confirms Elementalism with Charisma. Non-Wizard cantrips, wrong bundles, replay, stale revisions, and non-owner mutations are rejected; successful confirmation rewrites all three spell references and emits an audit event.

Echo's Firbolg Magic is gated by the legacy species decision. Without Alexia's explicit approval of exact MPMM Firbolg, no native spell-bundle confirmation is allowed. A test-only approval demonstrates that Detect Magic and Disguise Self can then be confirmed together with Wisdom while Firbolg retains its `legacy`/`imported-unverified` classification. The operation records a typed species spell-bundle decision, resolution, and audit event. No real Alexia approval has been persisted.

Atomic Magic Initiate confirmation now validates one spell list, one permitted casting ability, exactly two distinct cantrips, and exactly one level 1 spell against exact catalog versions. The three imported spell records must match those exact names and levels. A successful owner-only, revision-protected operation rewrites their spell and grant-source references, links all three to one typed `magic-initiate-selection` decision, records a resolution, increments the build revision, and emits an audit event. Replay, mixed-list, wrong-level, duplicate, stale, and non-owner submissions are rejected.

Willow's Cleric/Charisma selection and Echo's Wizard/Wisdom selection can be confirmed entirely against verified XPHB records. Qemuel is initially blocked because Booming Blade resolves to older TCE content. A test-only owner decision proves the correct path: explicitly accept the exact TCE version while preserving its `legacy`/`imported-unverified` classification, then confirm the Wizard/Intelligence Magic Initiate bundle. It is never relabeled as XPHB. No real Qemuel approval has been recorded; the production workflow must ask Qemuel before applying that decision.

Tiefling resistance is modeled as a feature option rather than pretending that the outcome label `Fire` is itself the rule choice. The structured XPHB species record produces exact Poison, Necrotic, and Fire candidates tied to that exact Tiefling version for readiness reporting. The generic capability mutation refuses to apply them because the resistance belongs to a coupled legacy bundle.

Tiefling confirmation is now stricter than the generic capability mechanism: resistance alone cannot be confirmed. `Fiendish Legacy` is one atomic decision binding legacy, resistance, casting ability, and the four granted spells. Infernal Legacy therefore binds Fire Resistance, Thaumaturgy, Fire Bolt, Hellish Rebuke, and Darkness together. Qemuel's imported bundle uses Intelligence; Ari's uses Charisma. The operation validates the structured species record and exact spell versions, removes the matching resistance baseline, rewrites all four spell sources, records a typed decision and resolution, increments the build revision, and emits an audit event. Mismatched legacy bundles and replay are rejected.

## Native capability readiness matrix

Readiness reporting now runs after deterministic fixed grants are removed. It counts remaining baselines by capability kind, pending choice requirements, and total choice slots. A maximum bipartite matching calculation determines how many imported capabilities could possibly be covered by the available choices without guessing which choices the players made. Capabilities with no eligible requirement are reported as definitely unexplained; overlapping candidates remain ambiguous.

This matters for Ari: seven imported instruments are eligible for the three-slot Musician, three-slot Bard, and one-slot Entertainer requirements. The matrix caps instrument coverage at exactly seven while preserving the unresolved source grouping. Her Tiefling resistance adds one separate slot. All five characters remain blocked from native capability authority while any baseline remains.

## Structural versus rule validation

The storage schema enforces structural truth. It intentionally does not hardcode class-dependent limits such as maximum attuned items. Those limits belong to the versioned rule validator because features can change them.

## Verified behavior

The V3-focused suite currently covers:

- strict migration of all five MOB snapshots;
- authoritative imported spell snapshots;
- JSON round trips;
- exact rule-key verification;
- legacy-content verification rejection;
- item-container existence and cycle detection;
- typed decision and spell linkage;
- HP component and coverage validation;
- derived maximum/current HP consistency;
- owner-only level advancement;
- independent build/live revision conflicts;
- atomic Dresana 6→7 advancement with 77→89 maximum HP and 41→53 current HP;
- audit-event output.
- exact catalog reconciliation for all five MOB class progressions;
- current-compatible Artificer handling;
- canonical accepted spell replacement;
- explicit retention of legacy decision points;
- typed preservation of imported capabilities and Qemuel's Dark Bargain exclusion.
- owner-approved retention or acceptance of legacy versions;
- stale-revision and non-owner rejection for content decisions;
- capability-baseline readiness blocking.
- exact fixed starting-class armor and weapon provenance;
- refusal to infer Armorer Heavy Armor from base Artificer;
- unsupported and stale capability-report rejection.
- deterministic fixed class tool provenance and explicit choice deferral;
- Armorer Heavy Armor provenance with conditional Smith's Tools left unresolved.
- fixed current-species Darkvision provenance;
- choice-dependent Tiefling resistance deferral;
- refusal to derive unapproved legacy species capabilities;
- test-only, decision-gated Half-Orc sense and language provenance.
- exact fixed Sage/Acolyte tool provenance;
- Entertainer and Outlander choice deferral without outcome inference;
- refusal to derive unapproved legacy background capabilities.
- exact-option owner confirmation with typed build decisions and audit output;
- stale, non-owner, duplicate, wrong-kind, ineligible-option, and replay rejection.
- independent Bard, Artificer, and background choice requirements;
- exact Tiefling resistance options bound to the source species version.
- atomic Tiefling Fiendish Legacy decisions coupling resistance, casting ability, and spells.
- acquisition-order-aware Armorer Smith's Tools/fallback handling;
- five-character post-fixed-grant readiness reports with maximum choice coverage.
- exact Musician origin-feat provenance for three additional instrument slots.
- source-aware feat spell migration with class/grant exclusivity and casting-ability preservation.
- deduplicated species-, background-, and item-granted spell provenance without collapsing class copies.
- atomic High Elf lineage validation for Wizard cantrip choice, fixed spells, and casting ability.
- decision-gated Firbolg Magic confirmation that preserves exact MPMM legacy classification.
- atomic Magic Initiate decisions with exact spell-list, level, ability, permission, and revision validation.

## Isolated persistence and synchronization spine

V3 now has an isolated SQLite repository for validated aggregate snapshots and append-only mutation
events. It is deliberately not connected to the legacy `characters` projections or generic KV sync
route. A mutation commit atomically updates the snapshot and appends its event, with an immediate
write transaction and a compare-and-swap check over both build and live-state revisions.

Each event stores a globally unique mutation ID, campaign and character identity, actual actor,
owner-versus-administrator authorization evidence, expected and resulting revision pairs,
server-generated commit time, JSON-validated operation details, the exact resulting aggregate, and
a SHA-256 aggregate checksum. Exact retries return the original result without applying twice;
reuse of a mutation ID with different content is rejected. Event history is protected by database
triggers against update and deletion and can be read incrementally using a monotonic sequence cursor.

Repository tests cover initialization, ordered incremental reads, exact retry, hostile mutation-ID
reuse, stale revisions, owner enforcement, reasoned creator override, transactional rollback after a
forced event-insert failure, append-only enforcement, and snapshot-corruption detection.

## Persisted schema migration registry

Persisted character documents now enter V3 through an explicit contiguous migration registry. The
registry detects the declared build schema version, supports the audited V2 to V3 transformation,
records every version step it applied, validates the final V3 aggregate, and rejects missing,
non-integer, obsolete, or future versions. Current V3 documents are validated without rewriting.

Repository reads verify that the version declared inside the character agrees with snapshot-table
metadata before returning data. A supported V2 snapshot can be upgraded in memory for inspection,
but a read does not silently modify durable state. Its stored representation changes to V3 only as
part of a later authorized, revision-protected, atomic mutation; that event retains the resulting V3
aggregate. Compatibility tests prove deterministic migration, source immutability, fail-closed
version handling, metadata verification, and atomic V2-row rewrite.

## Reviewed database migration and recovery

V3 table creation is no longer hidden inside the character repository. A reviewed database
migration owns the snapshot tables, event tables, indexes, constraints, and append-only triggers.
The migration runner applies pending migrations in immediate transactions, records immutable IDs
and SHA-256 checksums, is idempotent, and refuses modified or unknown migration history. The durable
Drizzle startup path runs this check before exposing the database.

Recovery tooling creates SQLite online backups without overwriting an existing file. Verification
runs SQLite integrity and foreign-key checks, validates the complete migration manifest, hashes the
logical contents of every table, and checks every V3 stored aggregate checksum. The restore drill
copies a backup to a distinct temporary path, repeats all verification, compares its manifest with
the backup, and removes the drill copy without touching the live database. The operator sequence and
the still-separate legacy KV database are documented in `docs/DATABASE_RECOVERY.md`.

## Remaining hardening gates

V3 is materially safer, but it is not ready for permanent persistence until these are addressed:

1. Resolve the remaining legacy, ambiguous, and missing rule references through explicit player-approved content-version decisions.
2. Replace imported capability baselines with exact derived rule grants, one source at a time.
3. Import item containers, charges, and rule-bearing item state where the source provides them.
4. Add class-specific semantic validation for prerequisites, choice counts, prepared spells, multiclass rules, and rule-derived limits.
5. Prove full sheet reproduction for all five characters from V3 authority alone, without consulting DDB.
6. Resolve authenticated server identity and campaign membership before exposing repository commands
   or event feeds through production routes.
