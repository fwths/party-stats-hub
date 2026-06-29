# Findings Registry

## Purpose

This document is the authoritative registry of all audit findings.

Every finding created by any audit agent must appear here.

The registry exists to support:

- Finding lifecycle management
- Duplicate prevention
- Regression tracking
- Ownership assignment
- Historical audit analysis
- Release readiness reviews
- Audit trend reporting

This document should never be deleted.

Findings should never be removed from history.

---

# Registry Metadata

```yaml
registry_version: 1.0

created_on: YYYY-MM-DD

last_updated: YYYY-MM-DD

audit_cycle:

maintainer: Repository Director
```

If values are unavailable:

```text
Not Provided
```

---

# Registry Rules

## IDs Are Permanent

Finding IDs must never be:

```text
Reused

Renumbered

Deleted
```

A finding keeps its ID throughout its entire lifecycle.

---

## Regressions Reuse IDs

If a finding returns after being resolved:

Use the original ID.

Example:

```yaml
status: Open

lifecycle: Regressed
```

Do not create a new finding.

---

## Ownership

Every finding must have:

```text
Exactly One Owner
```

Ownership disputes should be escalated to the Repository Director.

---

## Severity

Severity must conform to:

```text
SEVERITY_MATRIX.md
```

Allowed values:

```text
Critical

High

Medium

Low

Info
```

---

# Open Findings

No findings currently recorded.

---

# Resolved Findings

No findings currently recorded.

---

# Regressed Findings

No findings currently recorded.

---

# Rejected Findings

No findings currently recorded.

---

# Finding Entry Template

Use this structure for all registry entries.

```yaml
id:

title:

owner:

severity:

confidence:

status:

lifecycle:

category:

first_detected:

last_reviewed:

location:

summary:

recommendation:

related_findings:

notes:
```

---

# Example Entry

```yaml
id: ARC-001

title: Character Ownership Ambiguity

owner: Architecture & Data Model Agent

severity: High

confidence: High

status: Open

lifecycle: New

category: Domain Boundaries

first_detected: 2026-06-29

last_reviewed: 2026-06-29

location: Character Domain

summary: Character ownership is spread across multiple services.

recommendation: Centralize ownership responsibility.

related_findings: []

notes:
```

---

# Open Findings Summary

```text
Critical: 0

High: 0

Medium: 0

Low: 0

Info: 0
```

---

# Lifecycle Definitions

## New

```yaml
status: Open

lifecycle: New
```

First time a finding appears.

---

## Existing

```yaml
status: Open

lifecycle: Existing
```

Previously identified.

Still unresolved.

---

## Resolved

```yaml
status: Resolved

lifecycle: Resolved
```

Issue is believed fixed.

---

## Regressed

```yaml
status: Open

lifecycle: Regressed
```

Previously resolved.

Issue appears to have returned.

Original ID must be reused.

---

## Rejected

```yaml
status: Rejected
```

Finding determined to be invalid.

Finding remains in history.

---

# Ownership Summary

## Architecture & Data Model Agent

```text
Open Findings: 0
```

---

## D&D Domain Agent

```text
Open Findings: 0
```

---

## Campaign & Collaboration Agent

```text
Open Findings: 0
```

---

## Code Quality & Reliability Agent

```text
Open Findings: 0
```

---

## Repository Director

```text
Open Findings: 0
```

---

# Audit Statistics

```text
Total Findings: 0

Open Findings: 0

Resolved Findings: 0

Regressed Findings: 0

Rejected Findings: 0
```

---

# Audit History

## Audit Cycle Log

No audits have been recorded.

---

# Notes

This registry is intentionally initialized with zero findings.

The first audit cycle should:

1. Create new findings.
2. Assign IDs.
3. Populate ownership.
4. Populate severity.
5. Populate lifecycle state.
6. Update statistics.

The registry becomes the authoritative historical source after Audit #1.

Until then, this document serves as the initialized baseline for the audit framework.