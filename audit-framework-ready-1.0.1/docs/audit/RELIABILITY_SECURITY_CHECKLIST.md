# Reliability & Security Checklist

This document defines the standard reliability, security, operational readiness, recovery, testing, and deployment review checklist used by the Code Quality & Reliability Agent.

The purpose of this document is to:

- Standardize technical audits
- Reduce blind spots
- Improve consistency across audit cycles
- Protect character data
- Protect campaign data
- Improve operational safety
- Improve recoverability
- Reduce regression risk

This checklist should guide investigation.

Not every item will apply to every repository.

Not every item should become a finding.

The goal is to identify meaningful technical risks.

---

# Review Methodology

For every section classify items as:

```text
Present
Partially Present
Missing
Not Applicable
```

Then determine:

```text
Low Risk
Medium Risk
High Risk
Critical Risk
```

Do not create findings solely because an item is missing.

Consider:

- Repository size
- System maturity
- Deployment model
- Actual business impact

---

# Priority Order

Technical risks should be prioritized in the following order:

## Priority 1

Character Data Integrity

---

## Priority 2

Campaign Data Integrity

---

## Priority 3

Authentication & Authorization

---

## Priority 4

Backup & Recovery

---

## Priority 5

Reliability

---

## Priority 6

Deployment Safety

---

## Priority 7

Performance

---

## Priority 8

Monitoring

---

## Priority 9

Maintainability

---

# Authentication Checklist

Review authentication implementation.

---

## AUTH-001

Authentication Required

Verify:

```text
Authentication exists.

Anonymous access is intentional.
```

Risk:

```text
Unauthorized access
```

---

## AUTH-002

Authentication Enforcement

Verify:

```text
Protected actions require authentication.
```

Examples:

```text
Campaign edits

Character edits

Party changes

Ownership changes
```

Risk:

```text
Unauthorized modification
```

---

## AUTH-003

Session Validation

Verify:

```text
Sessions are validated.

Expired sessions are handled.
```

Risk:

```text
Stale access
```

---

## AUTH-004

Identity Consistency

Verify:

```text
Single source of truth exists for identity.
```

Risk:

```text
Ownership inconsistencies
```

---

# Authorization Checklist

Review permission enforcement.

---

## AUTHZ-001

Ownership Validation

Verify:

```text
Ownership checked before modification.
```

Examples:

```text
Campaign edits
Character deletion
Ownership transfer
```

Risk:

```text
Data corruption
```

---

## AUTHZ-002

Permission Enforcement

Verify:

```text
Permissions enforced server-side.
```

Risk:

```text
Privilege escalation
```

---

## AUTHZ-003

Role Validation

Verify:

```text
Role changes update permissions correctly.
```

Risk:

```text
Invalid access
```

---

## AUTHZ-004

Default Access

Verify:

```text
Default permissions are restrictive.
```

Risk:

```text
Excessive access exposure
```

---

# Input Validation Checklist

Review:

- APIs
- Forms
- Import systems
- External integrations

---

## INPUT-001

Input Validation

Verify:

```text
Expected validation exists.
```

Risk:

```text
Corruption
Injection
Unexpected behavior
```

---

## INPUT-002

Boundary Validation

Verify:

```text
Limits enforced.
```

Examples:

```text
Levels

Ability Scores

Inventory Counts
```

Risk:

```text
Invalid state
```

---

## INPUT-003

Import Validation

Verify:

```text
Imported data validated.
```

Risk:

```text
Invalid characters
Corruption
```

---

# Data Integrity Checklist

One of the highest-priority review areas.

---

## DATA-001

Single Source Of Truth

Verify:

```text
Critical data exists in one authoritative location.
```

Examples:

```text
Character level

Campaign owner

Permissions
```

Risk:

```text
Synchronization errors
```

---

## DATA-002

Consistency Enforcement

Verify:

```text
Business invariants enforced.
```

Examples:

```text
Campaign owner exists

Level remains valid

Membership remains valid
```

Risk:

```text
Corrupted state
```

---

## DATA-003

Transactional Updates

Verify:

```text
Related changes remain consistent.
```

Risk:

```text
Partial updates
```

---

## DATA-004

Ownership Integrity

Verify:

```text
Ownership remains valid after changes.
```

Risk:

```text
Orphaned records
```

---

# Reliability Checklist

Review system behavior during failure.

---

## REL-001

Error Handling

Verify:

```text
Errors handled intentionally.
```

Risk:

```text
Unexpected crashes
```

---

## REL-002

Failure Recovery

Verify:

```text
System recovers gracefully.
```

Risk:

```text
Persistent failure
```

---

## REL-003

Retry Safety

Verify:

```text
Repeated requests remain safe.
```

Risk:

```text
Duplicate operations
```

---

## REL-004

Concurrent Update Safety

Verify:

```text
Simultaneous changes handled correctly.
```

Examples:

```text
Campaign updates

Character updates
```

Risk:

```text
Lost updates
```

---

## REL-005

Idempotency

Verify:

```text
Repeated actions do not corrupt state.
```

Risk:

```text
Duplicate data
```

---

# Persistence Checklist

Review storage safety.

---

## PERS-001

Save Safety

Verify:

```text
Save operations complete successfully.
```

Risk:

```text
Data loss
```

---

## PERS-002

Load Consistency

Verify:

```text
Loaded state matches saved state.
```

Risk:

```text
Incorrect character sheets
```

---

## PERS-003

Delete Safety

Verify:

```text
Deletion handled intentionally.
```

Risk:

```text
Unrecoverable loss
```

---

## PERS-004

Migration Safety

Verify:

```text
Schema changes preserve existing data.
```

Risk:

```text
Data corruption
```

---

# Backup Checklist

Critical for production readiness.

---

## BACKUP-001

Backup Strategy Exists

Verify:

```text
Backup process documented.
```

Risk:

```text
Irrecoverable loss
```

---

## BACKUP-002

Backup Frequency Defined

Verify:

```text
Backup schedule exists.
```

Risk:

```text
Excessive recovery loss
```

---

## BACKUP-003

Backup Coverage

Verify:

```text
All critical data included.
```

Examples:

```text
Characters

Campaigns

Users

Sessions
```

Risk:

```text
Partial recovery
```

---

## BACKUP-004

Restore Procedure Exists

Verify:

```text
Recovery process documented.
```

Risk:

```text
False confidence
```

---

# Recovery Checklist

Review disaster recovery readiness.

---

## REC-001

Recovery Procedure Exists

Verify:

```text
Data restoration documented.
```

---

## REC-002

Rollback Strategy Exists

Verify:

```text
Deployment rollback possible.
```

---

## REC-003

Migration Rollback Exists

Verify:

```text
Schema rollback strategy exists.
```

---

## REC-004

Recovery Testing

Verify:

```text
Restore process validated.
```

Risk:

```text
Unusable backups
```

---

# Deployment Checklist

Review release safety.

---

## DEPLOY-001

Deployment Process Defined

Verify:

```text
Deployment workflow documented.
```

---

## DEPLOY-002

Environment Validation

Verify:

```text
Config validated before startup.
```

---

## DEPLOY-003

Secrets Handling

Verify:

```text
Secrets not committed to repository.
```

Risk:

```text
Credential exposure
```

---

## DEPLOY-004

Rollback Capability

Verify:

```text
Failed deployment reversible.
```

---

# Monitoring Checklist

Review observability.

---

## MON-001

Application Logging

Verify:

```text
Errors logged.
```

---

## MON-002

Audit Events Logged

Verify:

```text
Ownership changes logged.

Permission failures logged.
```

---

## MON-003

Health Checks

Verify:

```text
Health indicators exist.
```

---

## MON-004

Failure Visibility

Verify:

```text
Failed saves detectable.
```

Risk:

```text
Silent corruption
```

---

# Performance Checklist

Review scalability risks.

---

## PERF-001

N+1 Query Risk

Verify:

```text
Repeated queries avoided.
```

---

## PERF-002

Unbounded Data Operations

Verify:

```text
Large datasets handled safely.
```

Examples:

```text
Characters

Campaigns

Sessions

Items
```

---

## PERF-003

Expensive Recalculation

Verify:

```text
Critical calculations efficient.
```

Examples:

```text
Character sheets
Spell calculations
```

---

## PERF-004

Pagination

Verify:

```text
Large collections handled safely.
```

---

# Testing Checklist

Review test protection.

---

## TEST-001

Unit Tests

Verify:

```text
Critical logic covered.
```

---

## TEST-002

Integration Tests

Verify:

```text
Major workflows covered.
```

---

## TEST-003

Regression Tests

Verify:

```text
Past defects protected.
```

---

## TEST-004

Rules Regression Coverage

Verify:

```text
Critical calculation paths protected.
```

Use:

```text
RULES_TEST_MATRIX.md
```

---

## TEST-005

Campaign Workflow Coverage

Verify:

```text
Critical campaign scenarios protected.
```

Use:

```text
CAMPAIGN_SCENARIOS.md
```

---

# Red Flag Indicators

Immediate investigation should occur when:

```text
No backups

No restore process

No ownership validation

No authorization enforcement

No migration strategy

No error handling

No logging

No regression tests

No concurrency strategy
```

These frequently correlate with significant future failures.

---

# Operational Readiness Rating

Rate:

```text
Excellent

Strong

Adequate

Concerning

High Risk
```

Guidance:

Excellent

```text
Recovery, monitoring, testing,
and deployment maturity present.
```

Strong

```text
Minor gaps only.
```

Adequate

```text
Manageable technical risk.
```

Concerning

```text
Material gaps exist.
```

High Risk

```text
Data integrity or operational safety
cannot be trusted.
```

---

# Success Criteria

A technically healthy platform should demonstrate:

- Character data protection
- Campaign data protection
- Ownership integrity
- Reliable persistence
- Safe deployments
- Verified recovery
- Effective monitoring
- Meaningful regression coverage

The final question should always be:

> If the application fails unexpectedly, can users recover their characters, campaigns, and progress safely?

If the answer is yes, the platform meets its minimum operational reliability standard.