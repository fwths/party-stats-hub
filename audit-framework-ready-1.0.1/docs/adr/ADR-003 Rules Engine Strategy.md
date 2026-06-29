# ADR-003 Rules Engine Strategy

## ADR Metadata

| Field | Value |
|---------|---------|
| ADR Number | ADR-003 |
| Title | Rules Engine Strategy |
| Status | Accepted |
| Date | DD-MM-YYYY |
| Author | Repository Team |
| Related ADRs | ADR-001 Character Domain Model |
| Related Findings | None |
| Related Issues | None |

---

# Decision

The Rules Engine is responsible for calculating game outcomes.

The Rules Engine does not own character data.

The Rules Engine consumes character state and produces calculated results.

---

# Rules Engine Responsibilities

The Rules Engine owns:

```text
Ability Modifiers

Skill Calculations

Saving Throws

Spell Save DC

Spell Attack Bonus

Progression Calculations

Feature Resolution

Condition Resolution
```

---

# Rules Engine Does Not Own

```text
Character Identity

Character Ownership

Campaign Ownership

Persistence

Authentication
```

---

# Architectural Principle

```text
Rules Engine Performs Calculations

Character Domain Owns State
```

---

# Extensibility Strategy

The Rules Engine should support:

```text
New Classes

New Subclasses

New Feats

New Conditions

New Spells

Additional Rulesets
```

without requiring architectural redesign.

---

# Future Review Criteria

Review this ADR when:

```text
Additional Rulesets Introduced

Combat Tracking Added

Pathfinder Support Added

Homebrew Rule Systems Added
```