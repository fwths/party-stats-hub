# ADR-004 Homebrew Strategy

## ADR Metadata

| Field | Value |
|---------|---------|
| ADR Number | ADR-004 |
| Title | Homebrew Content Strategy |
| Status | Proposed |
| Date | 2026-06-29 |
| Author | Repository Team |
| Related ADRs | ADR-001, ADR-003 |
| Related Findings | None |
| Related Issues | None |

---

# Status

```text
Proposed
```

Data-driven content agrees with the current compendium architecture. User-authored homebrew creation, ownership, sharing, and publication are later possibilities rather than current release requirements.

---

# Context

Homebrew content is a major roadmap objective.

The platform should support user-created content without requiring source-code modification.

---

# Decision

Homebrew content should be data-driven.

New content should be represented as data rather than application code whenever possible.

---

# Supported Homebrew Types

```text
Classes

Subclasses

Features

Feats

Items

Spells

Conditions

Backgrounds
```

---

# Architectural Principle

```text
Content Should Be Configurable

Behavior Should Be Extensible
```

---

# Content Ownership

Homebrew content belongs to the Content Domain.

Characters may reference homebrew content.

Characters do not own homebrew definitions.

---

# Future Growth Goals

The architecture should allow:

```text
User-Created Content

Community Content

Marketplace Content

Shared Content Libraries
```

without redesigning the Character Domain.

---

# Risks

```text
Hardcoded Rules

Feature-Specific Logic

Content Stored As Code
```

These should be minimized.

---

# Future Review Criteria

Review when:

```text
Marketplace Added

Community Sharing Added

Multiple Rulesets Supported
```
