# ADR-002 Campaign Ownership Model

## ADR Metadata

| Field | Value |
|---------|---------|
| ADR Number | ADR-002 |
| Title | Campaign Ownership Model |
| Status | Accepted |
| Date | DD-MM-YYYY |
| Author | Repository Team |
| Related ADRs | ADR-001 Character Domain Model |
| Related Findings | None |
| Related Issues | None |

---

# Title

Campaign Ownership Model

---

# Status

```text
Accepted
```

This decision is considered authoritative until superseded by a future ADR.

---

# Context

Campaigns are the primary collaboration unit within the platform.

A campaign allows:

- Players to participate together
- Dungeon Masters to organize sessions
- Characters to be associated with a shared story
- Shared campaign resources to exist
- Session history to be preserved

Long-running campaigns are expected to remain active for months or years.

Ownership ambiguity creates significant risk.

Examples:

```text
Campaign becomes orphaned

No user can administer campaign

Permissions become inconsistent

Membership cannot be managed

Shared resources become inaccessible
```

The ownership model must prioritize:

```text
Continuity

Safety

Administrative clarity

Recoverability
```

Campaigns should remain operable even when participants change.

---

# Decision Drivers

Priority order:

```text
1. Campaign integrity

2. Ownership clarity

3. Administrative continuity

4. Collaboration safety

5. User experience

6. Recoverability

7. Future collaboration features

8. Simplicity
```

---

# Considered Options

## Option 1

Campaign has no owner.

All members have equal authority.

### Advantages

```text
Simple concept

Reduced administration
```

### Disadvantages

```text
No accountability

Permission ambiguity

Administrative conflicts

No clear recovery path
```

---

## Option 2

Campaign always has exactly one owner.

### Advantages

```text
Clear accountability

Clear permissions

Simple recovery rules

Administrative consistency
```

### Disadvantages

```text
Ownership transfer required

Additional workflows required
```

---

## Option 3

Campaign supports multiple co-owners.

### Advantages

```text
Shared responsibility

Reduced dependence on one user
```

### Disadvantages

```text
Complex permission rules

Ownership ambiguity

Conflict resolution complexity
```

---

# Decision

Option 2 has been selected.

A campaign must always have exactly one owner.

Ownership must be explicit.

A campaign may never exist without an owner.

Ownership changes must occur through explicit ownership transfer workflows.

---

# Rationale

The platform prioritizes campaign integrity.

A single owner model provides:

```text
Clear authority

Clear responsibility

Predictable administration

Reduced ambiguity

Simpler recovery procedures
```

The complexity introduced by co-ownership outweighs its benefits for the current platform scope.

Future collaboration features can be added without changing the ownership model.

---

# Ownership Rules

Each campaign must satisfy the following invariant:

```text
Campaign
→ Exactly One Owner
→ At All Times
```

Invalid states include:

```text
Campaign with no owner

Campaign with multiple owners

Campaign with unknown owner
```

These states should never exist.

---

# Owner Responsibilities

The Campaign Owner is responsible for:

```text
Campaign administration

Membership management

Ownership transfer

Campaign lifecycle actions

Campaign deletion

Campaign archival
```

Ownership implies administrative authority.

Ownership does not imply ownership of player characters.

---

# Character Ownership

Campaigns do not own characters.

Characters remain independently owned.

Reference:

```text
ADR-001 Character Domain Model
```

Campaign membership must not alter character ownership.

Campaign removal must not delete character ownership.

---

# Party Relationship

Parties may exist within campaigns.

Campaigns may contain parties.

Campaign ownership does not become party ownership.

Party membership must not alter campaign ownership.

---

# Membership Model

Campaign membership and campaign ownership are separate concepts.

A member may be:

```text
Owner

Member
```

Membership should never imply ownership.

Ownership should never be inferred from membership.

---

# Ownership Transfer Model

Ownership transfers must be explicit.

The transfer process should:

```text
Identify current owner

Identify new owner

Validate permissions

Record transfer

Update ownership atomically
```

Partial ownership transfers should never occur.

---

# Owner Departure Scenario

If an owner leaves a campaign:

Ownership must be resolved before departure completes.

Valid approaches:

```text
Transfer ownership

Delete campaign

Archive campaign
```

Campaign orphaning is not permitted.

---

# Account Removal Scenario

If an owner account is removed or becomes unavailable:

A recovery path must exist.

Examples:

```text
Administrative reassignment

Recovery workflow

Support intervention
```

Campaign access should not become permanently lost.

---

# Invitations

Invitations do not grant ownership.

Invitations only grant membership.

Ownership requires a dedicated ownership transfer process.

---

# Collaboration Principles

The ownership model exists to support collaboration.

Goals:

```text
Safe collaboration

Clear authority

Administrative continuity

Permission clarity
```

The ownership model should reduce confusion rather than increase it.

---

# Persistence Requirements

Campaign ownership should be stored as:

```text
Single Source Of Truth
```

Avoid:

```text
Duplicate ownership fields

Inferred ownership

Derived ownership
```

Ownership should always be explicit.

---

# Integrity Requirements

The following conditions must be preserved:

```text
Campaign has owner

Owner exists

Membership valid

Permissions valid
```

Violations should be treated as campaign integrity risk.

---

# Future Feature Compatibility

This ownership model should support:

```text
Character Sharing

Campaign Sharing

Shared Notes

Session Tracking

Combat Tracking

Real-Time Collaboration

Marketplace Features

Virtual Tabletop Integration
```

without changing campaign ownership rules.

---

# Positive Consequences

```text
Clear ownership

Simple administration

Reduced ambiguity

Improved recoverability

Stronger auditability

Easier permission reasoning
```

---

# Negative Consequences

```text
Ownership transfer required

Single-owner dependency

Administrative workflows required
```

---

# Risks

```text
Ownership transfer bugs

Orphan prevention failures

Improper permission inheritance

Recovery process gaps
```

These areas should receive focused audit attention.

---

# Impacted Domains

```text
Campaign

Party

Membership

Permissions

Invitations

Sessions

Collaboration
```

---

# Impacted Systems

```text
Campaign Service

Membership Service

Invitation Service

Permission Service

Session Tracking

Persistence Layer
```

---

# Migration Guidance

If existing implementation differs:

Phase 1

```text
Identify ownership representation.
```

Phase 2

```text
Remove ambiguous ownership paths.
```

Phase 3

```text
Enforce single-owner invariant.
```

Phase 4

```text
Validate transfer workflows.
```

Phase 5

```text
Validate orphan prevention rules.
```

---

# Testing Strategy

The following areas require strong validation:

```text
Campaign Creation

Campaign Membership

Ownership Transfer

Campaign Deletion

Campaign Archival

Invite Acceptance

Invite Rejection

Owner Departure

Recovery Workflows
```

Reference:

```text
CAMPAIGN_SCENARIOS.md
```

---

# Operational Considerations

Campaign ownership should be considered critical operational data.

Backups should preserve:

```text
Campaign owner

Membership

Permissions

Sessions

Shared resources
```

Recovery validation should confirm:

```text
Ownership integrity
```

after restoration.

---

# Security Considerations

Ownership must be validated before:

```text
Campaign modification

Campaign deletion

Membership changes

Ownership transfer
```

Ownership must not be inferred from client-controlled values.

Server-side validation is required.

---

# Future Review Criteria

Review this ADR when:

```text
Co-Ownership Introduced

Organization-Owned Campaigns Introduced

Advanced Collaboration Introduced

Enterprise Collaboration Features Added

Real-Time Editing Introduced

Permission Model Redesigned
```

---

# References

```text
ADR-001 Character Domain Model

PROJECT_CONTEXT.md

CAMPAIGN_SCENARIOS.md

ARCHITECTURE_RED_FLAGS.md
```

---

# Appendix

## Architectural Principle

The most important campaign principle is:

```text
Campaigns Must Never Become Orphaned
```

When architectural tradeoffs occur:

```text
Protect Ownership Integrity
before
Optimizing Workflow Convenience
```

because long-term campaign continuity depends on preserving clear administrative ownership.