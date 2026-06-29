# ADR-005 Party Collaboration Model

## ADR Metadata

| Field | Value |
|---------|---------|
| ADR Number | ADR-005 |
| Title | Party Collaboration Model |
| Status | Accepted |
| Date | DD-MM-YYYY |
| Author | Repository Team |
| Related ADRs | ADR-001, ADR-002 |
| Related Findings | None |
| Related Issues | None |

---

# Context

Parties provide a collaborative layer between Characters and Campaigns.

The Party system should support long-running collaborative play.

---

# Decision

A Party is a collaboration construct.

A Party does not own Characters.

A Party references Characters.

Characters remain independently owned.

---

# Ownership Model

```text
Character
→ Has Owner

Campaign
→ Has Owner

Party
→ Has Coordinator Relationship
```

The Party itself does not become the ownership authority for Characters.

---

# Party Responsibilities

The Party owns:

```text
Membership

Party Metadata

Party Composition

Shared Tracking Information
```

---

# Party Does Not Own

```text
Character Ownership

Campaign Ownership

Character Persistence

Authentication
```

---

# Collaboration Principles

The Party exists to:

```text
Improve Collaboration

Improve Visibility

Improve Coordination
```

The Party should never introduce ambiguity into ownership decisions.

---

# Character Membership Rules

A Character may:

```text
Join Party

Leave Party

Transfer Party Membership
```

without changing Character ownership.

---

# Campaign Relationship

Campaigns may contain Parties.

Parties may reference Characters.

Deleting a Party must not:

```text
Delete Characters

Transfer Character Ownership

Modify Character Identity
```

---

# Future Collaboration Support

The model should support:

```text
Shared Notes

Shared Resources

Session Participation

Combat Participation

Real-Time Collaboration
```

without changing ownership principles.

---

# Architectural Principle

```text
Collaboration Should Not Alter Ownership
```

Ownership integrity takes precedence over collaboration convenience.

---

# Future Review Criteria

Review when:

```text
Real-Time Collaboration Added

Shared Editing Added

Organization-Owned Campaigns Added

Multi-DM Features Added
```