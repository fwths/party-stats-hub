# Finding ID Guidelines

This document defines the authoritative rules for creating, assigning, managing, and preserving finding identifiers across all audit activities.

Every finding created by any audit agent must comply with these rules.

The objective is to ensure:

- Consistent tracking
- Historical traceability
- Accurate reporting
- Regression detection
- Duplicate prevention
- Long-term audit continuity

The finding ID is the permanent identity of a finding.

It must remain stable across the entire life of the repository.

---

# Guiding Principles

## IDs Are Permanent

Once a finding ID is created:

- It must never change
- It must never be reused
- It must never be recycled

Example:

```text
DND-004
```

Even if:

- The issue is resolved
- The issue is accepted
- The issue is rejected
- The issue reappears later

The ID remains reserved forever.

---

## IDs Represent Problems

A finding ID represents:

```text
A unique underlying problem
```

not

```text
A single audit report
```

Example:

```text
DND-004
Expertise applies proficiency twice
```

remains the same finding even if:

- It is fixed
- Later regresses
- Is fixed again

---

## Regressions Reuse IDs

If an issue returns:

Do not create a new ID.

Correct:

```text
DND-004

Status: Open
Lifecycle: Regressed
```

Incorrect:

```text
DND-004 (original)

DND-091 (same issue returned)
```

The original ID must always be preserved.

---

# ID Structure

Every finding ID follows this structure:

```text
PREFIX-NUMBER
```

Examples:

```text
ARC-001

DND-015

CMP-022

COD-104
```

Format:

```text
<AUDIT DOMAIN>-<SEQUENTIAL NUMBER>
```

---

# Domain Prefixes

## Architecture Findings

Prefix:

```text
ARC
```

Examples:

```text
ARC-001
ARC-002
ARC-003
```

Owned By:

```text
Architecture & Data Model Agent
```

Categories:

- Architecture
- Data Model
- Extensibility
- Scalability
- Domain Boundaries

---

## D&D Domain Findings

Prefix:

```text
DND
```

Examples:

```text
DND-001
DND-002
DND-003
```

Owned By:

```text
D&D Domain Agent
```

Categories:

- Rules Engine
- Character Calculation
- Spellcasting
- Progression
- Combat
- Features

---

## Campaign Findings

Prefix:

```text
CMP
```

Examples:

```text
CMP-001
CMP-002
CMP-003
```

Owned By:

```text
Campaign & Collaboration Agent
```

Categories:

- Campaigns
- Parties
- Ownership
- Collaboration
- Permissions
- DM Experience

---

## Code Quality Findings

Prefix:

```text
COD
```

Examples:

```text
COD-001
COD-002
COD-003
```

Owned By:

```text
Code Quality & Reliability Agent
```

Categories:

- Security
- Reliability
- Testing
- Performance
- Infrastructure
- Operations

---

## Frontend & UX Findings

Prefix:

```text
UIX
```

Examples:

```text
UIX-001
UIX-002
UIX-003
```

Owned By:

```text
Frontend & UX Agent
```

Categories:

- UI Consistency
- Accessibility
- SSR Safety
- Responsive Design
- PWA & Service Worker
- Client Performance

---

## Critic Reviews

Prefix:

```text
CRT
```

Examples:

```text
CRT-001
CRT-002
```

Use only for audit-quality concerns.

Examples:

- Duplicate detection
- Ownership concerns
- Severity concerns

Critic entries are not repository defects.

They are audit-process findings.

---

## Repository Director Decisions

Prefix:

```text
DIR
```

Examples:

```text
DIR-001
DIR-002
```

Use only for:

- Ownership rulings
- Audit governance decisions
- Registry corrections

These are not technical findings.

---

# Numbering Rules

## Sequential Allocation

IDs should be assigned sequentially.

Example:

```text
ARC-001
ARC-002
ARC-003
```

Then:

```text
ARC-004
```

Never skip numbers intentionally.

---

## No Reuse

Incorrect:

```text
ARC-009 resolved

Later reused for a different issue
```

Correct:

```text
ARC-009 remains reserved forever
```

---

## No Renumbering

Incorrect:

```text
Delete ARC-003

Shift ARC-004 to ARC-003
```

Correct:

```text
ARC-004 remains ARC-004
```

---

# Duplicate Finding Rules

When evaluating a possible duplicate:

Ask:

1. Same root cause?
2. Same impacted subsystem?
3. Same remediation?
4. Same business impact?

If all answers are yes:

Use existing ID.

Do not create a new one.

---

## Example

Existing:

```text
DND-004

Expertise applies proficiency twice
```

New Audit:

```text
Expertise calculations are incorrect.
```

Result:

```text
Update DND-004

Do not create DND-052.
```

---

# Related Findings

Sometimes a finding has related findings.

Example:

```text
ARC-012
Large Character Aggregate
```

May contribute to:

```text
COD-018
Complex Character Save Logic
```

Both findings remain independent.

Reference relationships through notes.

Example:

```yaml
notes:
  Related Findings:
    - ARC-012
```

Never merge distinct root causes.

---

# Lifecycle Transitions

## New Finding

```yaml
status: Open
lifecycle: New
```

---

## Existing Finding

```yaml
status: Open
lifecycle: Existing
```

---

## Resolved Finding

```yaml
status: Resolved
lifecycle: Resolved
```

---

## Regressed Finding

```yaml
status: Open
lifecycle: Regressed
```

Same ID.

No new ID.

---

# Finding Retirement Rules

Findings are never deleted.

Even rejected findings remain in the registry.

Rejected findings preserve history.

Example:

```yaml
status: Rejected
```

Reason:

```text
Insufficient evidence.
```

History remains intact.

---

# ID Assignment Workflow

When creating a finding:

Step 1

Check:

```text
FINDINGS_REGISTRY.md
```

Determine whether the issue already exists.

---

Step 2

Determine ownership.

Use:

```text
PROJECT_CONTEXT.md
```

---

Step 3

Determine correct prefix.

Examples:

```text
ARC
DND
CMP
COD
UIX
```

---

Step 4

Assign next available sequence number.

Example:

Latest:

```text
DND-026
```

Next:

```text
DND-027
```

---

Step 5

Create registry entry.

---

Step 6

Add finding to backlog if actionable.

---

# Ownership And IDs

The ID prefix must always match the owning agent.

Correct:

```text
DND-014

Owner:
D&D Domain Agent
```

Incorrect:

```text
DND-014

Owner:
Campaign & Collaboration Agent
```

If ownership changes:

The Repository Director decides whether:

- Ownership changes
- ID changes

In general:

IDs should remain unchanged.

Ownership changes are preferred over ID changes.

---

# Registry Consistency Checks

Every audit cycle should validate:

- No duplicate IDs
- No missing IDs
- No reused IDs
- No orphaned IDs
- No conflicting ownership

The Critic Agent should flag any violations.

---

# Example IDs

Architecture

```text
ARC-001
ARC-002
ARC-003
```

D&D

```text
DND-001
DND-002
DND-003
```

Campaign

```text
CMP-001
CMP-002
CMP-003
```

Code Quality

```text
COD-001
COD-002
COD-003
```

Frontend & UX

```text
UIX-001
UIX-002
UIX-003
```

---

# Success Criteria

A healthy finding ID system:

- Preserves history
- Avoids duplication
- Supports regression tracking
- Supports executive reporting
- Enables long-term trend analysis

The question every ID should answer is:

> Can this exact finding be tracked accurately over the lifetime of the project?

If the answer is yes, the ID system is working correctly.