# Campaign Scenarios

This document defines the canonical campaign, party, ownership, sharing, and collaboration scenarios that should be reviewed by the Campaign & Collaboration Agent.

The purpose of this document is to:

- Standardize campaign audits
- Improve audit consistency
- Identify workflow risks
- Detect ownership problems
- Detect collaboration failures
- Protect campaign integrity
- Protect player and Dungeon Master experience

The Campaign Agent should validate these scenarios whenever possible.

The goal is not to verify implementation details.

The goal is to verify campaign behavior.

---

# Scenario Classification

## Priority 1

Campaign Integrity

Failures may cause:

- Data loss
- Ownership corruption
- Long-running campaign damage

---

## Priority 2

Collaboration Integrity

Failures may cause:

- User confusion
- Permission failures
- Workflow breakdowns

---

## Priority 3

Experience Integrity

Failures may cause:

- Poor Dungeon Master experience
- Poor Player experience
- Workflow friction

---

# Campaign Lifecycle Scenarios

## Scenario C-001

Campaign Creation

### Description

A user creates a new campaign.

### Expected Result

```text
Campaign is created.

Owner is assigned.

Campaign contains no invalid state.

Campaign is visible to owner.
```

### Risks

```text
Missing owner

Invalid campaign state

Orphaned campaign
```

### Priority

```text
Critical
```

---

## Scenario C-002

Campaign Update

### Description

Owner updates campaign information.

### Expected Result

```text
Changes persist correctly.

Permissions remain unchanged.
```

### Risks

```text
Lost updates

Corrupted metadata
```

### Priority

```text
High
```

---

## Scenario C-003

Campaign Archive

### Description

A campaign is archived.

### Expected Result

```text
Campaign preserved.

Historical data retained.

No character data lost.
```

### Risks

```text
Data loss

Broken references
```

### Priority

```text
High
```

---

## Scenario C-004

Campaign Deletion

### Description

Campaign is deleted.

### Expected Result

```text
Deletion rules enforced.

Related data handled safely.

Users warned appropriately.
```

### Risks

```text
Permanent data loss

Orphaned records

Unexpected deletions
```

### Priority

```text
Critical
```

---

# Ownership Scenarios

## Scenario O-001

Campaign Owner Leaves

### Description

Campaign owner leaves the campaign.

### Expected Result

```text
Ownership reassigned safely.

Campaign remains usable.

Data preserved.
```

### Risks

```text
Orphaned campaign

Lost ownership

Administrative dead-end
```

### Priority

```text
Critical
```

---

## Scenario O-002

Ownership Transfer

### Description

Ownership transfers to another user.

### Expected Result

```text
New owner receives ownership.

Old owner permissions updated.

Campaign remains intact.
```

### Risks

```text
Multiple owners

No owner

Partial transfer
```

### Priority

```text
Critical
```

---

## Scenario O-003

Owner Account Removal

### Description

Owner account becomes unavailable.

### Expected Result

```text
Recovery path exists.

Campaign remains manageable.
```

### Risks

```text
Permanent access loss

Campaign lockout
```

### Priority

```text
Critical
```

---

# Invitation Scenarios

## Scenario I-001

Accept Invitation

### Description

A user accepts a valid invite.

### Expected Result

```text
Membership created.

Permissions assigned correctly.
```

### Priority

```text
High
```

---

## Scenario I-002

Reject Invitation

### Description

User declines invite.

### Expected Result

```text
No membership created.

Campaign remains unchanged.
```

### Priority

```text
Medium
```

---

## Scenario I-003

Re-Accept Invitation

### Description

User attempts to accept an invite twice.

### Expected Result

```text
Duplicate membership prevented.
```

### Risks

```text
Duplicate records

Permission inconsistencies
```

### Priority

```text
High
```

---

## Scenario I-004

Expired Invitation

### Description

User uses expired invitation.

### Expected Result

```text
Request rejected safely.
```

### Risks

```text
Unauthorized access

Invalid joins
```

### Priority

```text
High
```

---

# Party Membership Scenarios

## Scenario P-001

Join Party

### Description

Character joins party.

### Expected Result

```text
Membership created correctly.

Party state remains valid.
```

### Priority

```text
High
```

---

## Scenario P-002

Leave Party

### Description

Character leaves party.

### Expected Result

```text
Party updates correctly.

Character remains valid.
```

### Risks

```text
Orphaned references

Invalid membership state
```

### Priority

```text
High
```

---

## Scenario P-003

Party Dissolution

### Description

Party is removed.

### Expected Result

```text
Characters preserved.

Campaign remains valid.
```

### Risks

```text
Character loss

Broken references
```

### Priority

```text
Critical
```

---

# Character Assignment Scenarios

## Scenario CA-001

Assign Character

### Description

Character assigned to campaign.

### Expected Result

```text
Assignment succeeds.

Ownership remains valid.
```

### Priority

```text
High
```

---

## Scenario CA-002

Remove Character

### Description

Character removed from campaign.

### Expected Result

```text
Character preserved.

Assignment removed safely.
```

### Priority

```text
High
```

---

## Scenario CA-003

Transfer Character Ownership

### Description

Ownership changes.

### Expected Result

```text
Ownership updated.

Character remains usable.
```

### Risks

```text
Lost ownership

Duplicate ownership
```

### Priority

```text
Critical
```

---

# Collaboration Scenarios

## Scenario CO-001

Simultaneous Character Updates

### Description

Two users update related campaign data simultaneously.

### Expected Result

```text
No unintentional data loss.

Conflict handled safely.
```

### Risks

```text
Lost updates

Inconsistent state
```

### Priority

```text
Critical
```

---

## Scenario CO-002

Simultaneous Campaign Updates

### Description

Multiple users change campaign information.

### Expected Result

```text
Changes remain consistent.

State remains valid.
```

### Priority

```text
High
```

---

## Scenario CO-003

Shared Notes Editing

### Description

Multiple users edit notes.

### Expected Result

```text
Updates preserved.

No silent overwrites.
```

### Priority

```text
High
```

---

# Session Management Scenarios

## Scenario S-001

Create Session

### Description

New session created.

### Expected Result

```text
Session recorded.

Campaign linked correctly.
```

### Priority

```text
Medium
```

---

## Scenario S-002

Edit Session

### Description

Session updated.

### Expected Result

```text
Updates preserved.

History remains valid.
```

### Priority

```text
Medium
```

---

## Scenario S-003

Delete Session

### Description

Session removed.

### Expected Result

```text
Campaign remains valid.

Historical data handled appropriately.
```

### Priority

```text
Medium
```

---

# Permission Scenarios

## Scenario PER-001

Authorized Edit

### Description

Authorized user modifies campaign.

### Expected Result

```text
Action succeeds.
```

### Priority

```text
High
```

---

## Scenario PER-002

Unauthorized Edit

### Description

Unauthorized user attempts modification.

### Expected Result

```text
Action blocked.
```

### Priority

```text
Critical
```

---

## Scenario PER-003

Role Changes

### Description

Campaign role changes.

### Expected Result

```text
Permissions update correctly.
```

### Priority

```text
High
```

---

# Dungeon Master Experience Scenarios

## Scenario DM-001

Create New Campaign

### Goal

Determine whether campaign setup is intuitive.

### Questions

```text
How many steps?

How much information is required?

Are requirements clear?
```

---

## Scenario DM-002

Review Party State

### Goal

Determine whether important information is visible.

### Questions

```text
Can the DM quickly understand party status?

Can missing information be identified?
```

---

## Scenario DM-003

Manage Membership

### Goal

Determine workflow clarity.

### Questions

```text
Can membership be managed efficiently?

Can mistakes be corrected?
```

---

# Player Experience Scenarios

## Scenario PL-001

Join Campaign

### Goal

Evaluate onboarding experience.

### Questions

```text
Is joining simple?

Are errors understandable?
```

---

## Scenario PL-002

Manage Character

### Goal

Evaluate character participation experience.

### Questions

```text
Can players understand ownership?

Can players understand assignments?
```

---

# Mobile Workflow Scenarios

## Scenario M-001

Join Campaign On Mobile

### Goal

Ensure workflow remains practical on smaller screens.

---

## Scenario M-002

Review Character On Mobile

### Goal

Ensure important information remains accessible.

---

## Scenario M-003

Manage Party On Mobile

### Goal

Ensure campaign workflows remain usable.

---

# Accessibility Observation Scenarios

Review:

```text
Navigation

Discoverability

Workflow complexity

Required cognitive load
```

Questions:

```text
Can users understand the system?

Can users recover from mistakes?

Are important actions obvious?
```

---

# Regression Watchlist

The Campaign Agent should always pay extra attention to:

```text
Campaign Ownership

Ownership Transfer

Party Membership

Character Assignment

Shared Resources

Session Tracking

Invitations

Permission Workflows

Concurrent Updates
```

These areas historically produce the highest-impact collaboration failures.

---

# Campaign Health Criteria

A campaign system can be considered healthy when:

- Campaigns cannot become orphaned
- Ownership remains clear
- Membership remains valid
- Collaboration remains safe
- Shared resources remain consistent
- Character assignments remain valid
- Session history remains reliable
- Dungeon Masters remain in control
- Players can participate without confusion

The campaign audit should ultimately answer:

> Can a group safely run a long-term campaign using this platform without losing control, ownership, history, or data?

If the answer is yes, the campaign system is functioning correctly.