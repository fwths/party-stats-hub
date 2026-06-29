# Architecture & Data Model Audit

```yaml
report_name: Architecture & Data Model Audit
report_type: Architecture Review
generated_by: Architecture & Data Model Agent
generated_on: 2026-06-29
repository_version: 8414d575ae938f728e5f6d0d38b3f848d7459494
audit_cycle: Not Provided
```

## Repository Snapshot

```yaml
repository_name: party-stats-hub
repository_branch: main
repository_commit: 8414d575ae938f728e5f6d0d38b3f848d7459494
repository_type: Full-stack web application / modular monolith
primary_language: TypeScript
frameworks: TanStack Start, React 19, Drizzle ORM, Zod, Vite
database: SQLite
files_reviewed: 31 source and governance files, plus repository-wide file and symbol maps
generated_on: 2026-06-29
audit_cycle: Not Provided
```

## Scope

Reviewed repository structure; character, campaign, party, rules, persistence, API, authentication-boundary, frontend, and builder areas; character V2/V3 experiments; database schema; persistence gateways; sync architecture; all 22 architecture red flags; `PROJECT_CONTEXT.md`; finding governance documents; and ADR-001 through ADR-005.

## Out Of Scope

Gameplay correctness, campaign workflow validation, security review, code quality review, testing review, operational readiness review, and deployment review are outside this audit.

## Executive Summary

Party Stats Hub has a recognizable modular-monolith shape and a promising data-driven rules compendium. The isolated V3 character work also demonstrates strong architectural intent around exact rule identity, provenance, revisions, and authored facts. The production architecture, however, has not yet converged on those boundaries. Character state is represented simultaneously by JSON columns, normalized child tables, raw compiled payloads, files, and synchronized KV values. Campaign application code directly reassigns and creates character records, while `native-engine.ts` combines rule adaptation, sheet compilation, server endpoints, and persistence coordination.

The greatest immediate architectural need is to establish one production character authority and route all character mutation through it. This should precede connecting V3 to production. The architecture can support the current small self-hosted product, but active native-authority goals remain risky until persistence ownership and write boundaries are explicit.

## Repository Map

```text
Full-stack TanStack Start application
├── Presentation and routes
│   ├── src/routes                 Page loaders, server routes, API handlers
│   ├── src/components/party       Party, character sheet, combat, session UI
│   └── src/components/builder     Native character builder UI
├── Character systems
│   ├── src/lib/dndbeyond.*        External character import and parsing
│   ├── src/lib/native-engine.ts   Native compilation, API and persistence coordination
│   ├── src/lib/character-v2       Versioned prototype aggregate/store
│   └── src/lib/character-v3       Isolated aggregate hardening experiment
├── Rules and content
│   ├── src/lib/rules              Choice/grant mechanics and adapters
│   ├── src/lib/modifiers          Character modifier transforms
│   ├── src/lib/forge              Content indexing/source policy
│   ├── src/pipeline               Content ingestion and seeders
│   └── src/data                   SRD/raw/source snapshots
├── Campaign and party
│   ├── src/lib/campaign-fns.ts    Campaign lifecycle/membership/character assignment
│   ├── src/lib/party.ts           Party character resolution
│   └── src/lib/party-config.ts    Default party configuration
└── Persistence and shared infrastructure
    ├── src/db/schema.ts           Compendium, identity, campaign and character schema
    ├── src/lib/db*.ts             SQLite access and broad query gateway
    ├── src/lib/sync-engine.ts     Browser-to-KV synchronization
    └── src/lib/auth*.ts           Session/authentication boundary
```

Core subsystems are Character, Rules/Content, Campaign/Party, and Persistence. Supporting subsystems include authentication, Notion, content pipelines, and UI. Highest-change and highest-risk areas are native character authority, schema/persistence convergence, and campaign-character assignment.

## Domain Model

| Concept | Current owner | Relationships and responsibilities |
|---|---|---|
| User | Authentication/persistence | One user has sessions; may own campaigns and characters; may join campaigns. |
| Campaign | `campaign-fns.ts` + `campaigns` table | One `dmUserId`; many members; many optional character references. |
| Character | Split across `characters`, child tables, `native-engine.ts`, DDB payloads, V2/V3 | Optional campaign and owner in production; owns build/live facts conceptually, but current persistence authority is ambiguous. |
| Party | `party.ts`, cookies/local storage, campaign character query | A view/composition of character IDs rather than an independent persisted aggregate. |
| Rules content | Compendium tables, pipelines, rules adapters | Version/source-bearing content definitions used to compile character views. |
| Inventory, spells, choices, classes | Character-related state | Stored both inside character JSON/raw payloads and in child tables. |
| Live state | Character row plus synchronized KV | HP and several resource fields exist on the character row; UI state also lives under KV keys. |
| Session notes/combat/encounters | Party UI + synchronized KV | Collaboration-support state represented primarily as opaque keyed values. |

Production lifecycle is visible for campaign creation/joining and character create/update/reassignment. Archival is not represented. Deletion semantics exist through foreign keys but were not treated as workflow findings.

## Aggregate Analysis

### Character

- Intended root: Character.
- Owned state: identity, build choices, inventory, spells, conditions and live resources.
- Observed invariants: relational children cascade with character deletion; V3 validates exact rule references and revision-shaped state.
- Boundary problem: production writes bypass a single aggregate workflow and update parallel representations.
- Complexity: Very Large in the production coordination path; Large but explicitly structured in V3.

### Campaign

- Intended root: Campaign.
- Owned state: metadata, DM/owner reference, membership and campaign lifecycle.
- Observed invariant: `dmUserId` is non-null; memberships have a compound key.
- Boundary problem: campaign code directly creates and reassigns Character records.
- Complexity: Medium.

### Party

- Current shape: read/composition model, not an independent aggregate.
- State sources: active campaign, party-ID cookie/local storage, and defaults.
- Complexity: Small structurally, but its ownership semantics overlap campaign composition.

### User

- Root for authentication identity and sessions.
- Relationships are explicit through foreign keys.
- Aggregate complexity: Small.

## Architectural Strengths

- The repository has discoverable functional areas rather than a single undifferentiated application folder.
- SQLite foreign keys make campaign membership and most character child relationships explicit.
- Rules content is substantially data-driven through compendium tables and adapters, providing a credible base for additional content.
- V3 uses strict schemas, exact versioned rule references, provenance, explicit decisions, and build revisions.
- Campaign deletion detaches production characters (`onDelete: set null`) instead of deleting them.
- Proposed ADRs clearly separate Character, Campaign, Party, Rules, and Content responsibilities and honestly identify their non-authoritative status.

## Architectural Weaknesses

- Production character persistence has multiple overlapping representations with no declared canonical projection contract.
- Campaign services cross the aggregate boundary to mutate and create characters.
- Native compilation, content adaptation, persistence and server endpoints are centralized in one module.
- Mutable live-state ownership is split between typed character columns and opaque synchronized KV keys.
- Production schemas and experimental schemas express incompatible lifecycle assumptions, particularly optional versus required campaign membership.

## Domain Boundary Assessment

- **Character:** Conceptually central but operational ownership is split. DDB import, the native engine, relational tables, raw JSON, V2, V3 and KV live state all represent parts of the domain.
- **Campaign:** Metadata and membership are explicit. Its application service exceeds its boundary by directly writing Character state.
- **Party:** Functions as a projection over campaigns and character IDs. It does not currently satisfy the independent Party domain described by proposed ADR-005; this is acceptable for current scope.
- **Rules:** Data-driven definitions and adapters are visible. Production compilation is coupled to character persistence through `native-engine.ts`.
- **User:** Schema relationships are explicit. Permission correctness belongs to other agents.
- **Inventory/live state:** Ownership is structurally ambiguous because both aggregate-shaped rows and UI/KV records can carry mutable state.

## Service Architecture Assessment

`campaign-fns.ts` has moderate cohesion around campaigns until `updateCampaignCharactersFn`, which performs character detachment, reassignment, DDB loading, transformation and insertion. `native-engine.ts` has high dependency count and weak overall cohesion: it imports UI-facing `PartyMember` types, rules adapters, filesystem APIs, server-function APIs, database modules and compilation data. `db-functions.ts` is a broad read gateway for content and builder queries; its breadth is a lower-risk organizational concern because most methods share a persistence-read responsibility. Generic utilities were investigated, but no separate official utility-dumping-ground finding met the impact gate.

## Data Model Assessment

Campaign, membership, session and user relationships are explicit. Character ownership and campaign references are nullable in the production schema, consistent with independent character lifecycle but weaker than the proposed one-owner invariant. More importantly, the character row contains `classesJson` and `inventoryJson` while corresponding `character_classes` and `character_inventory` tables also exist. Similar overlap exists for builder choices and spells via `builderStateJson`, `rawJson`, and child tables. Save code rewrites these independently without a transaction encompassing the entire projection update.

The V2 checkpoint store is explicitly a prototype and the V3 schema is explicitly isolated, so their existence is not itself a production duplicate-authority defect. The architectural risk is the unresolved transition contract between experiments and current production authority.

## Extensibility Assessment

- **Additional content:** Moderate to easy for schema-supported spells, classes, subclasses, items and features because ingestion and adapter layers are data-driven.
- **Homebrew:** Partially supported architecturally. V3 models custom provenance and the compendium is data-driven, but user-authored ownership/publication workflows are later scope and should not be treated as missing defects.
- **Additional rulesets:** Difficult today. Core V3 refs fix `RULES_GENERATION` to `2024`, many adapters assume current D&D concepts, and no ruleset boundary is implemented. This is roadmap context, not a current release finding.
- **Mobile/offline:** Current server functions plus browser KV state would require a defined synchronization and conflict model.
- **Combat/encounters:** Already integrate as party UI/KV features, though their durable domain ownership is not yet explicit.
- **Marketplace/VTT/real-time:** Later possibilities would benefit from a content ownership boundary and stable aggregate APIs; current production write paths are not ready for those integrations.

## Scalability Assessment

Runtime scale is not the concern for the current small deployment. Structural complexity will grow poorly if every new character capability is projected into raw JSON, relational children, compiled payloads and KV keys. New product domains can be added within the modular monolith, but only if they integrate through explicit Character and Campaign application boundaries. The V3 direction improves ownership scaling; connecting it before selecting canonical persistence would instead add another authority.

## Architecture Red Flag Assessment

### Triggered Red Flags

| Red flag | Evidence | Impact | Recommendation | Finding |
|---|---|---|---|---|
| RF-001 Unclear Domain Ownership | Character state spans schema JSON, child tables, raw payloads and KV. | Mutations lack one discoverable owner. | Declare canonical Character persistence and projections. | ARC-001, ARC-004 |
| RF-002 Shared Business Logic | Native compilation and persisted projections coexist with DDB parsing and UI live-state transforms. | Evolution risks divergent representations. | Route transforms through owned character workflows. | ARC-001 |
| RF-003 Cross-Domain Writes | `campaign-fns.ts:238-306` updates/inserts characters. | Campaign changes bypass Character ownership. | Introduce Character assignment/import commands. | ARC-002 |
| RF-007 God Service | `native-engine.ts` is 2,023 lines and spans calculation, adapters, filesystem, server API and persistence. | Centralized change coupling. | Split by application, compilation and repository responsibilities. | ARC-003 |
| RF-009 Service Overlap | Campaign and native services both create/update character persistence. | Multiple write authorities. | One Character application boundary. | ARC-002 |
| RF-010 Ambiguous Ownership | KV live state and typed character fields overlap. | Domain ownership and lifecycle are unclear. | Model live state under Character or an explicit projection. | ARC-004 |
| RF-011 Denormalized Critical Data | `classesJson` plus `character_classes`; `inventoryJson` plus `character_inventory`; raw/builder JSON plus child tables. | Divergence is structurally possible. | Canonical representation plus transactional projections. | ARC-001 |
| RF-012 Hidden Relationships | KV keys encode character/resource relationships as strings. | Referential integrity and ownership are implicit. | Persist typed, scoped records or document KV as disposable projections. | ARC-004 |
| RF-017 Central Coordination Service | `native-engine.ts` coordinates most native character concerns. | It becomes a bottleneck for native-authority work. | Establish narrow ports and workflows. | ARC-003 |
| RF-021 Legacy Compatibility Everywhere | DDB payload, native row, raw JSON, V2 migration and V3 migration coexist. | Transition complexity is significant. | Publish and execute a bounded migration/retirement plan. | Observation |
| RF-022 Architecture Requires Tribal Knowledge | Canonical status of parallel character representations is not encoded in interfaces or schema. | New contributors cannot infer authoritative writes safely. | Record an accepted persistence ADR and enforce boundaries. | ARC-001 |

### Notable Non-Triggered Red Flags

- RF-005 Unbounded Aggregate Growth: no persisted campaign/session collection aggregate was found.
- RF-006 Circular Aggregate Dependencies: references exist, but no evidence of mutually required aggregate construction was found.
- RF-013 Hardcoded Content: significant content is stored in tables/data; isolated rule-specific adapters do not prove the whole content model is hardcoded.
- RF-015 No Homebrew Path: V3 custom provenance and data-driven content provide a partial architectural path; creation workflows are later scope.
- RF-018 Architecture Cannot Support Future Features: future work would require boundary hardening, but evidence does not establish that major redesign is unavoidable.
- RF-019 Ownership Model Undefined: production fields define campaign and character ownership structurally, even though enforcement/workflows require separate audits.

### Requires Investigation

- RF-004 God Aggregate: V3 is large, but strict submodels and its experimental status prevent concluding it is a god aggregate.
- RF-014 Feature-Specific Architecture: rule-specific modules may be appropriate adapters; broader content-extension tests are needed.
- RF-016 Complexity Scales With Data Size: no runtime/data-growth evidence was reviewed.
- RF-020 Permission Logic Embedded Everywhere: likely relevant but belongs primarily to security/campaign audits.

### Converted To Findings

RF-001, RF-002, RF-003, RF-007, RF-009, RF-010, RF-011, RF-012, RF-017 and RF-022 contributed to ARC-001 through ARC-004. No red flag alone was used as evidence.

## ADR Assessment

| ADR | Status | Implementation assessment |
|---|---|---|
| ADR-001 Character Domain Model | Proposed | Partially implemented. Production has a Character root/table and independent campaign deletion semantics, but state authority is duplicated. V3 strongly reflects the proposed model while requiring `campaignId`, a conflict the ADR itself acknowledges. |
| ADR-002 Campaign Ownership Model | Proposed | Partially implemented. `campaigns.dmUserId` is non-null and memberships are separate; mature transfer/recovery flows are later scope. |
| ADR-003 Rules Engine Strategy | Proposed | Partially implemented. Rules adapters and calculation functions exist, but calculation and character persistence share `native-engine.ts`. |
| ADR-004 Homebrew Strategy | Proposed | Partially implemented. Content is substantially data-driven and V3 supports custom refs; user-authored content is later scope. |
| ADR-005 Party Collaboration Model | Proposed | Not implemented as an independent domain, explicitly consistent with its stated later-roadmap status. |

Architectural drift is most evident between the proposed single Character authority and current parallel production representations. Missing accepted decisions include: canonical character persistence, projection/cache policy, live-state ownership, and the V2/V3 production migration/retirement strategy.

## Data Integrity Risks

- **Character integrity:** Parallel JSON and relational representations can diverge; no schema-level mechanism declares which wins.
- **Campaign integrity:** Campaign-character assignment is implemented as direct multi-row mutation rather than an aggregate command boundary.
- **Party integrity:** Party composition may be derived from campaign rows, cookies, local storage or defaults depending on context.
- **Ownership integrity:** Production owner and campaign links are explicit fields, but mutable live state in global KV keys lacks explicit relational ownership.

## Findings Summary

```text
Critical: 0
High: 1
Medium: 3
Low: 0
Info: 0
```

## Top Findings

1. ARC-001 — Parallel character persistence models lack a canonical source of truth (High, High confidence).
2. ARC-002 — Campaign workflows directly create and reassign Character aggregate state (Medium, High confidence).
3. ARC-004 — Character live state is persisted through opaque globally synchronized KV keys (Medium, High confidence).
4. ARC-003 — Native character compilation and persistence are centralized in one coordination module (Medium, High confidence).

## Detailed Findings

### ARC-001

```yaml
id: ARC-001
title: Parallel character persistence models lack a canonical source of truth
severity: High
confidence: High
owner: Architecture & Data Model Agent
status: Open
lifecycle: New
first_detected: 2026-06-29
last_reviewed: 2026-06-29
category:
  - Architecture
  - Data Model
  - Persistence Design
  - Architecture Red Flag
location:
  file: src/db/schema.ts
  line: 835
description: >
  The production character record stores classes, inventory, builder state, and a raw compiled payload as JSON while normalized child tables store classes, choices, inventory, spells, sources, and overrides. The save workflow updates the row and then independently deletes and recreates child projections. The repository does not declare which representation is authoritative or enforce projection consistency transactionally.
impact: >
  A partial write, a new write path, or future V3 integration can leave two valid-looking representations of the same character fact. This directly blocks the active goal of trustworthy, reproducible native character authority and creates meaningful character-integrity risk.
recommendation: >
  Select and document one canonical Character persistence model before production V3 integration. Treat all other forms as named projections or caches, update them within one transaction or rebuild them deterministically, and expose writes only through a Character repository/application boundary.
notes: "Registry checked: existing current-cycle finding ID ARC-001 reused. Proposed ADR-001 supports this direction but was not used to dismiss current evidence."
evidence:
  files:
    - src/db/schema.ts
    - src/lib/native-engine.ts
  symbols:
    - characters
    - characterClasses
    - characterChoices
    - characterInventory
    - characterSpells
    - saveNativeCharacter
  lines:
    - "src/db/schema.ts:835-866"
    - "src/db/schema.ts:927-985"
    - "src/lib/native-engine.ts:1750-1885"
  observed_behavior: >
    Character classes and inventory are stored in JSON columns and normalized tables; builder/raw JSON overlaps choices and spells. Save code writes the character row and then separately clears and repopulates child tables.
  expected_behavior: >
    One representation owns authored and mutable character facts; secondary representations have explicit projection semantics and cannot diverge from the authority.
  rationale: >
    The duplicated fields represent the same business facts and are written independently. There is no canonical marker, version linkage, or encompassing transaction visible in this workflow.
  reproduction:
    - Inspect overlapping columns and child tables in src/db/schema.ts.
    - Trace saveNativeCharacter through its row upsert and subsequent child-table rewrites.
```

### ARC-002

```yaml
id: ARC-002
title: Campaign workflows directly create and reassign Character aggregate state
severity: Medium
confidence: High
owner: Architecture & Data Model Agent
status: Open
lifecycle: New
first_detected: 2026-06-29
last_reviewed: 2026-06-29
category:
  - Architecture
  - Domain Boundaries
  - Aggregate Design
  - Architecture Red Flag
location:
  file: src/lib/campaign-fns.ts
  line: 210
description: >
  updateCampaignCharactersFn directly detaches all removed characters, assigns existing characters, fetches D&D Beyond data, maps character fields, and inserts new Character records from the Campaign service boundary.
impact: >
  Character creation and lifecycle invariants can be bypassed by campaign changes. As native character authority becomes stricter, every Character invariant must be duplicated in or leaked into the Campaign service, increasing coupling and migration risk.
recommendation: >
  Keep campaign composition in the Campaign application service but delegate Character import, creation, assignment and detachment to explicit Character commands/repository methods. Define whether campaign membership is Character metadata or a separate relationship and enforce it in one owner.
notes: "Registry checked: existing current-cycle finding ID ARC-002 reused. Proposed ADR-001 and ADR-002 describe the intended separation; both remain proposed."
evidence:
  files:
    - src/lib/campaign-fns.ts
    - src/db/schema.ts
  symbols:
    - updateCampaignCharactersFn
    - characters
  lines:
    - "src/lib/campaign-fns.ts:210-315"
    - "src/db/schema.ts:835-866"
  observed_behavior: >
    A Campaign server function updates characters.campaignId, imports external Character data, maps build/live fields and inserts Character rows directly.
  expected_behavior: >
    Campaign workflows coordinate membership while Character-owned workflows enforce creation and mutation invariants.
  rationale: >
    The service crosses a clear aggregate boundary and owns knowledge of the Character persistence shape, creating an evidenced dependency and write-authority overlap.
  reproduction:
    - Call updateCampaignCharactersFn with a changed ID list and trace direct Character updates/inserts.
```

### ARC-003

```yaml
id: ARC-003
title: Native character compilation and persistence are centralized in one coordination module
severity: Medium
confidence: High
owner: Architecture & Data Model Agent
status: Open
lifecycle: New
first_detected: 2026-06-29
last_reviewed: 2026-06-29
category:
  - Architecture
  - Service Design
  - Technical Debt
  - Scalability
  - Architecture Red Flag
location:
  file: src/lib/native-engine.ts
  line: 1
description: >
  native-engine.ts is a 2,023-line module that imports presentation-facing PartyMember types, rules adapters, filesystem APIs, TanStack server functions, validation, database access, character compilation and persistence projection logic.
impact: >
  Native-authority changes require coordinated edits across calculation, API, persistence and compatibility responsibilities. This central module becomes the architectural bottleneck for adding character capabilities or replacing persistence with V3.
recommendation: >
  Preserve behavior while separating a pure compiler, Character application commands, repository adapters, and DDB compatibility mappers. Keep server functions as thin entry points and make projection construction explicit.
notes: "This is an architectural responsibility finding, not a code-size/style finding. Registry checked: existing current-cycle finding ID ARC-003 reused."
evidence:
  files:
    - src/lib/native-engine.ts
  symbols:
    - createNativePartyMember
    - saveNativeCharacter
    - getNativeCharacter
    - computeCharacterSnapshot
  lines:
    - "src/lib/native-engine.ts:1-18"
    - "src/lib/native-engine.ts:1750-1925"
    - "src/lib/native-engine.ts:1960-2023"
  observed_behavior: >
    One module owns rule/content adaptation, sheet construction, server endpoints, filesystem fallback, SQLite persistence and projection rewriting.
  expected_behavior: >
    Calculation, application orchestration and infrastructure are independently owned behind narrow interfaces.
  rationale: >
    The dependency set and concrete responsibilities demonstrate central coordination rather than merely a large cohesive algorithm.
  reproduction:
    - Inspect imports and exported server/compiler functions in src/lib/native-engine.ts.
```

### ARC-004

```yaml
id: ARC-004
title: Character live state is persisted through opaque globally synchronized KV keys
severity: Medium
confidence: High
owner: Architecture & Data Model Agent
status: Open
lifecycle: New
first_detected: 2026-06-29
last_reviewed: 2026-06-29
category:
  - Architecture
  - Data Model
  - Persistence Design
  - Domain Boundaries
  - Architecture Red Flag
location:
  file: src/routes/api/sync.ts
  line: 44
description: >
  Character HP, spell slots, class resources, conditions, inventory overrides and feature state are persisted by UI hooks under string-encoded keys and synchronized into a generic key/value table. The same domain also has typed live-state columns on characters.
impact: >
  Relationships, ownership, lifecycle and referential integrity are hidden in key names. Character deletion, reassignment, migration and future offline/collaboration work cannot reason about this state through the Character model, and typed fields can disagree with KV values.
recommendation: >
  Classify each KV value as disposable UI preference or authoritative domain state. Move authoritative character live state behind a typed Character live-state repository with explicit character/campaign scope, revision semantics and lifecycle behavior; retain KV only for non-authoritative preferences or documented projections.
notes: "Security and authorization behavior were not evaluated. Registry checked: existing current-cycle finding ID ARC-004 reused."
evidence:
  files:
    - src/db/schema.ts
    - src/routes/api/sync.ts
    - src/lib/sync-engine.ts
    - src/components/party/character-detail/hooks.ts
    - src/components/party/CombatDashboard.tsx
  symbols:
    - kvStore
    - CharacterDetail hooks
    - initSyncEngine
  lines:
    - "src/db/schema.ts:803-807"
    - "src/db/schema.ts:853-863"
    - "src/routes/api/sync.ts:44-93"
    - "src/lib/sync-engine.ts:91-153"
    - "src/components/party/character-detail/hooks.ts:138-167"
    - "src/components/party/character-detail/hooks.ts:368-385"
    - "src/components/party/character-detail/hooks.ts:488-505"
    - "src/components/party/CombatDashboard.tsx:38-140"
  observed_behavior: >
    Allowed key prefixes are synchronized generically, while UI modules define character-specific key formats and store mutable gameplay state; the character table separately stores HP and expended-resource data.
  expected_behavior: >
    Authoritative live state has a typed owner, explicit entity relationship, and one persistence authority; generic KV stores only disposable preferences or clearly scoped projections.
  rationale: >
    The repository visibly persists mutable character facts in two structural models, and the KV schema cannot enforce or expose their entity relationships.
  reproduction:
    - Change HP or resource state in character detail/combat UI and trace the generated key through /api/sync to kv_store.
```

## Observations

```yaml
observation:
  title: V3 requires campaign membership despite independent-character direction
  owner: Architecture & Data Model Agent
  category: Aggregate Design
  location: src/lib/character-v3/schema.ts:534-543
  evidence: CharacterIdentitySchema requires campaignId; production characters.campaignId is nullable; ADR-001 explicitly says the V3 requirement must become optional or the ADR revised.
  reason_not_finding: V3 is an isolated hardening experiment and not production persistence, so current user or production impact is not established.
  recommended_validation: Resolve the lifecycle decision before accepting ADR-001 or connecting V3 to production routes.
```

```yaml
observation:
  title: Legacy-to-native migration has no accepted retirement boundary
  owner: Architecture & Data Model Agent
  category: Architecture
  location: Multiple Files
  evidence: DDB imports, production raw JSON, cache-file fallback, V2 checkpoints and V3 migration code coexist.
  reason_not_finding: Project context describes an active staged migration, and coexistence is expected during that work; no missed milestone or production failure was established.
  recommended_validation: Record entry/exit gates and delete/retire each compatibility path when its gate is met.
```

## Not A Findings

```yaml
not_a_finding:
  title: Party is not an independent aggregate
  reason: Current product scope uses Party as visibility/composition; ADR-005 explicitly describes an unimplemented later collaboration model.
  evidence_reviewed: src/lib/party.ts, src/components/party, PROJECT_CONTEXT.md
  adr_reviewed: ADR-005
  notes: Reassess only when independent party lifecycle becomes an implemented requirement.
```

```yaml
not_a_finding:
  title: User-authored homebrew workflows are absent
  reason: PROJECT_CONTEXT.md and ADR-004 classify publishing, ownership and sharing as later possibilities, not current release requirements.
  evidence_reviewed: Compendium schema, pipeline, rules adapters, V3 ExactRuleRef custom provenance
  adr_reviewed: ADR-004
  notes: The architecture has a partial data-driven path.
```

## Quick Wins

- Add a short accepted-or-proposed persistence ADR naming the current Character authority and every projection/cache.
- Stop adding new direct writes to `characters` outside one Character repository module.
- Wrap the existing character row and child-table projection update in one transaction.
- Inventory KV key families and label each as preference, cache, or authoritative state.
- Make V3 `campaignId` optional, or explicitly revise the independent-character decision before production wiring.

## Recommended Architecture Roadmap

### Immediate

1. Decide canonical production Character persistence and document projection semantics.
2. Place all current Character writes behind a single application/repository boundary.
3. Make compound character persistence atomic before adding V3 production writes.

### Short-Term

1. Extract pure compilation from `native-engine.ts`; keep server and repository adapters at the edge.
2. Replace campaign direct Character writes with assignment/import commands.
3. Move authoritative HP/resources/conditions/inventory state out of generic KV storage or explicitly make the KV forms disposable projections.
4. Define V2/V3 migration gates, compatibility duration and retirement criteria.

### Long-Term

1. Accept or revise ADR-001 through ADR-004 after production gates are demonstrated.
2. Introduce explicit content ownership/versioning when user-authored homebrew becomes committed scope.
3. Add ruleset identity at content and aggregate boundaries before supporting another game system.
4. Design revision/conflict semantics before mobile, offline or real-time collaboration work.

## Ownership Referrals

Observation:
`campaign-fns.ts` derives a default user and campaign selection/character mutation paths warrant authorization validation.

Refer To:
Code Quality & Reliability Agent and Campaign & Collaboration Agent

Reason:
Authentication/authorization correctness and campaign permission behavior are outside Architecture ownership.

No finding created.

Observation:
Rules and character calculation logic exists across DDB parsing, modifier modules, native compilation and V3 reconciliation.

Refer To:
D&D Domain Agent

Reason:
Whether the implementations produce duplicated or inconsistent gameplay outcomes requires rules-correctness analysis.

No finding created.

Observation:
Character persistence performs multiple writes and catches database errors before returning success-path values.

Refer To:
Code Quality & Reliability Agent

Reason:
Failure behavior, transaction reliability, recovery and testing are outside this architecture audit.

No finding created.

## Confidence Assessment

**High.** Evidence includes repository-wide mapping, line-level review of production schema and write paths, the V2/V3 experiments, sync design, all required governance documents, and every available ADR. Confidence is limited by the absence of accepted ADRs, runtime workflow observation, and production data samples. Later roadmap capabilities were deliberately not converted into defects.

## Release Impact

**Significant Impact.** Current small-party workflows can continue, but the High finding materially affects the active native-character-authority milestone. Production V3 wiring should not proceed until canonical character persistence and write ownership are decided. This architecture audit alone does not declare the current release blocked.

## Architecture Score

**Architecture Score: 5/10 — Concerning.** The repository has solid emerging foundations and clear proposed intent, but production character authority, persistence and domain writes remain structurally unresolved.

## Final Recommendation

**Requires Remediation.** The modular-monolith direction is viable; remediation should converge existing character authority and boundaries rather than redesign the whole repository.

# Overall Assessment

The architecture is understandable at repository scale and contains a credible data-driven rules/content foundation. It is not yet safe for the active native-authority transition because production Character ownership is distributed across persistence shapes and services.

# Top Risks

1. Parallel character representations can diverge and undermine reproducibility.
2. Campaign and native services both act as Character write authorities.
3. Opaque KV live state hides lifecycle and referential relationships.
4. `native-engine.ts` centralizes change across too many architectural layers.

# Recommended Next Actions

Choose the canonical Character store, make projections transactional, establish one Character write boundary, then integrate V3 through that boundary. In parallel, classify KV state and extract compilation from infrastructure concerns.

# Confidence

High, with limitations around runtime behavior and the absence of accepted architectural decisions.

# Release Impact

Significant Impact for the native-character-authority milestone; not independently release blocking for the current small self-hosted product.
