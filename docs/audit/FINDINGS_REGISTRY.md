# Findings Registry

## Purpose

This document is the authoritative registry of all audit findings.

Every finding created by any audit agent must appear here. Finding IDs are permanent and must not be reused, renumbered, or removed from history.

---

# Registry Metadata

```yaml
registry_version: 1.0
created_on: 2026-06-29
last_updated: 2026-06-30
audit_cycle: Audit #2 - Framework Ready 1.0.1
maintainer: Repository Director
```

---

# Open Findings

```yaml
id: COD-001
title: Authentication and session validation are hardcoded to succeed
owner: Code Quality & Reliability Agent
severity: Critical
confidence: High
status: Open
lifecycle: Existing
category: Security
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: src/lib/auth.server.ts; src/lib/db.server.ts; src/lib/auth-fns.ts; src/lib/campaign-fns.ts
summary: Auth/session helpers return default authenticated identities or unconditional success, allowing protected flows to operate without real validation.
recommendation: Replace default success paths with real session lookup, passcode/session validation, and negative-path tests.
related_findings: [CMP-001]
notes: Release blocking for production or private-data use.
```

```yaml
id: COD-002
title: Persistence can silently fall back to temp or in-memory storage
owner: Code Quality & Reliability Agent
severity: Critical
confidence: High
status: Open
lifecycle: Existing
category: Reliability
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: src/lib/db.server.ts
summary: Database initialization can continue with temp paths or mock in-memory storage, risking silent data loss and misleading successful startup.
recommendation: Fail closed when durable storage cannot be opened, except in explicitly configured test modes.
related_findings: [ARC-004, CMP-003]
notes: Release blocking for production or private-data use.
```

```yaml
id: COD-004
title: No verified backup or restore path exists for production SQLite data
owner: Code Quality & Reliability Agent
severity: Critical
confidence: High
status: Open
lifecycle: Existing
category: Backups
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: Repository operations
summary: The repository has SQLite persistence paths but no validated backup, restore, or recovery workflow.
recommendation: Add backup and restore scripts, document recovery steps, and verify restore against a local database.
related_findings: [COD-002]
notes: Release blocking for production or private-data use.
```

```yaml
id: COD-003
title: Character and campaign writes can partially complete without safe rollback
owner: Code Quality & Reliability Agent
severity: High
confidence: High
status: Open
lifecycle: Existing
category: Reliability
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: src/lib/native-engine.ts; src/lib/campaign-fns.ts
summary: Multi-step writes update parent records and projections or detach campaign characters without consistent transaction or compensation behavior.
recommendation: Wrap related write sets in transactions and make partial failure behavior explicit and test-covered.
related_findings: [ARC-001, CMP-002]
notes: Prioritized after the critical release blockers.
```

```yaml
id: ARC-001
title: Parallel character persistence models lack a canonical source of truth
owner: Architecture & Data Model Agent
severity: High
confidence: High
status: Open
lifecycle: Existing
category: Data Model
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: Character domain persistence
summary: Native character aggregates, imported character state, cache data, and live KV state coexist without a clearly documented authority boundary.
recommendation: Define the canonical character aggregate and treat other stores as projections with explicit synchronization rules.
related_findings: [COD-003]
notes: Blocks safe expansion of native character editing and import workflows.
```

```yaml
id: CMP-002
title: Party updates can detach active campaign characters through omitted ID lists
owner: Campaign & Collaboration Agent
severity: High
confidence: High
status: Open
lifecycle: Existing
category: Party Management
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: src/lib/campaign-fns.ts
summary: Campaign character attachment appears to be driven by submitted ID lists, so omissions can unintentionally detach active campaign characters.
recommendation: Make detach operations explicit, validate membership transitions, and add regression tests for omitted IDs.
related_findings: [COD-003]
notes: High collaboration/data-integrity risk.
```

```yaml
id: CMP-001
title: Campaign membership can be created by raw campaign ID without invitation workflow
owner: Campaign & Collaboration Agent
severity: High
confidence: High
status: Open
lifecycle: Existing
category: Permissions
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: Campaign membership flows
summary: Membership can be established from a campaign identifier without a durable invite or approval boundary.
recommendation: Require invitation, approval, or owner-authorized join semantics before membership is granted.
related_findings: [COD-001]
notes: Remains separate from authentication because authorization semantics still need design after real sessions exist.
```

```yaml
id: CMP-005
title: Active campaign party mutation does not revalidate campaign membership or DM authority
owner: Campaign & Collaboration Agent
severity: High
confidence: High
status: Open
lifecycle: New
category: Permissions
first_detected: 2026-06-30
last_reviewed: 2026-06-30
location: src/lib/campaign-fns.ts
summary: Active-campaign reads and party mutations trust the active_campaign_id cookie after selection without revalidating membership or DM authority at the point of use.
recommendation: Centralize authorized active-campaign resolution and require it before every campaign-scoped read or mutation.
related_findings: [COD-001, CMP-002]
notes: Distinct from global authentication bypass; authorization remains required after real session identity is restored.
```

```yaml
id: CMP-003
title: Shared notes and campaign state use last-writer-wins synchronization
owner: Campaign & Collaboration Agent
severity: Medium
confidence: High
status: Open
lifecycle: Existing
category: Collaboration
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: Campaign notes and shared state persistence
summary: Collaborative state lacks conflict detection or revision semantics, so concurrent edits can overwrite each other.
recommendation: Add revision tokens, optimistic concurrency checks, or explicit conflict handling for shared campaign data.
related_findings: [ARC-004, COD-002]
notes: Important before broader multi-user collaboration.
```

```yaml
id: DND-002
title: Conditions are tracked but not consistently applied to gameplay calculations
owner: D&D Domain Agent
severity: Medium
confidence: High
status: Open
lifecycle: Existing
category: Conditions
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: Native rules and character calculation flows
summary: Condition state exists but does not consistently affect derived combat, ability, speed, or saving throw calculations.
recommendation: Add a condition effect resolver and tests for the most common gameplay-affecting conditions.
related_findings: []
notes: Rules-correctness risk for live gameplay use.
```

```yaml
id: DND-003
title: Native spell selection can prepare spells without class or level eligibility
owner: D&D Domain Agent
severity: High
confidence: High
status: Open
lifecycle: New
category: Spellcasting
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: src/lib/native-engine.ts; src/lib/rules/validate-character.ts; src/lib/native-engine.test.ts
summary: Native compilation accepts selected spells without validating class list, spell level, subclass eligibility, or whether the class can cast spells; a Fighter 5 fixture compiles Shield as prepared.
recommendation: Validate every selected spell against its legal class, subclass, level, and grant source before snapshot compilation.
related_findings: [DND-001]
notes: Concrete rules defect confirmed by an existing regression fixture.
```

```yaml
id: DND-001
title: Builder validation uses class-specific shortcuts and fixed caps for extensible rules
owner: D&D Domain Agent
severity: Medium
confidence: High
status: Open
lifecycle: Existing
category: Class Progression
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: Native character builder validation
summary: Builder rules rely on narrow class-specific logic and fixed limits where data-driven rules would scale more safely.
recommendation: Move validation toward data-driven class/rules metadata and add coverage for edge-case class progression.
related_findings: [ARC-003]
notes: Director accepted critic calibration from High to Medium unless broad native-builder correctness becomes the next release focus.
```

```yaml
id: ARC-004
title: Character live state is persisted through opaque globally synchronized KV keys
owner: Architecture & Data Model Agent
severity: Medium
confidence: High
status: Open
lifecycle: Existing
category: Data Model
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: Live character state persistence
summary: Live character state is stored through broad KV synchronization without clear ownership, conflict, or projection boundaries.
recommendation: Define live-state ownership and synchronization semantics, then narrow persistence keys to explicit aggregates.
related_findings: [CMP-003, COD-002]
notes: Related to collaboration and durability but remediated at the architecture boundary.
```

```yaml
id: ARC-002
title: Campaign workflows directly create or reassign character aggregate state
owner: Architecture & Data Model Agent
severity: Medium
confidence: High
status: Open
lifecycle: Existing
category: Architecture
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: Campaign and character domain workflows
summary: Campaign flows can directly mutate character aggregate ownership/state, increasing coupling between campaign and character domains.
recommendation: Introduce an application service boundary for character ownership and campaign attachment changes.
related_findings: [ARC-001, CMP-002]
notes: Should be addressed with the character authority cleanup.
```

```yaml
id: ARC-003
title: Native character compilation and persistence are centralized in one module
owner: Architecture & Data Model Agent
severity: Medium
confidence: High
status: Open
lifecycle: Existing
category: Maintainability
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: src/lib/native-engine.ts
summary: Rule compilation, validation, persistence, and projections are concentrated in a large module, raising change risk for native character work.
recommendation: Split rules, projection, persistence, and validation responsibilities behind tested boundaries.
related_findings: [DND-001]
notes: Medium-term maintainability risk.
```

```yaml
id: COD-005
title: Server database modules cross into the client build output
owner: Code Quality & Reliability Agent
severity: Medium
confidence: High
status: Open
lifecycle: Existing
category: Deployment
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: Build output; src/lib/drizzle.server.ts
summary: The production build emits warnings that server database modules are externalized from client output, indicating a server/client boundary leak.
recommendation: Add a server-only boundary guard and refactor imports so database modules cannot enter client bundles.
related_findings: []
notes: Build passed, but deployment safety should improve before release.
```

```yaml
id: CMP-004
title: Campaign ownership lacks transfer and recovery workflow
owner: Campaign & Collaboration Agent
severity: Info
confidence: High
status: Open
lifecycle: Existing
category: Ownership
first_detected: 2026-06-29
last_reviewed: 2026-06-30
location: Campaign ownership workflows
summary: There is no explicit workflow for campaign ownership transfer or recovery.
recommendation: Add owner transfer and recovery as a roadmap item before broader multi-user administration is supported.
related_findings: []
notes: Director accepted critic calibration from Medium to Info because this is a roadmap observation for the current scope.
```

---

# Resolved Findings

No findings currently recorded.

---

# Regressed Findings

No findings currently recorded.

---

# Rejected Findings

No findings currently recorded.

---

# Open Findings Summary

```text
Critical: 3
High: 6
Medium: 7
Low: 0
Info: 1
```

---

# Ownership Summary

## Architecture & Data Model Agent

```text
Open Findings: 4
```

## D&D Domain Agent

```text
Open Findings: 3
```

## Campaign & Collaboration Agent

```text
Open Findings: 5
```

## Code Quality & Reliability Agent

```text
Open Findings: 5
```

## Repository Director

```text
Open Findings: 0
```

---

# Audit Statistics

```text
Total Findings: 17
Open Findings: 17
Resolved Findings: 0
Regressed Findings: 0
Rejected Findings: 0
```

---

# Audit History

## Audit Cycle Log

```yaml
audit_cycle: Audit #1 - Framework Ready 1.0.1
date: 2026-06-29
reports:
  - audit-results/architecture-report.md
  - audit-results/dnd-report.md
  - audit-results/campaign-report.md
  - audit-results/code-quality-report.md
  - audit-results/critic-report.md
  - audit-results/executive-summary.md
result: Release blocked for production/private-data use pending critical remediation.
```

```yaml
audit_cycle: Audit #2 - Framework Ready 1.0.1
date: 2026-06-30
reports:
  - audit-results/architecture-report.md
  - audit-results/dnd-report.md
  - audit-results/campaign-report.md
  - audit-results/code-quality-report.md
  - audit-results/critic-report.md
  - audit-results/executive-summary.md
new_findings:
  - DND-003
  - CMP-005
result: Not Ready; release remains blocked for production/private-data use.
```

---

# Notes

The Director-calibrated registry is authoritative for remediation ordering. Source reports remain the evidence record for each finding.
