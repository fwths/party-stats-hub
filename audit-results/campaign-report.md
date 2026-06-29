# Campaign & Collaboration Audit

```yaml
report_name: Campaign & Collaboration Audit
report_type: Campaign Workflow Review
generated_by: Campaign & Collaboration Agent
generated_on: 2026-06-30
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
frameworks: TanStack Start, React 19, Drizzle ORM, Zod, Vite, Vitest
database: SQLite
files_reviewed: 14 source and governance files, plus campaign/collaboration symbol search
generated_on: 2026-06-30
audit_cycle: Not Provided
```

## Scope

Reviewed campaign creation, campaign listing, raw-ID campaign joining, active campaign selection, active campaign lookup, campaign-character assignment, party management UI, shared sync state, session notes, campaign schema relationships, `CAMPAIGN_SCENARIOS.md`, `PROJECT_CONTEXT.md`, `FINDING_SCHEMA.md`, `SEVERITY_MATRIX.md`, `FINDINGS_REGISTRY.md`, `REPORT_TEMPLATE.md`, and `audit-results/architecture-report.md`.

## Out Of Scope

Gameplay rules correctness, character calculation correctness, architecture design except as context, authentication/session vulnerability analysis, infrastructure, backups, performance optimization, and general maintainability are outside this audit unless they directly affect campaign and collaboration workflows.

## Executive Summary

Party Stats Hub has useful small-table campaign foundations: campaigns have a required DM owner, campaign membership has a compound key, the creator is inserted as a member, active campaigns can be selected, and campaign deletion detaches characters rather than cascading character loss.

The collaboration workflows are still fragile. Membership can be created from a raw campaign ID, party updates use full-list replacement that can detach omitted characters, shared campaign state is last-writer-wins, and ownership transfer/recovery is not available. The strongest newly validated workflow risk is that active campaign lookup and party mutation trust the `active_campaign_id` cookie without validating membership or DM authority for that campaign. For a trusted self-hosted table this may be workable, but it is not robust enough for broader multi-user campaign collaboration.

## Campaign Health Score

**4/10.** Basic campaign workflows exist, but permission workflow validation, membership governance, assignment safety, collaborative editing, and long-running ownership continuity need remediation.

## Scenario Coverage Assessment

| Scenario Area | Coverage Assessment |
|---|---|
| Campaign Creation | Partially covered: owner and creator membership are created. No transaction/rollback review was performed. |
| Campaign Update | Not observed as a general workflow beyond character assignment and active selection. |
| Campaign Archive/Delete | No archive/delete product workflow observed. Schema uses cascading campaign membership deletion and character `campaignId` set-null. |
| Ownership Transfer/Recovery | Not implemented; recorded as roadmap/current-scope ownership observation per registry calibration. |
| Invitations | Not implemented; raw-ID join exists instead. |
| Party Membership | Implemented as campaign character assignment plus local/default party state, but full-list replacement is unsafe. |
| Character Assignment | Implemented through `updateCampaignCharactersFn`; explicit add/remove and revision semantics are missing. |
| Collaboration | Implemented through generic KV/localStorage sync without revisions or merge behavior. |
| Sessions/Notes | Scratchpad notes exist as one shared key with local history snapshots, not conflict-aware session documents. |
| Permissions | Active selection checks membership/DM, but active lookup and party mutation do not revalidate the cookie-selected campaign. |

## Campaign Assessment

`createCampaignFn` assigns `dmUserId`, inserts the creator into `campaignMembers`, and sets an active campaign cookie. `getCampaignsFn` lists campaigns where the current user is DM or member. `selectActiveCampaignFn` validates membership or DM status before setting the cookie. These are good foundations.

Campaign lifecycle management remains incomplete for long-running campaigns. I found no archive, delete, member removal, role change, ownership transfer, or recovery workflow in the reviewed campaign functions and selector UI.

## Party Assessment

Party state is a composition of active campaign characters, `mob.partyIds.v1`, browser local storage, cookies, and default configured D&D Beyond IDs. In active campaign mode, `updateCampaignCharactersFn` treats a submitted ID list as the full desired campaign party and detaches omitted existing campaign characters. This is efficient for a small trusted table but risky for stale clients, accidental resets, or concurrent edits.

## Ownership Assessment

Campaign ownership is structurally explicit through `campaigns.dmUserId`, and character ownership exists through `characters.ownerUserId`. Ownership transfer, owner leaving, role changes, and owner account recovery were not found. Per `PROJECT_CONTEXT.md` and the Director-calibrated registry, owner transfer is best treated as an Info-level roadmap/workflow gap for the current small self-hosted scope, not a Medium defect.

## Permission Workflow Assessment

`selectActiveCampaignFn` checks membership or DM status before writing the active campaign cookie. However, `getActiveCampaignFn` returns any campaign named by that cookie, and `updateCampaignCharactersFn` mutates characters for the cookie campaign without checking that the current user is a member or DM. That means the workflow has one guarded entry point but unguarded subsequent use of the active campaign identifier. Authentication and session-hardening implications belong to Code Quality; the campaign-owned issue is inconsistent permission workflow enforcement.

## Collaboration Assessment

Shared notes, party IDs, conditions, HP/resources, combat state, and other `party-stats:` keys sync through a generic KV endpoint. The client initializes by treating server values as source of truth and writes changed local keys back without document revision, merge, or conflict prompts. This creates silent overwrite risk for simultaneous session-note edits and party-wide combat/rest state changes.

## Dungeon Master Experience Assessment

The DM can create/select campaigns, copy an ID, and manage visible party characters. DM administration is otherwise thin: no invite management, pending join approvals, member removal, role management, owner transfer, archive, or campaign recovery workflow was found. The Manage Party dialog also exposes "Reset to defaults", which can be convenient but dangerous when routed into campaign assignment replacement.

## Player Experience Assessment

Joining is simple but opaque: players paste a raw UUID rather than accepting an invitation with readable status, expiration, or role. Character ownership and campaign assignment are not surfaced as clear player concepts. Errors exist for not-found joins, duplicate character IDs, and invalid character input, but the workflow does not explain membership state or approval.

## Accessibility Observations

No WCAG review was performed. High-level concerns are workflow discoverability and cognitive load: raw UUID campaign joining, hidden ownership state, and destructive party replacement make it harder for users to understand what state they are changing.

## Mobile Workflow Observations

No mobile screenshots were run. The reviewed flows depend on modal dialogs and dense party/session controls. Joining a campaign by pasting a UUID and managing a full party list may be awkward on small screens and should be validated once the workflow semantics are hardened.

## Data Integrity Risks

- Party replacement can detach every active campaign character if an empty or stale ID list is submitted.
- Active campaign mutation can run against a cookie-selected campaign without membership/DM revalidation.
- Shared notes and combat state can silently overwrite concurrent edits.
- Owner account loss has no visible recovery workflow.
- Imported D&D Beyond IDs and local/default party IDs can blur whether visible characters are truly campaign-assigned.

## Collaboration Risks

- Simultaneous session-note edits use last-writer-wins behavior.
- Party-wide rest/combat actions update shared keys without expected revisions.
- Raw-ID joins provide weak DM governance and unclear player onboarding.
- Active campaign state is split between database membership, cookies, and local party IDs.

## Findings Summary

```text
Critical: 0
High: 3
Medium: 1
Low: 0
Info: 1
```

## Top Findings

1. CMP-005 - Active campaign party mutation does not revalidate campaign membership or DM authority (High, High confidence).
2. CMP-001 - Campaign membership can be created by raw campaign ID without an invitation workflow (High, High confidence).
3. CMP-002 - Party updates can detach active campaign characters through omitted ID lists (High, High confidence).
4. CMP-003 - Shared notes and campaign state use last-writer-wins synchronization without conflict handling (Medium, High confidence).
5. CMP-004 - Campaign ownership lacks transfer and recovery workflow (Info, High confidence).

## Detailed Findings

### CMP-005

```yaml
id: CMP-005
title: Active campaign party mutation does not revalidate campaign membership or DM authority
severity: High
confidence: High
owner: Campaign & Collaboration Agent
status: Open
lifecycle: New
first_detected: 2026-06-30
last_reviewed: 2026-06-30
category:
  - Campaign Management
  - Permissions
  - Party Management
  - Character Assignment
location:
  file: src/lib/campaign-fns.ts
  line: 173
description: >
  The active campaign selector validates membership or DM status before setting the cookie, but later active-campaign workflows trust the active_campaign_id cookie. getActiveCampaignFn returns the campaign for that cookie without checking the current user's membership, and updateCampaignCharactersFn mutates character campaign assignments for that cookie campaign without revalidating membership or DM authority.
impact: >
  Campaign permission behavior is inconsistent after selection. A stale, copied, or otherwise incorrect active campaign cookie can expose campaign context to the workflow and allow party assignment changes to run outside the validated selection path. This directly affects DM control and campaign integrity; broader authentication/session vulnerability analysis remains Code Quality ownership.
recommendation: >
  Centralize active campaign resolution in a helper that loads the current user, validates campaign membership or DM ownership, and returns an authorized campaign. Require that helper in getActiveCampaignFn and updateCampaignCharactersFn before any campaign-specific read or write.
notes: "Registry checked: no existing CMP finding covers post-selection active campaign revalidation. Related to COD-001, but this finding is limited to campaign permission workflow correctness."
evidence:
  files:
    - src/lib/campaign-fns.ts
    - src/db/schema.ts
  symbols:
    - selectActiveCampaignFn
    - getActiveCampaignFn
    - updateCampaignCharactersFn
    - campaignMembers
    - campaigns.dmUserId
  lines:
    - "src/lib/campaign-fns.ts:135-170"
    - "src/lib/campaign-fns.ts:173-203"
    - "src/lib/campaign-fns.ts:210-314"
    - "src/db/schema.ts:809-830"
  observed_behavior: >
    selectActiveCampaignFn validates membership/DM status, but getActiveCampaignFn only reads the campaign named by active_campaign_id and updateCampaignCharactersFn uses the same cookie to clear, set, or insert character campaign assignments without membership/DM checks.
  expected_behavior: >
    Every campaign-scoped read or write should validate that the current user is allowed to access or mutate that campaign at the point of use.
  rationale: >
    Permission checks at selection time do not protect later campaign workflows when the trusted state is a client-controlled cookie and write functions do not re-check membership.
  reproduction:
    - Inspect selectActiveCampaignFn membership/DM check.
    - Inspect getActiveCampaignFn and updateCampaignCharactersFn using active_campaign_id without equivalent validation.
```

### CMP-001

```yaml
id: CMP-001
title: Campaign membership can be created by raw campaign ID without an invitation workflow
severity: High
confidence: High
owner: Campaign & Collaboration Agent
status: Open
lifecycle: New
first_detected: 2026-06-29
last_reviewed: 2026-06-30
category:
  - Campaign Management
  - Campaign Membership
  - Permissions
  - Player Experience
location:
  file: src/lib/campaign-fns.ts
  line: 90
description: >
  The join workflow accepts a campaignId string, verifies that the campaign exists, and inserts the current user into campaignMembers if they are not already present. No invitation, expiration, DM approval, revocation, or role assignment workflow is represented.
impact: >
  DMs cannot govern campaign membership through product workflow. A shared or leaked campaign ID is enough to create a membership record, which undermines campaign control and makes player onboarding opaque.
recommendation: >
  Replace raw-ID joining with invitation records or DM-approved joins. Track inviter, target campaign, optional target user/email, expiration, status, revocation, and role. Keep duplicate membership prevention through the existing compound key.
notes: "Registry checked: existing CMP-001 reused. Security enforcement details belong to Code Quality."
evidence:
  files:
    - src/lib/campaign-fns.ts
    - src/components/party/CampaignSelector.tsx
    - src/db/schema.ts
  symbols:
    - joinCampaignFn
    - campaignMembers
    - Join Campaign by ID
  lines:
    - "src/lib/campaign-fns.ts:90-132"
    - "src/components/party/CampaignSelector.tsx:178-187"
    - "src/components/party/CampaignSelector.tsx:267-315"
    - "src/db/schema.ts:819-830"
  observed_behavior: >
    The UI exposes "Join Campaign by ID" and the server function inserts campaignMembers for an existing campaign ID.
  expected_behavior: >
    Campaign joining should be mediated by invitation, approval, or another DM-controlled workflow with clear status and expiration.
  rationale: >
    CAMPAIGN_SCENARIOS.md treats invitation acceptance, duplicate prevention, and expired invitations as high-priority collaboration scenarios.
  reproduction:
    - Use the Join Campaign modal with an existing campaign ID.
    - Trace joinCampaignFn inserting campaignMembers without invite-state checks.
```

### CMP-002

```yaml
id: CMP-002
title: Party updates can detach active campaign characters through omitted ID lists
severity: High
confidence: High
owner: Campaign & Collaboration Agent
status: Open
lifecycle: New
first_detected: 2026-06-29
last_reviewed: 2026-06-30
category:
  - Party Management
  - Character Assignment
  - Campaign Integrity
location:
  file: src/lib/campaign-fns.ts
  line: 210
description: >
  updateCampaignCharactersFn treats the submitted ID array as the full desired campaign party. It clears campaignId for all active campaign characters not included in the list, or for all active campaign characters when the list is empty.
impact: >
  A stale browser, local default reset, failed client merge, accidental remove action, or mistaken party edit can remove character assignments for the active campaign. Characters are preserved, but campaign party integrity and DM confidence can be damaged.
recommendation: >
  Use explicit add/remove character assignment commands, require confirmation for bulk removal, and include an expected campaign-party revision. Show a preview of characters being detached before applying the update.
notes: "Registry checked: existing CMP-002 reused. ARC-002 covers aggregate boundary concerns; this finding covers campaign workflow integrity."
evidence:
  files:
    - src/lib/campaign-fns.ts
    - src/routes/index.lazy.tsx
    - src/components/party/ManagePartyDialog.tsx
  symbols:
    - updateCampaignCharactersFn
    - updateCampaignMutation
    - ManagePartyDialog
  lines:
    - "src/lib/campaign-fns.ts:210-314"
    - "src/lib/campaign-fns.ts:238-253"
    - "src/routes/index.lazy.tsx:64-79"
    - "src/components/party/ManagePartyDialog.tsx:53-58"
    - "src/components/party/ManagePartyDialog.tsx:173-176"
  observed_behavior: >
    Any active campaign character not present in the submitted ID list is detached by setting campaignId to null; an empty list detaches all current campaign characters. The UI remove/reset paths call onChange with replacement lists.
  expected_behavior: >
    Character assignment/removal should be explicit, conflict-aware, and safe against stale full-list replacement.
  rationale: >
    Character assignment and party leave/dissolution are high-priority campaign scenarios because accidental detachment affects long-running party state.
  reproduction:
    - Submit updateCampaignCharactersFn with an empty or stale ID array for an active campaign.
    - Observe the update path clearing campaignId for current campaign characters.
```

### CMP-003

```yaml
id: CMP-003
title: Shared notes and campaign state use last-writer-wins synchronization without conflict handling
severity: Medium
confidence: High
owner: Campaign & Collaboration Agent
status: Open
lifecycle: New
first_detected: 2026-06-29
last_reviewed: 2026-06-30
category:
  - Collaboration
  - Session Management
  - Shared Resources
location:
  file: src/lib/sync-engine.ts
  line: 87
description: >
  The synchronization engine uploads localStorage keys to /api/sync and later applies server values as the source of truth. Session notes, notes history, combat state, HP/resources, conditions, and party IDs are represented as shared string keys without per-document revision or merge logic.
impact: >
  Two active users editing notes, combat state, or rest/resource data can silently overwrite one another. This risks lost session history and confusing campaign state during play.
recommendation: >
  Add revision metadata and conflict behavior for shared campaign documents. For notes, consider explicit save versions or per-session documents. For combat/rest state, use campaign-scoped commands with expected revision checks.
notes: "Registry checked: existing CMP-003 reused. Reliability of the transport belongs to Code Quality; this finding covers collaboration workflow safety."
evidence:
  files:
    - src/lib/sync-engine.ts
    - src/routes/api/sync.ts
    - src/components/party/session-notes/ScratchpadEditor.tsx
    - src/components/party/session-notes/types.ts
  symbols:
    - initSyncEngine
    - queueSync
    - NOTE_KEY
    - HISTORY_KEY
  lines:
    - "src/lib/sync-engine.ts:1-44"
    - "src/lib/sync-engine.ts:87-153"
    - "src/routes/api/sync.ts:44-93"
    - "src/components/party/session-notes/types.ts:23-25"
    - "src/components/party/session-notes/ScratchpadEditor.tsx:96-113"
    - "src/components/party/session-notes/ScratchpadEditor.tsx:124-137"
  observed_behavior: >
    Client localStorage values are batched to a generic sync endpoint, initial load writes server values into localStorage, and notes are autosaved to NOTE_KEY with local history snapshots.
  expected_behavior: >
    Shared campaign notes and combat/session state should preserve concurrent edits or surface conflicts instead of replacing state silently.
  rationale: >
    CAMPAIGN_SCENARIOS.md identifies simultaneous shared notes editing and simultaneous campaign updates as high-priority collaboration risks.
  reproduction:
    - Open the scratchpad on two clients.
    - Edit both before synchronization settles.
    - The later key write becomes the shared value without merge or conflict prompt.
```

### CMP-004

```yaml
id: CMP-004
title: Campaign ownership lacks transfer and recovery workflow
severity: Info
confidence: High
owner: Campaign & Collaboration Agent
status: Open
lifecycle: New
first_detected: 2026-06-29
last_reviewed: 2026-06-30
category:
  - Campaign Management
  - Ownership
  - DM Experience
location:
  file: src/db/schema.ts
  line: 809
description: >
  Campaigns have a required dmUserId, but no product workflow was found for owner transfer, owner leaving, role changes, or owner account recovery.
impact: >
  If the DM account becomes unavailable or the group changes DMs, the campaign can become administratively stuck even though its data still exists. For the current trusted small-party scope this is primarily a roadmap/workflow limitation, but it should be addressed before broader multi-user administration.
recommendation: >
  Add an ownership transfer workflow with confirmation, recipient membership validation, audit/history, and recovery policy for unavailable owners. Surface ownership clearly in campaign management UI.
notes: "Registry checked: existing CMP-004 reused and severity aligned to Director-calibrated registry as Info."
evidence:
  files:
    - src/db/schema.ts
    - src/lib/campaign-fns.ts
    - src/components/party/CampaignSelector.tsx
  symbols:
    - campaigns.dmUserId
    - createCampaignFn
    - getCampaignsFn
    - CampaignSelector
  lines:
    - "src/db/schema.ts:809-816"
    - "src/lib/campaign-fns.ts:57-87"
    - "src/components/party/CampaignSelector.tsx:1-320"
  observed_behavior: >
    Campaign creation assigns dmUserId to the creator; reviewed campaign functions and selector UI do not expose transfer, leave-owner, role-change, or recovery workflows.
  expected_behavior: >
    Long-running campaigns should have a safe ownership transfer and recovery path before broader administration is supported.
  rationale: >
    CAMPAIGN_SCENARIOS.md treats owner leaves, ownership transfer, and owner account removal as critical long-running scenarios, while PROJECT_CONTEXT.md classifies richer multi-user administration as a later possibility.
  reproduction:
    - Review exported campaign functions and CampaignSelector actions.
    - No transfer/recovery command or UI path is present.
```

## Observations

```yaml
observation:
  title: Campaign archive and delete workflows were not found
  owner: Campaign & Collaboration Agent
  category: Campaign Management
  location: src/lib/campaign-fns.ts; src/components/party/CampaignSelector.tsx
  evidence: Reviewed exported campaign functions and selector actions include create, join, select, list, active lookup, and character update only.
  reason_not_finding: PROJECT_CONTEXT.md says richer campaign administration is a later possibility; absence is useful roadmap context but not a current defect unless advertised or required.
  recommended_validation: Add archive/delete scenario tests when campaign settings or administration UI is introduced.
```

```yaml
observation:
  title: No campaign workflow regression tests were found for membership, active campaign authorization, or character detachment
  owner: Campaign & Collaboration Agent
  category: Collaboration
  location: src/lib/campaign-fns.ts
  evidence: Repository searches found source references for campaign functions but no tests exercising joinCampaignFn, selectActiveCampaignFn, getActiveCampaignFn, or updateCampaignCharactersFn behavior.
  reason_not_finding: Test coverage as a general quality concern belongs to Code Quality; this observation records campaign validation risk only.
  recommended_validation: Add focused workflow tests for raw-ID joins, duplicate joins, unauthorized active campaign cookies, stale party lists, and empty-list detachment.
```

## Not A Findings

```yaml
not_a_finding:
  title: Invitations are absent as a standalone feature
  reason: PROJECT_CONTEXT.md lists invitations as a later possibility. The official finding is not "missing invitations" by itself; CMP-001 is about the implemented raw-ID join workflow creating membership without governance.
  evidence_reviewed: PROJECT_CONTEXT.md, CAMPAIGN_SCENARIOS.md, src/lib/campaign-fns.ts, src/components/party/CampaignSelector.tsx
  adr_reviewed: ADR-002 Campaign Ownership Model; ADR-005 Party Collaboration Model
  notes: Reassess once invitation workflows become committed product scope.
```

```yaml
not_a_finding:
  title: Party is not an independent persisted aggregate
  reason: Current product scope uses party as campaign/character visibility and local configuration. Architecture has already recorded the domain-boundary implications.
  evidence_reviewed: src/lib/party.ts, src/routes/index.lazy.tsx, architecture-report.md
  adr_reviewed: ADR-005 Party Collaboration Model
  notes: No duplicate campaign finding created.
```

## Quick Wins

- Add a shared `requireCampaignAccess(campaignId, userId)` helper and use it in active lookup and party mutation.
- Rename "Join Campaign by ID" only after replacing raw IDs with invite codes or approval status.
- Add a destructive-change preview before applying party ID list replacement.
- Include an expected campaign-party revision in `updateCampaignCharactersFn`.
- Show the campaign owner in the selector/settings area.
- Split session notes into dated documents rather than one global scratchpad key.

## Long-Term Improvements

- Implement invitations with expiration, revocation, role, and audit history.
- Add campaign settings for member management, role changes, ownership transfer, archive, and recovery.
- Move shared combat/session changes to campaign-scoped commands with optimistic concurrency.
- Define a clear Party domain only when the product needs party lifecycle separate from Campaign.
- Add campaign workflow tests for scenario matrix coverage.

## Ownership Referrals

Observation:
`getCurrentUser` and broader session validation appear to rely on default-user behavior in campaign functions.

Refer To:
Code Quality & Reliability Agent

Reason:
Authentication/session correctness is outside Campaign ownership and is already represented by COD-001. No duplicate finding created.

Observation:
Character assignment writes cross Character/Campaign aggregate boundaries.

Refer To:
Architecture & Data Model Agent

Reason:
Aggregate ownership and persistence boundaries are architecture findings already represented by ARC-002. No duplicate finding created.

Observation:
Generic sync failure, retry, durability, backup, and recovery behavior should be assessed.

Refer To:
Code Quality & Reliability Agent

Reason:
Reliability and recovery behavior are outside Campaign ownership. No finding created.

Observation:
Shared KV state has broad data-model and ownership implications.

Refer To:
Architecture & Data Model Agent

Reason:
Architecture ownership is already represented by ARC-004. CMP-003 is limited to collaboration overwrite behavior. No duplicate finding created.

## Campaign Integrity Score

**4/10.** Campaigns have useful structural foundations, but active campaign authorization, membership governance, assignment safety, and collaboration conflict handling are not yet strong enough for reliable long-running group play.

## Final Recommendation

**Requires Remediation.** The campaign system is serviceable for a trusted small group, but broader or less-trusted collaboration should wait until active campaign access is revalidated on every workflow, joins are governed, party changes are explicit/revision-aware, and shared state handles conflicts.

# Overall Assessment

Campaign workflows are functional but fragile. The most important near-term fix is to enforce campaign membership/DM authorization consistently wherever an active campaign cookie is used.

# Top Risks

1. Active campaign reads and party writes trust a cookie without revalidating campaign access.
2. Raw-ID joining gives DMs weak membership control.
3. Full-list party updates can accidentally detach campaign characters.
4. Last-writer-wins shared notes and combat state can lose collaborative work.
5. Campaign ownership has no transfer or recovery path.

# Recommended Next Actions

Add centralized campaign access validation, replace raw-ID joins with governed membership, make party edits explicit and revision-aware, then add conflict handling for notes and shared campaign state.

# Confidence

High. Evidence includes current campaign functions, campaign UI, schema relationships, party management UI, sync engine, notes workflow, governance documents, registry review, and architecture context. Confidence is limited by not running live multi-client browser scenarios.

# Release Impact

Significant Impact for collaboration readiness. Current trusted small-party use can continue with caution, but production/private-data or broader multi-user use should remediate the High campaign workflow findings first.
