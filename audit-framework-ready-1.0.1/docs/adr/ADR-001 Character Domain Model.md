# ADR-001 Character Domain Model

## ADR Metadata

| Field | Value |
|---------|---------|
| ADR Number | ADR-001 |
| Title | Character Domain Model |
| Status | Accepted |
| Date | DD-MM-YYYY |
| Author | Repository Team |
| Related ADRs | None |
| Related Findings | None |
| Related Issues | None |

---

# Title

Character Domain Model

---

# Status

```text
Accepted
```

This decision is considered authoritative until superseded by a future ADR.

---

# Context

The Character system is the most important domain in the application.

The platform exists primarily to support:

- Character creation
- Character progression
- Character management
- Character sharing
- Character participation in campaigns

Most user trust depends on character integrity.

If character data becomes incorrect, corrupted, inconsistent, or difficult to evolve, the platform loses credibility.

Future roadmap goals include:

- Homebrew content
- Additional rulesets
- Character sharing
- Mobile applications
- Combat tracking
- Virtual tabletop integrations

The domain model must support future growth while preserving character integrity.

---

# Decision Drivers

Priority order:

```text
1. Character integrity

2. Clear ownership

3. Extensibility

4. Rules evolution

5. Testability

6. Maintainability

7. Future content support

8. Future ruleset support
```

---

# Considered Options

## Option 1

Store all character-related state across multiple independent services.

### Advantages

```text
Simple initial implementation

Fast development

Flexible ownership
```

### Disadvantages

```text
Ownership ambiguity

High synchronization risk

Difficult testing

Duplicate state risk
```

---

## Option 2

Character acts as the primary aggregate root.

### Advantages

```text
Clear ownership

Strong consistency

Clear lifecycle management

Improved integrity

Improved auditability
```

### Disadvantages

```text
Risk of aggregate growth

Requires disciplined boundaries
```

---

## Option 3

Fully distributed ownership model.

### Advantages

```text
High modularity

Independent evolution
```

### Disadvantages

```text
Complex synchronization

Higher implementation complexity

Data integrity risk
```

---

# Decision

Option 2 has been selected.

The Character will act as the primary aggregate root for character-related state.

Character-related business behavior should be owned by the Character domain.

Important character state should not be duplicated across unrelated domains.

---

# Rationale

Character integrity is the most important business concern in the platform.

A single primary aggregate root provides:

```text
Clear ownership

Clear lifecycle

Predictable evolution

Reduced synchronization problems

Improved auditability
```

This model also supports:

```text
Future content

Homebrew systems

Expanded progression

Additional rules systems
```

with fewer architectural risks.

---

# Character Aggregate Responsibilities

The Character aggregate owns:

```text
Ability Scores

Character Level

Class Selection

Subclass Selection

Features

Feats

Spellcasting State

Inventory State

Conditions

Character Metadata
```

The Character aggregate is responsible for maintaining internal consistency.

---

# Character Aggregate Does Not Own

The Character aggregate does not own:

```text
Campaign Lifecycle

Campaign Ownership

Party Lifecycle

Session History

Authentication

Authorization
```

These belong to separate domains.

---

# Ownership Rules

A Character must have a clear owner.

Ownership requirements:

```text
One Character

One Owner

At All Times
```

Ownership changes must be explicit.

Ownership changes should be auditable.

Characters must never become ownerless.

---

# Campaign Relationship

Campaigns may reference Characters.

Campaigns may contain Characters.

Campaigns do not own Character state.

The Character remains independently valid outside a campaign.

This ensures:

```text
Campaign deletion
≠
Character deletion
```

---

# Party Relationship

Parties may reference Characters.

Parties do not own Characters.

Party membership should not alter Character identity.

---

# Rules Engine Relationship

The Rules Engine may calculate Character state.

The Rules Engine does not own Character state.

Rules calculations should be applied through Character-controlled workflows.

---

# Persistence Model

Character persistence should maintain:

```text
Single Source Of Truth
```

for:

```text
Level

Classes

Features

Inventory

Spellcasting
```

Avoid duplicating critical values across unrelated systems.

---

# Extensibility Considerations

The Character model should support:

```text
New Classes

New Subclasses

New Features

New Feats

New Conditions

New Rules Content
```

without structural redesign.

---

# Homebrew Considerations

The Character model should support:

```text
Homebrew Classes

Homebrew Subclasses

Homebrew Features

Homebrew Feats

Homebrew Items
```

without requiring changes to Character ownership structure.

---

# Additional Rulesets

Future support may include:

```text
Other D&D Versions

Pathfinder

Custom Systems
```

The Character aggregate should remain adaptable.

Rules implementation should be replaceable without redefining Character ownership.

---

# Positive Consequences

```text
Clear ownership

Improved integrity

Reduced synchronization risk

Improved auditability

Better testability

Improved extensibility
```

---

# Negative Consequences

```text
Risk of aggregate bloat

Requires boundary discipline

Requires ownership enforcement
```

---

# Risks

```text
Character aggregate could become too large

Campaign systems could improperly take ownership

Rules systems could become tightly coupled
```

These risks should be monitored during future audits.

---

# Impacted Domains

```text
Character

Rules Engine

Campaign

Party

Inventory

Spellcasting
```

---

# Impacted Systems

```text
Character Service

Character Repository

Rules Engine

Persistence Layer

Import System

Campaign Relationships
```

---

# Migration Guidance

If the current architecture differs from this ADR:

Phase 1

```text
Identify character ownership boundaries.
```

Phase 2

```text
Centralize critical character state ownership.
```

Phase 3

```text
Remove duplicate ownership paths.
```

Phase 4

```text
Validate integrity through tests and audits.
```

---

# Testing Strategy

The following areas should receive strong coverage:

```text
Character Creation

Character Updates

Level Progression

Feature Application

Spellcasting

Inventory Changes

Ownership Changes

Persistence
```

Reference:

```text
RULES_TEST_MATRIX.md
```

---

# Operational Considerations

Character data should be considered critical data.

Backups should include:

```text
Character Records

Features

Inventory

Progression State
```

Recovery procedures should validate:

```text
Character Integrity
```

after restore operations.

---

# Security Considerations

Ownership validation should occur before:

```text
Character Modification

Character Deletion

Ownership Transfer
```

Character ownership should not be inferred from client-provided data.

---

# Future Review Criteria

Review this ADR when:

```text
Homebrew Support Introduced

Additional Rulesets Introduced

Marketplace Introduced

Character Sharing Expanded

VTT Integration Added

Aggregate Complexity Becomes Excessive
```

---

# References

```text
PROJECT_CONTEXT.md

ARCHITECTURE_RED_FLAGS.md

RULES_TEST_MATRIX.md
```

---

# Appendix

## Architectural Principle

The most important architectural principle in this repository is:

```text
Character Integrity First
```

When future tradeoffs occur:

```text
Protect Character Integrity
before
Optimizing Feature Velocity
```

because long-term user trust depends on the correctness and safety of character data.