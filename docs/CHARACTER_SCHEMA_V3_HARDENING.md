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

DDB-derived languages, tools, armor and weapon proficiencies, defenses, and senses are preserved in a typed `migrationBaseline`. For the Mother of Bob migration, presence on the current DDB sheet is treated as owner-confirmed current-sheet truth. Every entry now carries `currentSheetConfirmation: { method: "ddb-current-sheet", status: "owner-confirmed", sourceSystem: "ddb" }`. Every entry is still explicitly marked `imported-unreconciled` because current-sheet truth is not the same as native rule-source authority; it is not allowed to masquerade as a native rule grant. The baseline exists so detachment work never loses visible character capabilities while their exact sources are being identified.

## Exact catalog reconciliation

V3 reconciliation walks rule references throughout the aggregate, including classes, subclasses, origin, decisions, spells, HP bonuses, overrides, items, and conditions. Accepted core-2024 and newer current-compatible records receive exact source/version keys. Older official 5e records are classified as `legacy-5e-compatible`: usable with the 2024 rules when the table accepts the exact source, but not silently relabeled as core/current 2024. Ambiguous and missing records remain unresolved and require an explicit decision.

The process updates dependent class and spell version keys together and revalidates the entire aggregate. Artificer from EFA is accepted as current-compatible without being mislabeled as core PHB content. Half-Orc and Outlander remain explicit legacy-5e-compatible decisions.

Rule-source compatibility is intentionally separate from whether the character currently has the
thing. DDB is authoritative for current MOB sheet facts; the compatibility bucket controls how much
native automation authority the app may take from the exact rule source.

| Compatibility bucket | Meaning | Examples | Native automation authority |
| --- | --- | --- | --- |
| `core-2024` | Official 2024 core rules. | XPHB, XDMG, XMM. | May be `verified` and automated when structured semantics exist. |
| `current-2024-compatible` | Newer official 2024-era material outside the core books. | EFA Artificer. | May be `verified` and automated when structured semantics exist. |
| `legacy-5e-compatible` | Older official 5e material still compatible with the 2024 rules, but not rewritten as 2024 core/current content. | TCE Booming Blade, XGE/TCE options, MPMM Firbolg, 2014 PHB Half-Orc. | Allowed by the Mother of Bob table policy when the exact source/version is known; remains `imported-unverified` unless a native compiler explicitly supports that source. Character-specific bundled choices still require exact provenance and owner-safe confirmation. |
| `legacy` | Backward-compatible spelling retained for already persisted V3 snapshots. | Older pre-renaming aggregate refs. | Accepted for migration/reading only; new reconciliation should prefer `legacy-5e-compatible`. |
| `custom` | Homebrew or table-created content. | Custom item, feature, spell, or override. | Requires custom authority and must never masquerade as official catalog content. |

## Owner-approved content decisions

Legacy references are not resolved by a hidden migration default. The character owner can:

- retain the exact imported version temporarily; or
- accept the single matched catalog version while keeping its legacy-5e-compatible/unverified classification.

The operation is owner-only, requires the expected build revision, records the reason and selected version, increments the build revision, emits an audit event, and revalidates the complete aggregate. A recorded decision changes reconciliation status to `resolved-by-decision`; it does not rewrite older compatible content as verified core/current 2024 content.

Native-authority readiness also counts every imported capability baseline as a rule-source blocker. This does not question whether the character currently has that capability; DDB already answers that for MOB migration. It only prevents the app from claiming the capability is natively derived until the exact source, automatic grant, or owner-selected source bucket is represented in V3. Resolving rule references alone cannot accidentally declare a character detached while languages, proficiencies, defenses, or senses still depend on the migration snapshot.

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
- Echo: Firbolg is legacy-5e-compatible and produces no grants without an explicit version decision.
- Dresana: Half-Orc produces no grants without an explicit version decision. A test-only approval proves that its structured Darkvision, Common, and Orc grants can then be reconciled while Goblin remains unresolved.

Sense provenance records both label and numeric range. Unsupported structures and malformed JSON become report issues; the adapter never falls back to prose interpretation.

## Fixed background capability provenance

Background tool and language data now follows the same deterministic boundary. Exact authorized Sage and Acolyte records prove Calligrapher's Supplies for Qemuel, Willow, and Echo. Those matches can be removed from the DDB migration baseline with the exact background version recorded as their source.

Choice-shaped grants are deliberately not matched by outcome. Ari's Entertainer background emits one unresolved musical-instrument choice; none of her seven imported instruments is silently selected. Outlander remains blocked until its legacy-5e-compatible version is owner-approved, and even a test-only approval leaves Dresana's one instrument and one standard-language choice unresolved. A later owner-confirmation operation must validate those choices against canonical option identities.

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

Echo's Firbolg Magic is gated by the legacy-5e-compatible species decision. Without Alexia's explicit approval of exact MPMM Firbolg, no native spell-bundle confirmation is allowed. A test-only approval demonstrates that Detect Magic and Disguise Self can then be confirmed together with Wisdom while Firbolg retains its `legacy-5e-compatible`/`imported-unverified` classification. The operation records a typed species spell-bundle decision, resolution, and audit event. No real Alexia approval has been persisted.

Atomic Magic Initiate confirmation now validates one spell list, one permitted casting ability, exactly two distinct cantrips, and exactly one level 1 spell against exact catalog versions. The three imported spell records must match those exact names and levels. A successful owner-only, revision-protected operation rewrites their spell and grant-source references, links all three to one typed `magic-initiate-selection` decision, records a resolution, increments the build revision, and emits an audit event. Replay, mixed-list, wrong-level, duplicate, stale, and non-owner submissions are rejected.

Willow's Cleric/Charisma selection and Echo's Wizard/Wisdom selection can be confirmed entirely against verified XPHB records. Qemuel's Wizard/Intelligence selection includes Booming Blade, which resolves to older TCE content. The Mother of Bob table policy already allows official legacy-compatible material such as Tasha's and Xanathar's, so exact TCE Booming Blade no longer blocks Magic Initiate confirmation. It is still pinned to its exact TCE provenance and remains legacy/imported-unverified rather than being relabeled as XPHB or 2024 core.

Tiefling resistance is modeled as a feature option rather than pretending that the outcome label `Fire` is itself the rule choice. The structured XPHB species record produces exact Poison, Necrotic, and Fire candidates tied to that exact Tiefling version for readiness reporting. The generic capability mutation refuses to apply them because the resistance belongs to a coupled legacy bundle.

Tiefling confirmation is now stricter than the generic capability mechanism: resistance alone cannot be confirmed. `Fiendish Legacy` is one atomic decision binding legacy, resistance, casting ability, and the four granted spells. Infernal Legacy therefore binds Fire Resistance, Thaumaturgy, Fire Bolt, Hellish Rebuke, and Darkness together. Qemuel's imported bundle uses Intelligence; Ari's uses Charisma. The operation validates the structured species record and exact spell versions, removes the matching resistance baseline, rewrites all four spell sources, records a typed decision and resolution, increments the build revision, and emits an audit event. Mismatched legacy bundles and replay are rejected.

## Native capability readiness matrix

Readiness reporting now runs after deterministic fixed grants are removed. It counts remaining baselines by capability kind, pending choice requirements, and total choice slots. A maximum bipartite matching calculation determines how many imported capabilities could possibly be covered by the available choices without guessing which choices the players made. Capabilities with no eligible requirement are reported as definitely unexplained; overlapping candidates remain ambiguous.

This matters for Ari: seven imported instruments are eligible for the three-slot Musician, three-slot Bard, and one-slot Entertainer requirements. The matrix caps instrument coverage at exactly seven while preserving the unresolved source grouping. Her Tiefling resistance adds one separate slot. All five characters keep their DDB-confirmed visible capabilities, but remain blocked from native capability authority while any baseline lacks exact source provenance.

The readiness report now also publishes the full typed remaining-capability source-provenance manifest, not just counts.
The executable MOB ledger after deterministic fixed class, subclass, species, and background grants is:

| Character | Remaining DDB-confirmed capabilities still lacking native source provenance after deterministic grants |
| --- | --- |
| Qem | Common; Elvish; Giant; Fire resistance; Leatherworker's Tools; Smith's Tools |
| Willow | Magical Sleep immunity; Common; Elvish; Halfling; Psychic resistance |
| Ari | Common; Draconic; Orc; Fire resistance; Bagpipes; Drum; Dulcimer; Flute; Lute; Lyre; Viol |
| Echo | Common; Druidic; Giant |
| Dresana | Common; Goblin; Orc; Darkvision; Flute |

This manifest is intentionally conservative about automation, not about player ownership. It treats every
listed capability as real for the sheet because it came from DDB, but it does not treat the fact as native
rule authority until the exact source version, automatic grant, or source-specific selection is represented
in V3.

## Structural versus rule validation

The storage schema enforces structural truth. It intentionally does not hardcode class-dependent limits such as maximum attuned items. Those limits belong to the versioned rule validator because features can change them.

Item authority now has an explicit conservative boundary. Imported inventory details preserve the
DDB-current name, type, rarity, magic flag, weight, description, snippet, cost, damage, armor class,
and stealth-disadvantage facts for display, but imported magic items do not make V3
DDB-independent by themselves. Readiness reports block imported magic items until their rule effects,
bonuses, charges, and recharge behavior are modeled natively. If an item does carry a charge
resource, verified charge authority must use the exact item definition as its source version. This
prevents a wand, stone, weapon, or other magic item from borrowing unrelated feature/class authority.
Random or partial item recharge remains a future semantic adapter rather than a guessed rule.
The reconstruction audit can now list the concrete magic items behind those blockers, such as
Qemuel's Sending Stones, so future item semantics can be planned from named evidence instead of a
generic inventory warning.
Tests also prove that the named magic-item audit stays aligned with readiness blocker paths across
all five Mother of Bob snapshots.

The first curated item semantic covers Qemuel's Sending Stones. It initializes one verified item
charge sourced from the exact item definition, restores that charge at Dawn through the same
structured recovery operation as other resources, preserves expended state during reconciliation, and
removes the generic unmodeled-item blocker only for that named item. This is deliberately a curated
semantic, not a prose parser for arbitrary magic items.

## DDB-independent reconstruction boundary

V3 now exposes an executable reconstruction projection and readiness report. The projection produces
identity, profile, exact progression, decisions, ability basis, HP ledger and derived maximum, live
state, spells, inventory, currencies, and overrides using only a serialized V3 aggregate. It has no
DDB payload input. The readiness report refuses to call that projection a complete playable sheet
while any authority is still imported, unverified, unresolved, or lacks a native compiler.

The five MOB migrations currently prove direct reconstruction of those authored facts while
trusting DDB-imported ability and HP baselines as authoritative current-sheet facts. Readiness still
reports blockers for unresolved capabilities and references, resources without exact sources,
imported item gaps, and the remaining derived sheet domains: Armor
Class, Speed, skills, attacks, and unlocked features. Qemuel's Dark
Bargain exclusion is retained and never appears as a reconstruction blocker or feature claim.

The cutover comparison now has an executable MOB-wide regression. For all five cached Mother of Bob
characters, `src/lib/character-v3/reconstruction.test.ts` parses the DDB migration snapshot, projects
the serialized V3 aggregate without passing through the DDB payload, and compares the imported
current-sheet truth for movement, Armor Class, initiative, passive scores, skills, saves,
spellcasting totals, senses, defenses, proficiencies, actions, attacks, encumbrance, inventory names,
and feature names. Inventory is compared as a counted set because import/display ordering is not an
authority claim. This proves the V3 aggregate can carry the current DDB sheet facts needed for MOB
shadow comparison while the readiness report still blocks full native-rule authority.

The native derived-sheet compiler now covers the universal proficiency bonus, effective ability
modifiers, base initiative, exact starting-class saving throws when class proficiency JSON is
available, spell-slot resources, and class spellcasting DC/attack values. Spellcasting DC is derived
as `8 + proficiency bonus + spellcasting ability modifier`; spell attack is derived as
`proficiency bonus + spellcasting ability modifier`. The MOB sheet fetches these values through a
read-only server function that bridges persisted DDB class IDs to reviewed catalog rows, then fails
closed with an unavailable reason if exact spellcasting ability metadata is missing or malformed.

The audit also exposed a genuine schema omission: hit-die live state. V3 now stores one pool per exact
class version with die size, maximum, remaining dice, and provenance. Cross-aggregate validation
requires every class exactly once and requires pool maximums to equal class levels. Native level-up
increments the selected class pool atomically. Imported die sizes remain `imported-unverified` until
the exact class catalog proves them; missing snapshots remain explicitly unavailable rather than
being guessed.

## Versioned class semantics

The first native class-semantic adapter binds rules data to exact class version keys. It verifies
class-level totals, each stored hit-die size, catalog revision freshness, and the universal
character-level proficiency-bonus progression. Confirmation is owner-only, protects both build and
live revisions, promotes only exactly matching hit-die pools to native provenance, increments the
live revision, and emits an authorization-bearing audit event. Mismatches are reported and never
normalized.

All five MOB characters match their canonical class hit dice and derive proficiency bonus 3 at their
current levels. Their HP status remains deliberately `not fully reconstructed`: the imported final
ability scores and historical HP baseline are trusted DDB facts for current play, but they have not
been replaced by verified native per-level choices and gains. Class records already preserve
first-level and higher-level HP semantics for that later proof, but the adapter does not invent old
rolls or retroactively choose fixed values.

## DDB-authoritative imported foundations

DDB sheets are treated as absolute knowledge for the MOB current-state baseline. Imported ability
scores and the historical maximum-HP baseline are therefore authoritative inputs for native
calculations, including ability-derived feature-resource maxima, without a separate owner
confirmation step. V3 records this directly on the imported ability basis and HP baseline with
`currentSheetConfirmation: { method: "ddb-current-sheet", status: "owner-confirmed", sourceSystem:
"ddb" }`. This confirms the current table truth without inventing historical level-by-level HP rolls
or fixed-value choices. For backward compatibility, older persisted Mother of Bob V3 snapshots that
have `method: "imported-baseline"` but predate this confirmation field are still treated as
DDB-confirmed current-sheet foundations by readiness reporting.

The owner-attestation command remains available as a stricter detachment/audit tool for future
non-DDB or manually corrected baselines. When used, it requires the player to echo the exact six
stored scores, maximum HP, and baseline-through level; changed values are rejected rather than
treated as corrections. It is owner-only, build-revision protected, replay protected, increments the
build revision, and emits an authorization-bearing audit event. The MOB level-up readiness test now
advances the persisted snapshots directly from their imported DDB baseline, proving that
confirmation is not a prerequisite for current party play.
Tests prove the workflow for all five MOB characters; these are simulated operation tests, not real
confirmations from Nikos, Eleni, Alexia, or Andreas.

Hit-die tracking is a backward-compatible V3 addition. Older persisted V3 snapshots that lack the
field hydrate as explicitly unavailable with a “predates hit-die tracking” reason. They remain
readable and blocked from hit-die authority until reconciled; no default die or remaining count is
invented.

## Spell-slot resource provenance

The live-resource semantic adapter derives ordinary spell-slot maxima from exact class versions,
their catalog revision, class levels, and declared spellcasting progression. It supports full,
Artificer, half, and third-caster slot contribution rules, including the different rounding used when
half/third casters participate in multiclass spellcasting. Pact Magic is modeled as a separate
`pact-slot:<level>` pool rather than being collapsed into ordinary `spell-slot:<level>` resources.

Reconciliation requires every expected ordinary or pact slot key, exact maximum, and the correct
recovery trigger while rejecting missing, extra, or mismatched pools. Ordinary spell slots recover on
a Long Rest. Pact slots recover on a Short Rest and on a Long Rest through structured recovery rules.
The operation preserves current expended-slot state and changes only provenance/source metadata,
under owner authorization and both build/live revision checks. Repeating an already reconciled
operation is rejected.

The five-character proof derives Qemuel's 4/3 slots, Willow's 4/3/3/1 slots, Ari's 4/3/3 slots,
Echo's 4/3/3 slots, and no slots for Dresana. Qemuel's remaining four feature resources, Willow's
three, Ari's three, Echo's four, and Dresana's two stay unresolved. No resource such as Rage,
Sorcery Points, Wild Shape, Flash of Genius, or a species use is assigned provenance by label alone.

## Feature-resource evidence boundary

The feature-resource audit found that the current canonical rows for Rage, Bardic Inspiration,
Sorcery Points, Innate Sorcery, Wild Shape, Wild Resurgence, Flash of Genius, and the reviewed
subclass features have empty structured use, recovery, and mathematical-recovery fields. Their prose
may describe the rules, but V3 does not parse prose into authority or match resources by similar
names.

Resources now carry a separate provenance state: `verified-rule`, `imported-unverified`, or `custom`.
An exact `sourceVersionKey` alone is no longer sufficient to imply that maximum and recovery were
validated. `verified-rule` structurally requires an exact source version. Older V3 documents hydrate
missing provenance as `imported-unverified`, preserving compatibility without silently upgrading
authority. Spell slots and the curated core feature records below can promote values to
`verified-rule`; every unsupported feature and species resource remains a blocker.

## Curated core feature-resource semantics

The first reviewed feature-resource catalog encodes formulas from exact current feature versions; it
does not parse descriptions at runtime. Each record binds a resource key, exact class version,
minimum class level, exact feature version, maximum formula, and recovery rule. Supported maximums
are fixed values, verified ability modifiers with a minimum, and exact class level.

This safely verifies four Artificer resources for Qemuel: Tinker's Magic (Intelligence modifier,
minimum 1), Drain Magic Item (1), Transmute Magic Item (1), and Flash of Genius (Intelligence
modifier, minimum 1). It also verifies three Sorcerer resources for Willow: Innate Sorcery (2),
Sorcery Points (Sorcerer level), and Sorcerous Restoration (1). All recover on a Long Rest in their
exact reviewed versions. Ability-derived resources can use either a verified native ability basis or
the authoritative DDB-imported ability baseline.

Reconciliation is atomic, owner-only, protects build and live revisions, preserves current expended
uses, promotes only exact matches to `verified-rule`, and emits feature version keys in its audit
event. Changed maxima, recovery mismatches, missing features, insufficient class levels, stale
commands, replay, and non-owner writes are rejected.

Subclass-bound semantics also require the exact subclass version, not merely the base class. Echo's
Cosmic Omen is now verified against the exact XPHB Circle of the Stars version, uses her verified
Wisdom modifier with a minimum of 1, and recovers on a Long Rest. Removing or changing that exact
subclass produces a hard validation issue. Ari's Beguiling Magic and Mantle of Majesty are also
bound to the exact XPHB College of Glamour version, have one use, and recover on a Long Rest. Their
alternative recovery paths are represented separately as atomic transactions rather than being
misclassified as rest triggers.

## Structured and multi-source recovery

Resources now preserve a backward-compatible primary recovery summary plus typed recovery rules.
Each trigger can restore all uses or a fixed number, and schema validation rejects duplicate
triggers. A verified resource must have at least one structured rule, and its primary recovery must
point to a full-restoration rule. Resources can also carry unique additional source version keys when
another feature changes their behavior. Older V3 snapshots hydrate both additions as empty and remain
`imported-unverified`.

This makes three more current resources representable without approximation. Dresana's Rage restores
one use on a Short Rest and all uses on a Long Rest, with its maximum taken from the reviewed
Barbarian level table. Echo's Wild Shape follows the same partial/full recovery pattern and its
reviewed Druid level table. Ari's Bardic Inspiration uses her verified Charisma modifier, restores all
uses on a Short or Long Rest, and records Font of Inspiration as an additional exact source modifying
the base Bardic Inspiration feature.

Rage, Wild Shape, Bardic Inspiration, and Cosmic Omen tests are semantic operation proofs; they do
not persist real player confirmations.

## Decision-gated legacy species resources

Hidden Step and Relentless Endurance now have a separate exact-species semantic adapter. It refuses
to operate unless the aggregate contains the required exact species version and that version is
verified current content or has an explicit owner content-version decision. Hidden Step derives its
maximum from character-level proficiency bonus; Relentless Endurance has one use. Both restore all
uses on a Long Rest and preserve current expended state during reconciliation.

The provenance distinction remains intentionally strict: approving MPMM Firbolg or PHB Half-Orc
authorizes continued use but does not turn legacy-5e-compatible content into verified core/current 2024 content. Their
resources therefore retain `imported-unverified` provenance while gaining exact source feature keys
and structured recovery. Tests simulate Alexia's and Andreas's approvals solely to prove the gate;
no real decisions have been persisted.

## Atomic cross-resource transactions

Reviewed transaction rules can spend one authoritative resource and restore another in a single
live-state revision. Beguiling Magic spends one Bardic Inspiration to restore one use. Mantle of
Majesty spends one chosen spell slot of level 3 or higher to restore one use. Costs and benefits are
validated before mutation, so insufficient costs, full targets, low-level slots, missing resources,
same-resource cycles, unverified resource provenance, wrong class/subclass versions, and stale or
non-owner commands fail without a partial update.

Executable rules are bound to the curated server-side registry by ID, class, subclass, exact source
feature, cost, and benefit. A structurally valid but forged caller rule cannot invent a new exchange.
The operation increments only the live-state revision and emits both before/after balances plus the
exact source feature version in its audit event. Durable replay protection remains provided by the
append-only repository's globally unique mutation ID contract.

## Authoritative live resource operations

Ordinary resource spending and recovery now use V3 aggregate operations rather than mutating a
browser-local projection. Spending requires an existing balance, owner authorization, and exact
build/live revisions. Recovery accepts one explicit trigger (`short-rest`, `long-rest`, `dawn`, or
`manual`) and applies only that trigger's structured recovery rules, including fixed partial
restoration and full restoration. The backward-compatible primary recovery summary is never used as
an executable rule.

Both operations increment only the live-state revision and emit exact before/after balances for the
append-only mutation log. Empty recovery commands are rejected instead of generating sync noise.
Another player and the DM cannot edit a character through these commands; a creator correction must
use the existing reasoned administrator override and is recorded as such. These operations cover
resource state only: they do not yet claim to implement a complete 2024 Short or Long Rest, whose
HP, Hit Dice, exhaustion, and feature interactions require separate verified semantics.

## Hit Points and death-state transitions

V3 now derives one unambiguous life status from authoritative state: positive Hit Points means
conscious; 0 Hit Points with no terminal state means unconscious; a cleared, stabilized death-save
record means stable; and three failures means dead. Cross-aggregate validation rejects stale
death-save marks on a conscious character, a stored third success that failed to transition to
stable, and stable records that still retain success or failure marks.

Atomic owner-authorized operations now apply damage, healing, temporary Hit Points, death-save
results, and stabilization. Damage consumes temporary Hit Points first, cannot reduce current Hit
Points below 0, handles massive-damage death, and records one or two failures for ordinary or
critical damage that reaches a character already at 0. Healing is capped by the HP ledger maximum,
clears the death-save state when HP returns, and cannot act as resurrection. A critical death-save
success restores 1 HP; three ordinary successes transition to stable; three accumulated failures
transition to dead. Direct stabilization clears all marks without inventing a successful save.

Temporary Hit Points replace the stored pool rather than stacking; the caller/UI is responsible for
the player's choice to keep an existing pool instead. Every operation protects build/live revisions,
increments only live state, and emits before/after HP, temporary HP, death-save, and derived-life
snapshots. Context-sensitive combat facts such as whether damage at 0 came from a critical hit are
explicit command inputs, never inferred from damage amount.

## Live table-state transitions

Inspiration, Exhaustion, and Conditions now use the same owner-authorized mutation boundary as
Hit Points and resources. These fields already existed in the V3 live-state schema; they are now
changed through audited operations rather than ad hoc browser edits.

Inspiration can be set on or off, Exhaustion can be set only within the schema's 0–6 range, and
Conditions can be added or removed by stable condition ID. No-op inspiration and Exhaustion changes
are rejected to avoid pointless sync events. Condition additions reject duplicate IDs before the
aggregate-level uniqueness invariant is reached, and removals reject missing IDs. A condition may
remain a custom/freeform table fact with `conditionRef: null`; if it carries a rule reference, that
reference must be an exact `condition` rule.

Every operation protects both build and live-state revisions, increments only the live-state
revision, and emits before/after or full condition audit details. Non-owners are rejected. A creator
correction must use the explicit reasoned administrator override and records that authorization in
the audit event.

The isolated V3 repository now exposes commit helpers for these hardened live operations, Hit Point
damage/healing, temporary Hit Points, death saves, stabilization, and resource spending/recovery.
Each helper loads the current stored snapshot, runs the operation against that exact aggregate,
converts the returned audit event into a persisted mutation event, and commits the snapshot/event
pair through the existing compare-and-swap transaction. This prevents a client from supplying an
already-mutated aggregate as authority while preserving exact retry, stale-revision rejection,
append-only event history, and incremental campaign event feeds.

The first server-function boundary now exposes narrow V3 sync calls for Hit Point damage/healing,
temporary Hit Points, death saves, stabilization, resource spend/recovery, Inspiration, Exhaustion,
Condition add/remove, and campaign event reads. The server derives the actor from the authenticated
session, checks campaign membership before reading event feeds or mutating a character, and forwards
the mutation through the repository-backed operation helpers. This is intentionally not a generic
“save character” endpoint.

The V3 production boundary now derives identity from the validated session cookie and rejects missing
or expired sessions. The diagnostic Mother of Bob actor selector remains a development-only affordance;
production sync calls reject client-supplied actor, role, or override authority. Campaign members can
read all five Mother of Bob sheets, while owner-only mutation checks map Fotis to Qemuel, Nikos to
Willow, Eleni to Ari, Alexia to Echo, and Andreas to Dresana. Danny is seeded as the DM/read-only
observer for now; DM mutation override remains a separate audited design gate.

An idempotent Mother of Bob bootstrap now seeds those intended identities (`qemuel` for Fotis,
`nikos`,
`eleni`, `alexia`, `andreas`, `danny`), creates the `mother-of-bob` campaign with Danny as DM,
creates campaign memberships, and initializes the five player character V3 snapshots from cached DDB
payloads. It does not overwrite existing snapshots or duplicate initialization events. Qemuel's
bootstrap path passes the exact V2 migration exclusion for DDB definition `2048517`, preserving the
audited fact that Qem does not have Dark Bargain.

Reserved Mother of Bob accounts are no longer claimable through the shared campaign passcode. First
claim requires a private deployment token named `MOB_CLAIM_TOKEN_<USERNAME>` for each reserved
identity, then all future logins require the account password. Claiming an existing blank reserved
identity uses an atomic compare-and-swap update and invalidates any existing sessions for that user,
preventing a stale placeholder session from retaining access after the real owner claims the account.
Generic registration remains on the legacy/shared path for now, preserving the generic app while MOB
hardening proceeds first.

The client sync layer is also isolated. Snapshot bootstrap returns the current party aggregates and a
high-water event cursor, then the client tails only newer mutation events. A pure event applier
consumes ordered or unordered V3 mutation events, advances a sequence cursor, deduplicates mutation
IDs with a bounded recent-history window, and keeps the latest resulting aggregate by character ID.
The React hook polls the campaign event feed on a visibility-aware interval, stops while the tab is
hidden, refreshes immediately after local mutations, focus/visibility restoration, reconnect, and
campaign switches, and drains bounded catch-up pages after disconnection.

A separate MOB Live tab now mounts this hook in the party dashboard and is the default MOB
workspace, while the old Party Cards tab remains available as the generic/DDB-era path. It can run the
idempotent MOB bootstrap, refresh/poll V3 events, and display the latest V3 HP, temporary HP,
Exhaustion, live revision, Condition count, and resource count for the five MOB snapshots. This is a
first native party surface, not yet a complete character sheet replacement.

Each MOB Live card can now open an expanded V3-native sheet visible to every campaign member. The
sheet renders class progression, species, background, base ability scores and modifiers, tracked
resources, authoritative spell selections, native inventory records, and imported profile notes
directly from the synchronized aggregate. It intentionally omits unproven derived combat values
such as Armor Class, saves, skills, attacks, and spell DC until those calculations have exact
versioned-rule semantics.

The first derived-sheet compiler slice now calculates character level, 2024 proficiency bonus,
ability modifiers, and base Dexterity initiative as pure V3 projections. Every value includes its
formula, aggregate source paths, build revision, and compiler version. Base initiative is explicitly
not the final initiative total: feature, item, and condition modifiers remain blocked until their
versioned semantics are compiled.

Saving-throw compilation now accepts only proficiency data from a catalog record that exactly
matches the starting class upstream ID, source ID, and content revision embedded in the character's
version key. It requires exactly two unique valid ability proficiencies and otherwise returns an
explicit unavailable result. The UI does not yet present saves because the synchronized sheet
boundary does not yet deliver this catalog input to the browser.

The synchronized MOB sheet now includes browser-to-server V3 mutation controls for owner-authorized
Hit Point damage/healing, temporary Hit Points, death-save success/failure, stabilization,
Inspiration, Exhaustion, custom table-condition add/remove, one-at-a-time resource spending,
inventory updates, and structured rest recovery. Custom table conditions deliberately carry
`conditionRef: null`; selecting an official condition must eventually come from the verified rule
catalog rather than a typed label. Owner controls unlock only for the authenticated owner of the
selected character, while other campaign members keep read-only visibility inside the normal visual
card/detail experience.

## Native level-up transaction boundary

Native level-up is now a repository-backed aggregate operation rather than a browser-side edit. The
server derives the current plan from the stored V3 snapshot, validates owner authorization and the
expected build/live revisions, compiles the submitted choices, and commits class level, player
decision, spell-selection, HP-ledger, hit-dice, live-state, revision, and audit-event changes in one
transaction.

The current planner supports ordinary levels with no ASI/feat decision, ASI choices capped by the
effective score limit, exact-version General feat choices, fixed HP, physical HP rolls, class
progression spell/cantrip selection requirements, and exact class spell catalogs. The review and
apply server functions both re-derive the plan from durable state, so a stale or hand-edited browser
payload cannot invent a level, duplicate a decision, skip a required spell group, reuse a spell-group
index, over-cap an ability score, or apply a feat/ASI at a level that does not grant one.

Subclass selection is now part of the same transaction boundary. The server loads verified XPHB
subclasses for the exact class source, checks their catalog `level_chosen`, and requires one exact
subclass when the next class level reaches that choice point and the class does not already have a
subclass. The compiled subclass records the exact version, owning class version, and character level
of selection; the aggregate operation rejects wrong-class, wrong-level, duplicate, stale, and
ineligible selections. The MOB level-up UI exposes the eligible subclass picker and disables
review/apply until a required choice is present.

The server now also loads exact class/subclass feature rows for the target class level. Fixed
feature unlocks remain derived from class, subclass, and level rather than being duplicated into the
aggregate. Exact XPHB `choose N` string-option groups compile into typed, exact-version
`feature-option` decisions and are committed atomically with the level. Resource uses, recovery
formulas, malformed or unfamiliar option JSON, always-prepared spells, and other feature side
effects remain separate compiler outputs. Review and apply fail closed when an unlocked feature
exposes one of those uncompiled structured semantics.

Feature-resource level-up changes now use the curated exact semantic registry that already verifies
the five MOB sheets, because the imported XPHB feature rows currently contain no populated use or
recovery JSON. Newly unlocked resources are initialized full; scaling maxima preserve the number of
expended uses; verified source versions and structured recovery rules are written in the same
aggregate transaction as the level. Ability-derived resources fail closed unless the ability basis
is either verified natively or imported from the authoritative DDB baseline.

Fixed subclass `prepared` and `known` spell arrays are also compiled from exact XPHB subclass JSON.
Prepared entries become always-prepared spell selections; known entries become granted selections;
both retain the exact subclass as their grant source and commit with typed spell decisions in the
same level-up transaction. Variant spell lists, filtered spell choices, expanded lists, rituals,
and innate/daily/resource casting fail closed until their distinct semantics are modeled. The MOB
level-up preview shows both automatic grants and any blocking unsupported spell structure.

Choice-based subclass spell grants now support the catalog's strict `level=...|class=...` filters
with an optional `school=...` constraint. The server resolves eligible exact XPHB spells through
spell level, school, and `class_spells` membership; repeated identical filters become an exact-count
choice group. This covers College of Lore and the Wizard school-subclass spell choices without
loosening validation for unknown filter predicates. The selected spells are revalidated and stored
with the same typed subclass grant decision as fixed grants.

Named subclass spell-list variants are now durable feature-option decisions. Circle of the Land's
Arid, Polar, Temperate, or Tropical choice is validated against the exact subclass JSON, committed
with the level-3 transaction, and recovered automatically for later level-5/7/9 grants. This avoids
both repeated prompts and the more dangerous possibility of switching lists between levels.

The persisted MOB snapshots still use imported DDB class/subclass upstream IDs, while the rule
catalog uses canonical IDs. Level-up now crosses that boundary through an explicit five-character
identity bridge (DDB ID to one reviewed catalog ID/source), never fuzzy name matching. The aggregate
version keys remain stable until owner-approved reconciliation rewrites them, while HP, progression,
features, spells, subclass grants, and resources query the correct XPHB/EFA rows. A real-catalog
readiness audit confirms all five level-7 MOB characters have a blocker-free 7→8 compiler plan.
Sorcery Points is recognized as a supported progressing column only because its exact curated
resource semantic already scales it by Sorcerer level; unknown progression columns still fail closed.

The progression parser also fails closed when a class table contains an increasing numeric column
that is not already modeled as a native choice or a known derived progression such as spell slots,
features, or proficiency bonus. These unsupported progression blockers are returned in the plan,
shown in the MOB sheet, and cause review/apply to refuse the level-up. This prevents the native
compiler from silently skipping class/subclass choices, resource increases, or other table-driven
progression semantics that still need exact modeling.

The first UI path is intentionally mounted inside the synchronized MOB sheet, using the same
expanded character-card/detail experience as the existing party view. Owners can review and apply
their own next level; other campaign members can observe the resulting synchronized aggregate after
the event feed refreshes. Because the table uses physical dice, rolled HP is an explicit player input
rather than an in-app randomizer.

This is still a conservative level-up compiler. Complex or replacement feature-option choices,
multiclass prerequisites, broader item/feature side effects, and automatic inclusion of non-XPHB
“newer 2024-compatible” content remain hardening gates until the catalog can prove their exact
source/version semantics. The spell catalog currently prefers verified XPHB records; older or newer
compatible sources must be admitted through explicit source metadata or owner-approved content
decisions instead of label matching.

## Verified behavior

The V3-focused suite currently covers:

- strict migration of all five MOB snapshots;
- authoritative imported spell snapshots;
- JSON round trips;
- exact rule-key verification;
- legacy-5e-compatible content verification rejection;
- item-container existence and cycle detection;
- imported magic-item mechanics and item-charge authority blockers;
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
- explicit retention of legacy-5e-compatible decision points;
- typed preservation of imported capabilities and Qemuel's Dark Bargain exclusion.
- owner-approved retention or acceptance of legacy-5e-compatible versions;
- stale-revision and non-owner rejection for content decisions;
- capability-baseline readiness blocking.
- exact fixed starting-class armor and weapon provenance;
- refusal to infer Armorer Heavy Armor from base Artificer;
- unsupported and stale capability-report rejection.
- deterministic fixed class tool provenance and explicit choice deferral;
- Armorer Heavy Armor provenance with conditional Smith's Tools left unresolved.
- fixed current-species Darkvision provenance;
- choice-dependent Tiefling resistance deferral;
- refusal to derive unapproved legacy-5e-compatible species capabilities;
- test-only, decision-gated Half-Orc sense and language provenance.
- exact fixed Sage/Acolyte tool provenance;
- Entertainer and Outlander choice deferral without outcome inference;
- refusal to derive unapproved legacy-5e-compatible background capabilities.
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
- decision-gated Firbolg Magic confirmation that preserves exact MPMM legacy-5e-compatible classification.
- atomic Magic Initiate decisions with exact spell-list, level, ability, permission, and revision validation.
- exact-subclass gating and ability-derived Cosmic Omen semantics.
- decision-gated Hidden Step and Relentless Endurance semantics without relabeling legacy-5e-compatible content.
- atomic, registry-bound Beguiling Magic and Mantle of Majesty resource exchanges.
- owner-authorized resource spending and structured-trigger recovery with audited creator override.
- ordinary spell-slot, Pact Magic, and multiclass spell-slot resource semantics, including
  short-rest Pact recovery and multiclass half/third-caster rounding.
- invariant-checked HP, temporary-HP, stabilization, and death-save state transitions.
- owner-authorized inspiration, Exhaustion, and Condition transitions with stale-edit, no-op,
  duplicate, missing-condition, non-owner, and creator-override coverage.
- repository-committed live-state and HP/death-state operations that append ordered sync events from
  the stored snapshot and reject stale browser commands without changing durable state.
- idempotent Mother of Bob V3 bootstrap for users, campaign membership, five snapshots, event
  initialization, and Qemuel's no-Dark-Bargain exclusion.
- snapshot-bootstrap campaign sync with high-water cursor handoff, event-tail catch-up, campaign
  switch isolation, stale-response rejection, bounded mutation-ID retention, and visibility-aware
  polling.
- a production two-browser MOB sync drill: Fotis edits Qem and Alexia observes, Alexia edits Echo
  and Fotis catches up through paginated event pages, non-owner writes are rejected, stale same-owner
  writes are rejected, and both clients converge exactly with the repository snapshots.
- mounted V3 synchronized sheet that displays repository-backed latest snapshots inside the normal
  Mother of Bob character-card/detail experience rather than a separate runtime authority.
- browser-to-server-to-event-feed V3 mutation paths through authenticated session identity for
  owner-authorized HP/death state, Inspiration, Exhaustion, custom table conditions, inventory,
  resource spending, and rest recovery, with non-owned controls disabled.
- native level-up planning, review, and atomic apply for ordinary no-ASI levels, ASI/feat-gated
  levels, HP fixed/physical-roll selection, spell/cantrip requirements, owner enforcement, stale
  revisions, duplicate decision IDs, invalid spell-group indexes, and event-feed refresh.
- exact-version subclass choice planning, required-choice validation, atomic aggregate insertion,
  and rejection of wrong-class, wrong-level, duplicate, stale, or ineligible selections.
- fail-closed unsupported level-up progression detection for increasing class-table columns that
  are not yet modeled as native choices or known derived progressions.
- exact class/subclass feature-unlock planning with fail-closed detection of uncompiled feature
  options, resource-use initialization, recovery formulas, and malformed structured source data.
- typed exact-count feature-option decisions for the catalog's XPHB Divine Order, Primal Order,
  Elemental Fury, Battle Master Maneuvers, Metamagic, and Eldritch Invocation option shapes.
- atomic curated feature-resource initialization and scaling with exact provenance, structured
  recovery, verified-ability gating, and preserve-expended-uses behavior.
- atomic fixed subclass spell grants with exact spell/subclass provenance and fail-closed handling
  for variant, expanded, ritual, innate, daily, or resource-casting structures.
- exact level/class/school filtered subclass spell choices for College of Lore and Wizard schools,
  including distinct-count enforcement and server-derived eligible XPHB spell catalogs.
- durable named subclass spell-list variants with exact option provenance and automatic reuse at
  later grant levels, including Circle of the Land terrain lists.
- explicit imported-DDB-to-canonical-catalog identity mappings and real database boundary coverage
  for all five MOB classes and subclasses, with clean next-level readiness reports.
- direct next-level readiness from persisted DDB-authoritative MOB snapshots, without requiring
  owner foundation confirmation before native review/apply.
- derived spell save DC and spell attack values from exact class spellcasting ability metadata,
  with fail-closed handling for missing or malformed catalog data and MOB DDB-to-catalog identity
  bridging in the synchronized native sheet.
- real session-cookie parsing, expiration rejection, reserved-account private claim tokens, atomic
  reserved-user claiming, session invalidation on claim, and authentication-required negative paths.
- typed public sync failures for authentication required, non-member, non-owner, revision conflict,
  mutation-ID reuse, and validation failure.
- server-only SQLite imports kept behind server-function handlers; the generic builder route no
  longer pulls `drizzle.server.ts` or `better-sqlite3` into browser build assets.

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

The MOB-specific restore drill now seeds the Mother of Bob users, Danny-owned campaign membership,
five V3 snapshots, and mutation history, creates a verified backup, restores it into a clean database
path, and proves the restored users, memberships, DM owner, character owners, revisions, snapshots,
and mutation events match the source exactly.

## Remaining hardening gates

V3 is materially safer, but MOB should not cut over permanently until these are addressed:

1. Resolve the remaining legacy-5e-compatible, ambiguous, and missing rule references through explicit player-approved content-version decisions.
2. Replace imported capability baselines with exact derived rule grants, one source at a time.
3. Import item containers, charges, and rule-bearing item state where the source provides them.
4. Add class-specific semantic validation for prerequisites, choice counts, prepared spells, multiclass rules, and rule-derived limits.
5. Close the remaining readiness blockers until the five sheets are not only reproduced from V3's imported current-sheet truth, but fully derived from V3 plus verified/catalogued rules without consulting DDB.
6. Run the same two-browser acceptance drill manually in a browser before cutover, using the
   executable drill as the expected behavior.
7. Run the documented backup/restore drill against the real deployment database before cutover,
   using the executable MOB restore drill as the expected behavior.
