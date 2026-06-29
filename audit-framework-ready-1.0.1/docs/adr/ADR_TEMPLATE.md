# ADR Template

## ADR Metadata

| Field | Value |
|---------|---------|
| ADR Number | ADR-XXX |
| Title | |
| Status | Proposed / Accepted / Deprecated / Superseded |
| Date | YYYY-MM-DD |
| Author | |
| Related ADRs | |
| Related Findings | |
| Related Issues | |

---

# Title

Provide a short descriptive title.

Examples:

- Character Domain Model
- Campaign Ownership Strategy
- Rules Engine Architecture
- Homebrew Content Framework
- Party Collaboration Model

---

# Status

Choose one:

```text
Proposed
Accepted
Deprecated
Superseded
```

Definitions:

### Proposed

The decision is under discussion.

### Accepted

The decision has been approved and should be considered authoritative.

### Deprecated

The decision is no longer recommended but may still exist in the system.

### Superseded

The decision has been replaced by a newer ADR.

---

# Context

Describe the situation that created the need for a decision.

Answer:

- What problem are we solving?
- Why is this decision needed?
- What constraints exist?
- What assumptions exist?
- What project goals are relevant?

Include enough information that a future maintainer can understand why the ADR exists.

Example:

```text
The application currently stores character progression directly
inside character records.

Future goals include support for:

- Homebrew content
- Additional rulesets
- Character import/export

The current approach may make future expansion difficult.
```

---

# Decision Drivers

List the factors that influenced the decision.

Examples:

```text
- Character data integrity
- Future extensibility
- Simplicity
- Performance
- Development speed
- Maintainability
- Homebrew support
```

Order drivers by importance.

---

# Considered Options

List all serious options that were considered.

---

## Option 1

### Description

Describe the approach.

### Advantages

- Advantage
- Advantage
- Advantage

### Disadvantages

- Disadvantage
- Disadvantage
- Disadvantage

---

## Option 2

### Description

Describe the approach.

### Advantages

- Advantage
- Advantage
- Advantage

### Disadvantages

- Disadvantage
- Disadvantage
- Disadvantage

---

## Option 3

### Description

Describe the approach.

### Advantages

- Advantage
- Advantage
- Advantage

### Disadvantages

- Disadvantage
- Disadvantage
- Disadvantage

---

# Decision

Describe the selected option.

Be explicit.

Example:

```text
Option 2 has been selected.

Character progression will be modeled as a
separate progression domain rather than
storing progression information directly
on character records.
```

Avoid ambiguity.

Future reviewers should clearly understand what was decided.

---

# Rationale

Explain why the chosen option was selected.

Compare it directly against rejected alternatives.

Answer:

- Why is this the best tradeoff?
- Which risks are reduced?
- Which goals are supported?
- Why were other options rejected?

Example:

```text
The selected approach provides stronger
support for future rulesets and homebrew
systems while maintaining reasonable
implementation complexity.

Alternative approaches created tighter
coupling between progression logic and
character persistence.
```

---

# Consequences

Describe the expected consequences of the decision.

Include both positive and negative outcomes.

---

## Positive Consequences

Examples:

```text
- Easier future expansion
- Improved ownership boundaries
- Better testability
```

---

## Negative Consequences

Examples:

```text
- Additional implementation complexity
- More services to maintain
- Additional migration work
```

---

## Risks

Examples:

```text
- Increased system complexity
- Additional synchronization logic
- Potential performance impact
```

---

# Impacted Domains

List affected domains.

Examples:

```text
Character
Campaign
Party
Rules Engine
Inventory
Spellcasting
```

---

# Impacted Files Or Systems

List major components affected by the decision.

Examples:

```text
CharacterService
CampaignService
RulesEngine
Database Schema
API Layer
```

---

# Migration Plan

If replacing an existing design, describe how migration should occur.

Questions:

- What changes first?
- What changes later?
- Can migration be incremental?
- Can rollback occur?

Example:

```text
Phase 1

Introduce new domain model.

Phase 2

Migrate existing data.

Phase 3

Deprecate legacy model.

Phase 4

Remove compatibility layer.
```

---

# Testing Strategy

Describe how the decision should be validated.

Examples:

```text
Unit Tests

Integration Tests

Migration Tests

Ownership Tests

Rules Validation Tests
```

---

# Operational Considerations

If relevant, document:

- Monitoring impact
- Logging impact
- Deployment impact
- Recovery impact
- Backup impact

Example:

```text
Migration requires database backup
prior to execution.

Rollback procedure is documented
in deployment runbook.
```

---

# Security Considerations

Document security implications if applicable.

Questions:

- Does this affect authorization?
- Does this affect ownership?
- Does this affect user data access?

If none:

```text
No significant security impact identified.
```

---

# Future Review Criteria

Describe conditions that should trigger re-evaluation.

Examples:

```text
- Introduction of homebrew support
- Mobile application release
- Additional ruleset support
- Major scaling requirements
- Marketplace implementation
```

---

# References

List supporting materials.

Examples:

```text
ADR-002 Campaign Ownership Model

Audit Finding:
ARC-007

Issue:
#123

Architecture Report:
2026-Q3
```

---

# Appendix

Optional.

Use for:

- Diagrams
- Domain models
- Data flow examples
- Additional analysis

---

# Example Summary

A good ADR should answer these questions:

1. What problem existed?
2. What options were considered?
3. What was chosen?
4. Why was it chosen?
5. What tradeoffs were accepted?
6. What systems are affected?
7. When should this decision be reconsidered?

If a future maintainer can answer those questions from this document, the ADR is complete.