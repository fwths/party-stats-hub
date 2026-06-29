# Audit Backlog

This document is the operational work queue for audit remediation.

Unlike the Findings Registry, which acts as the permanent historical source of truth, the Audit Backlog is a prioritized implementation-focused view of active work.

The backlog is intended for day-to-day development planning.

The Repository Director is responsible for maintaining backlog prioritization after every audit cycle.

---

# Backlog Purpose

The Audit Backlog exists to:

- Prioritize remediation work
- Organize findings by urgency
- Provide visibility into current risk
- Support sprint planning
- Track remediation progress
- Highlight release blockers
- Focus engineering effort on the highest-value fixes

---

# Relationship To Other Audit Documents

## Findings Registry

Purpose:

Permanent history of every finding.

Contains:

- All findings
- Resolved findings
- Accepted findings
- Regressed findings
- Historical information

Source of Truth:

```text
FINDINGS_REGISTRY.md
```

---

## Audit Backlog

Purpose:

Current work queue.

Contains:

- Open findings
- In Progress findings
- Planned remediation work

Source of Truth:

```text
AUDIT_BACKLOG.md
```

---

# Prioritization Rules

Backlog priority should follow the order defined in:

```text
PROJECT_CONTEXT.md
```

Priority hierarchy:

1. Character Data Integrity
2. Campaign Data Integrity
3. Rules Correctness
4. Security
5. Reliability
6. Collaboration Safety
7. Performance
8. Maintainability
9. Modernization

---

# Backlog Status Meaning

## Not Started

Finding has been approved for remediation.

Work has not yet begun.

---

## In Progress

Active remediation work is underway.

---

## Blocked

Remediation is blocked by:

- Another finding
- Architectural changes
- Missing requirements
- External dependencies

---

## Ready For Validation

Implementation is completed.

Awaiting verification.

---

## Completed

Fix has been validated.

Finding should be moved to:

```text
Resolved
```

inside the Findings Registry.

---

# Release Blockers

The following categories automatically block release consideration.

---

## Critical Findings

All Critical findings are release blockers unless:

```text
Status = Accepted
```

and acceptance is documented.

---

## Character Integrity Risks

Examples:

- Character corruption
- Character deletion
- Invalid progression

Release Blocker:

Yes

---

## Campaign Integrity Risks

Examples:

- Ownership corruption
- Campaign deletion issues
- Data loss

Release Blocker:

Yes

---

## Security Risks

Severity:

Critical

Release Blocker:

Yes

---

## Unrecoverable Recovery Risks

Examples:

- No verified backup path
- Broken migrations

Release Blocker:

Yes

---

# Current Sprint

Place findings currently targeted for remediation.

Example format:

```yaml
- id: DND-004
  title: Expertise applies proficiency twice
  severity: High
  owner: D&D Domain Agent
  status: In Progress
```

Initially empty.

---

# Critical Priority

Highest-risk findings requiring immediate attention.

Format:

```yaml
- id:
  title:
  severity:
  owner:
  status:
```

Initially empty.

---

# High Priority

Important findings that should be addressed in the next development cycle.

Format:

```yaml
- id:
  title:
  severity:
  owner:
  status:
```

Initially empty.

---

# Medium Priority

Findings that improve quality, scalability, and maintainability.

Format:

```yaml
- id:
  title:
  severity:
  owner:
  status:
```

Initially empty.

---

# Low Priority

Lower-impact improvements and refactoring opportunities.

Format:

```yaml
- id:
  title:
  severity:
  owner:
  status:
```

Initially empty.

---

# Blocked Findings

Format:

```yaml
- id:
  title:
  blocked_by:
  reason:
```

Initially empty.

---

# Ready For Validation

Findings that have been implemented but not yet verified.

Format:

```yaml
- id:
  title:
  implementation_commit:
```

Initially empty.

---

# Recently Completed

Last ten validated fixes.

Format:

```yaml
- id:
  title:
  resolved_date:
```

Initially empty.

---

# Accepted Risks

Findings intentionally not being fixed.

Format:

```yaml
- id:
  title:
  rationale:
```

These findings must also exist in:

```text
FINDINGS_REGISTRY.md
```

Initially empty.

---

# Regression Watchlist

High-value findings that have previously regressed.

These findings should receive additional scrutiny during future audits.

Format:

```yaml
- id:
  title:
  regression_count:
```

Initially empty.

---

# Audit Metrics

Update after each audit cycle.

## Open Findings

```text
0
```

---

## In Progress Findings

```text
0
```

---

## Blocked Findings

```text
0
```

---

## Critical Findings

```text
0
```

---

## Regressed Findings

```text
0
```

---

## Accepted Risks

```text
0
```

---

## Completed This Cycle

```text
0
```

---

# Repository Director Review

After every audit:

1. Review executive-summary.md
2. Review critic-report.md
3. Review findings registry
4. Re-prioritize backlog
5. Update metrics
6. Identify release blockers
7. Identify quick wins
8. Schedule remediation work

---

# Quick Wins

Use this section to track low-effort, high-impact improvements.

Format:

```yaml
- id:
  title:
  expected_benefit:
```

Initially empty.

---

# Architecture Roadmap

Longer-term architecture improvements that may span multiple releases.

Format:

```yaml
- title:
  priority:
  target_release:
```

Initially empty.

---

# Notes

The backlog should remain focused and actionable.

The backlog is not a historical archive.

Historical tracking belongs in:

```text
FINDINGS_REGISTRY.md
```

Only active work and active prioritization should exist here.

When in doubt:

Registry = History

Backlog = Work