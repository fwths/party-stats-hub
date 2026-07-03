# Project Context

## Purpose

This document describes the repository as it exists now, its active engineering trajectory, and later product possibilities. Audits must not treat aspirational features as implemented commitments.

## Product Today

Party Stats Hub is a self-hosted D&D 5e (2024) campaign hub for a small party. Its implemented product surface includes:

- live character import from public D&D Beyond character data;
- party and character dashboards;
- combat, encounter, dice, journal, and DM utilities;
- a local SQLite rules compendium and character builder;
- synchronized campaign notes, conditions, and party configuration;
- passcode/session authentication and optional Notion integration.

The application has campaign and user tables, but it is not yet a mature multi-tenant collaboration platform. Current campaign, membership, ownership, and authorization paths must be audited according to the behavior they actually expose.

## Active Trajectory

The primary engineering direction is migration from D&D Beyond-derived display data toward trustworthy native character authority.

Active work emphasizes:

- a character aggregate containing authored and mutable facts rather than a persisted compiled sheet;
- exact, versioned rule references and source provenance;
- deterministic, reproducible sheet calculation;
- explicit owner decisions for legacy, ambiguous, and choice-shaped imported data;
- separate build and live-state revisions;
- owner authorization, optimistic concurrency, and audit events;
- migration compatibility and proof that existing characters can be reproduced without consulting D&D Beyond.

Character Schema V3 remains an isolated hardening experiment. It is not production persistence until its documented hardening gates are complete.

## Near-Term Product Goals

The next milestones are:

1. Close authentication, authorization, private-cache, and session-safety gaps.
2. Establish durable persistence, migrations, backup, and recovery behavior.
3. Complete native character authority and full-sheet reproduction for the current party.
4. Connect the native aggregate to production routes only after migration and compatibility tests pass.
5. Harden implemented campaign membership and character ownership workflows.
6. Continue modularizing rules, parsing, and large UI surfaces where that reduces correctness risk.

## Later Possibilities

The following are possible later directions, not current release requirements:

- invitations and ownership transfer;
- richer multi-user campaign administration;
- real-time collaboration;
- user-authored homebrew publishing;
- mobile or offline-first applications;
- marketplace or character publishing systems;
- additional game systems;
- virtual tabletop integrations.

Unless a later feature is already advertised, reachable, persisted, or relied upon by current code, its absence should be recorded as roadmap context or an Observation rather than an official finding.

## Current Users

### Dungeon Masters

Dungeon Masters use party visibility, encounter and combat tools, session notes, shared inventory, and rules references.

### Players

Players use character sheets, character-building flows, live-state tracking, and shared party information.

The current deployment model is small and self-hosted, but it still handles private and durable data. Small scale does not reduce authorization or recovery requirements.

## Architectural Principles

### Security and Authorization

Server-side identity must be established from a validated session. Character, campaign, sync, and private integration access must enforce ownership or membership rather than trusting client-controlled identifiers or cookies.

### Character Integrity

Character data must remain accurate, attributable, recoverable, and internally consistent. Imported uncertainty must be preserved explicitly rather than guessed away.

### Durable Persistence and Recovery

Production data must not silently fall back to ephemeral storage. Schema migrations, backups, and restore validation must preserve character and campaign integrity.

### Rules Correctness and Provenance

Calculations must be deterministic and tied to exact content versions. The rules engine calculates results; the character aggregate owns authoritative character facts. Compiled sheets are derived and disposable.

### Separation of Concerns

Character state, rule definitions, calculations, persistence, campaign relationships, authentication, and presentation should have explicit boundaries.

### Scope Calibration

Audits must distinguish implemented behavior, active experiments, near-term commitments, and later possibilities. Missing speculative features are not defects.

## Audit Priority Order

When findings compete for attention, use this order while still applying the severity matrix:

1. Security, authentication, authorization, and private-data exposure.
2. Character data integrity and ownership.
3. Durable persistence, migration safety, backup, and recovery.
4. Rules correctness and deterministic sheet reproduction.
5. Campaign data integrity for implemented workflows.
6. Reliability and deployment safety.
7. Collaboration safety for implemented workflows.
8. Extensibility needed by the active native-authority work.
9. Performance.
10. Maintainability and modernization.

A lower-ranked issue may still be more urgent when its demonstrated severity or blast radius is greater.

## Critical Success Criteria

The current application must:

- prevent unauthorized access and mutation;
- preserve character and campaign data durably;
- produce correct, reproducible character calculations;
- retain exact provenance and unresolved migration decisions;
- recover safely from failures and schema changes;
- support the current DM and player workflows;
- avoid coupling current persistence to speculative future features.

## Agent Ownership Matrix

Each official finding has one owning agent. Cross-domain concerns are recorded as Observations and referred to the likely owner until the Repository Director resolves ownership.

### Architecture & Data Model Agent

Owns architecture, domain boundaries, aggregate design, persistence structure, migration design, extensibility, and structural technical debt.

Does not own gameplay-rule correctness, campaign permission behavior, or security vulnerabilities.

### D&D Domain Agent

Owns character calculations, progression, spellcasting, features, conditions, equipment interactions, multiclassing, rule provenance, and gameplay rules.

Does not own persistence architecture, campaign ownership, security, or infrastructure.

### Campaign & Collaboration Agent

Owns implemented campaign and party membership, ownership workflows, permissions behavior, DM/player workflows, shared information, and usability observations.

Future-only collaboration scenarios must remain roadmap Observations unless implementation or an approved near-term commitment exists.

### Code Quality & Reliability Agent

Owns authentication and authorization vulnerabilities, reliability, performance, maintainability, testing, deployment, migrations, backups, recovery, monitoring, and dependency risk.

Does not own gameplay correctness, campaign product policy, architecture decisions, or client styling and accessibility.

### Frontend & UX Agent

Owns frontend styling (Tailwind CSS 4), component layout/responsiveness, accessibility (a11y) compliance, React 19 SSR hydration safety, Progressive Web App (PWA) reliability, and client performance.

Does not own backend SQLite databases, campaign permission policy, D&D rules accuracy, or backend network security.

### Critic Agent

Owns evidence validation, duplicate detection, severity review, contradiction review, confidence review, and scope calibration. It does not create new source-code findings.

### Repository Director

Owns aggregation, prioritization, ownership disputes, roadmap separation, release readiness, and executive summaries. It does not create new technical findings from source code.

## ADR Interpretation

ADRs marked `Proposed` are candidate decisions, not authoritative constraints. Auditors may use them as design context but must not dismiss a finding solely because it conflicts with a proposed ADR.

An ADR becomes authoritative only after its status is changed to `Accepted` with a real decision date and review ownership.

## Audit Philosophy

The goal is not to maximize findings. Prefer high-confidence, evidence-backed risks with practical remediation. Record uncertainty as an Observation, distinguish current scope from later possibilities, and optimize for trustworthy decisions rather than report volume.
