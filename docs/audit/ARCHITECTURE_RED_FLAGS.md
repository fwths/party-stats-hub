# Architecture Red Flags

This document defines the architectural warning signs that should be reviewed during every architecture audit.

The purpose of this document is to:

- Identify structural risk early
- Detect architectural drift
- Improve maintainability
- Protect extensibility
- Support long-term growth
- Improve repository health over time

A red flag is not automatically a finding.

A red flag is a signal that requires investigation.

The Architecture & Data Model Agent should actively review all applicable red flags during every audit.

---

# Red Flag Classification

## Critical Red Flags

These frequently threaten:

- Character integrity
- Campaign integrity
- Scalability
- Extensibility

They should receive immediate attention.

---

## High-Risk Red Flags

These increase:

- Complexity
- Fragility
- Future implementation cost

---

## Medium-Risk Red Flags

These generally:

- Reduce maintainability
- Increase confusion
- Slow development

---

# Domain Architecture Red Flags

## RF-001 — Unclear Domain Ownership

### Description

A domain has no clearly defined owner.

Examples:

```text
Character logic spread across:

- Character Service
- Campaign Service
- Utility Functions
- Frontend Components
```

### Risks

```text
Duplicate behavior

Unpredictable updates

Difficult debugging
```

### Audit Question

```text
Who owns this business capability?
```

If no clear answer exists:

Investigate.

---

## RF-002 — Shared Business Logic

### Description

Business logic is duplicated across domains.

Example:

```text
Character calculations

implemented in:

Backend

Frontend

Import service
```

### Risks

```text
Inconsistent behavior

Rules drift

Regression risk
```

### Severity Guidance

Usually:

```text
Medium
```

Potentially:

```text
High
```

if core calculations are affected.

---

## RF-003 — Cross-Domain Writes

### Description

One domain directly mutates another domain's data.

Example:

```text
Campaign domain modifies Character state directly.
```

### Risks

```text
Coupling

Ownership confusion

Data corruption
```

### Severity Guidance

Usually:

```text
High
```

---

# Aggregate Design Red Flags

## RF-004 — God Aggregate

### Description

A single aggregate owns too many responsibilities.

Examples:

```text
Character aggregate manages:

Stats
Inventory
Spells
Campaign Membership
Combat
Session History
Permissions
```

### Risks

```text
Complexity

Fragility

Slow development
```

### Audit Question

```text
Can this aggregate be understood by one developer?
```

---

## RF-005 — Unbounded Aggregate Growth

### Description

An aggregate grows continuously without meaningful boundaries.

Examples:

```text
Campaign contains:

All Sessions

All Notes

All Characters

All Logs
```

### Risks

```text
Scaling issues

Maintenance difficulties

Performance issues
```

---

## RF-006 — Circular Aggregate Dependencies

### Description

Two aggregates require each other to function.

Examples:

```text
Character depends on Campaign

Campaign depends on Character
```

### Risks

```text
Coupling

Migration complexity

Testing difficulty
```

### Severity Guidance

Usually:

```text
High
```

---

# Service Architecture Red Flags

## RF-007 — God Service

### Description

Single service owns unrelated responsibilities.

Examples:

```text
CampaignService

Invitations
Permissions
Notes
Characters
Sessions
Party Management
```

### Risks

```text
Maintenance difficulty

Testing difficulty

Complex changes
```

### Audit Question

```text
Can responsibilities be separated safely?
```

---

## RF-008 — Utility Dumping Ground

### Description

Generic utility location becomes business logic storage.

Examples:

```text
helpers/
utils/
shared/
common/
```

containing complex business behavior.

### Risks

```text
Hidden ownership

Poor discoverability

Architecture erosion
```

---

## RF-009 — Service Overlap

### Description

Multiple services implement the same business rule.

### Risks

```text
Conflicting logic

Rules drift

Unexpected behavior
```

---

# Data Model Red Flags

## RF-010 — Ambiguous Ownership

### Description

No clear owner exists for a piece of data.

Examples:

```text
Who owns campaign membership?
```

```text
Campaign?
```

```text
Party?
```

```text
User?
```

Unknown.
```

### Risks

```text
Corruption risk

Lost updates
```

---

## RF-011 — Denormalized Critical Data

### Description

Critical business state duplicated across multiple locations.

Examples:

```text
Level stored in multiple places.

Proficiency stored in multiple places.

Campaign ownership stored in multiple places.
```

### Risks

```text
Inconsistent state

Complex synchronization
```

---

## RF-012 — Hidden Relationships

### Description

Relationships implied by code rather than represented explicitly.

### Risks

```text
Maintenance difficulty

Unexpected failures
```

---

# Extensibility Red Flags

## RF-013 — Hardcoded Content

### Description

Adding content requires code changes.

Examples:

```text
New Class

New Subclass

New Spell

New Item
```

requires modifying application logic.

### Risks

```text
Poor extensibility

Homebrew limitations
```

---

## RF-014 — Feature-Specific Architecture

### Description

Architecture built specifically for one feature.

Examples:

```text
Wizard-specific logic

Campaign-specific abstractions
```

### Risks

```text
Difficult expansion

Code duplication
```

---

## RF-015 — No Homebrew Path

### Description

No clear mechanism exists to support custom content.

### Risks

```text
Future roadmap blockers
```

### Audit Question

```text
Can users create content without code changes?
```

---

# Scalability Red Flags

## RF-016 — Complexity Scales With Data Size

### Description

System behavior becomes more complex as data grows.

Examples:

```text
Logic complexity proportional to:

Characters

Campaigns

Sessions

Inventory Size
```

### Risks

```text
Future maintenance issues
```

---

## RF-017 — Central Coordination Service

### Description

One service coordinates too much of the application.

Examples:

```text
GameManager

ApplicationService

MasterController
```

### Risks

```text
Single bottleneck

Excessive coupling
```

---

## RF-018 — Architecture Cannot Support Future Features

### Description

Planned roadmap features require major redesign.

Examples:

```text
Homebrew

Combat Tracking

Marketplace

VTT Integration
```

### Risks

```text
Future development slowdown
```

### Severity Guidance

Usually:

```text
High
```

---

# Collaboration Architecture Red Flags

## RF-019 — Ownership Model Undefined

### Description

Ownership behavior is unclear.

Examples:

```text
Campaign ownership unclear

Character assignment unclear
```

### Risks

```text
Orphaned data

Workflow confusion
```

---

## RF-020 — Permission Logic Embedded Everywhere

### Description

Permission decisions scattered throughout application.

### Risks

```text
Maintenance complexity

Authorization inconsistency
```

---

# Technical Debt Red Flags

## RF-021 — Legacy Compatibility Everywhere

### Description

Large portions of architecture exist only for historical compatibility.

### Risks

```text
Complexity

Slow improvements
```

---

## RF-022 — Architecture Requires Tribal Knowledge

### Description

System only understandable by original author.

### Audit Questions

```text
Would a new engineer understand this?

Can ownership be discovered easily?

Can relationships be understood easily?
```

### Risks

```text
Bus factor

Maintenance risk
```

---

# Audit Scoring Guidance

The Architecture Agent should evaluate:

## Red Flag Count

How many major red flags exist?

---

## Red Flag Severity

How severe are the red flags?

---

## Red Flag Concentration

Are red flags concentrated in:

```text
Character Domain

Campaign Domain

Rules Domain

Infrastructure
```

or spread throughout the application?

---

# Architecture Health Guidelines

## Excellent

```text
0-3 significant red flags
```

---

## Good

```text
4-8 significant red flags
```

---

## Moderate Risk

```text
9-15 significant red flags
```

---

## High Risk

```text
16+ significant red flags
```

---

# Final Rule

Not every red flag is a finding.

Not every finding is a red flag.

A red flag is a signal that:

```text
Further investigation is warranted.
```

The purpose of this document is not to encourage large-scale rewrites.

The purpose is to help identify architectural patterns that are known to:

- Slow development
- Reduce maintainability
- Increase risk
- Block future growth

The Architecture Agent should use this document as a diagnostic guide, not as a checklist requiring perfect compliance.