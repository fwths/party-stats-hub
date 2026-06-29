# Repository Director Audit Checklist

This checklist is used by the Repository Director at the end of every audit cycle.

Its purpose is to ensure:

- Audit consistency
- Complete report generation
- Correct ownership
- Proper finding lifecycle management
- Reliable release readiness decisions

This checklist should be executed before publishing the Executive Summary.

---

# Audit Metadata

## Audit Date

```text
YYYY-MM-DD
```

---

## Audit Cycle

```text
Monthly
Release
Major Feature
Manual
```

---

## Repository Version

```text
Branch:
Commit:
Tag:
```

---

## Repository Director

```text
Name:
```

---

# Phase 1 — Audit Inputs Validation

Verify all required inputs exist.

---

## Audit Documents

```text
□ PROJECT_CONTEXT.md reviewed

□ FINDING_SCHEMA.md reviewed

□ SEVERITY_MATRIX.md reviewed

□ AUDIT_WORKFLOW.md reviewed

□ FINDINGS_REGISTRY.md reviewed

□ AUDIT_BACKLOG.md reviewed
```

---

## Agent Reports

```text
□ architecture-report.md exists

□ dnd-report.md exists

□ campaign-report.md exists

□ code-quality-report.md exists

□ critic-report.md exists
```

---

## Audit Integrity Check

```text
□ All reports generated during same audit cycle

□ Reports reference current repository version

□ Reports use current audit templates

□ All reports completed successfully
```

---

# Phase 2 — Architecture Review

Review:

```text
architecture-report.md
```

Verify:

```text
□ Architecture score recorded

□ Repository map present

□ Domain model reviewed

□ Domain boundaries reviewed

□ Extensibility reviewed

□ Scalability reviewed

□ Architectural findings identified

□ Data integrity risks identified
```

Questions:

```text
□ Can future content be added?

□ Can homebrew be supported?

□ Is future growth blocked?

□ Are architectural risks understood?
```

---

# Phase 3 — D&D Domain Review

Review:

```text
dnd-report.md
```

Verify:

```text
□ Rules Accuracy Score recorded

□ Character system reviewed

□ Progression reviewed

□ Spellcasting reviewed

□ Multiclassing reviewed

□ Major edge cases reviewed
```

Questions:

```text
□ Are character calculations trustworthy?

□ Are progression rules trustworthy?

□ Would players trust the character sheet?

□ Are high-risk gameplay issues understood?
```

---

# Phase 4 — Campaign Review

Review:

```text
campaign-report.md
```

Verify:

```text
□ Campaign Integrity Score recorded

□ Party systems reviewed

□ Ownership reviewed

□ Membership workflows reviewed

□ Collaboration workflows reviewed

□ DM experience reviewed

□ Player experience reviewed
```

Questions:

```text
□ Can long-running campaigns remain healthy?

□ Can ownership become invalid?

□ Are collaboration risks understood?

□ Are DM workflows acceptable?
```

---

# Phase 5 — Technical Review

Review:

```text
code-quality-report.md
```

Verify:

```text
□ Security Score recorded

□ Reliability Score recorded

□ Performance Score recorded

□ Maintainability Score recorded

□ Testing Assessment completed

□ Operational Review completed

□ Backup Assessment completed

□ Recovery Assessment completed
```

Questions:

```text
□ Is character data recoverable?

□ Is campaign data recoverable?

□ Are deployment risks understood?

□ Are testing gaps understood?
```

---

# Phase 6 — Critic Review

Review:

```text
critic-report.md
```

Verify:

```text
□ Duplicate review performed

□ Severity review performed

□ Ownership review performed

□ Registry review performed

□ Regression review performed
```

Questions:

```text
□ Are duplicate findings resolved?

□ Are severity levels reasonable?

□ Are recommendations realistic?

□ Are findings well supported?
```

---

# Phase 7 — Duplicate Finding Review

Verify:

```text
□ Duplicate findings merged

□ Duplicate IDs removed

□ Root causes consolidated

□ Findings registry updated
```

Questions:

```text
□ Is each finding represented once?

□ Does each finding have a clear owner?

□ Are duplicate recommendations removed?
```

---

# Phase 8 — Ownership Review

Verify:

```text
□ Every finding has a valid owner

□ Ownership matrix followed

□ Ownership conflicts resolved

□ Ambiguous findings reviewed
```

Questions:

```text
□ Does ownership make sense?

□ Is responsibility clear?

□ Does any finding require Director intervention?
```

---

# Phase 9 — Severity Validation

Verify:

```text
□ Critical findings justified

□ High findings justified

□ Severity matrix applied consistently

□ Severity inflation corrected
```

Questions:

```text
□ Are character integrity risks prioritized?

□ Are campaign integrity risks prioritized?

□ Are operational risks appropriately classified?
```

---

# Phase 10 — Findings Registry Review

Review:

```text
FINDINGS_REGISTRY.md
```

Verify:

```text
□ No duplicate IDs exist

□ No reused IDs exist

□ Lifecycle fields are valid

□ Status fields are valid

□ Ownership fields are valid
```

---

## New Findings

```text
□ New findings added

□ IDs assigned correctly

□ Ownership assigned correctly
```

---

## Existing Findings

```text
□ Existing findings reviewed

□ Status reviewed

□ Severity reviewed
```

---

## Resolved Findings

```text
□ Resolution documented

□ Resolution commit recorded

□ Lifecycle updated
```

---

## Regressions

```text
□ Regressions identified

□ Original IDs reused

□ Regression count updated

□ Correct lifecycle applied
```

---

# Phase 11 — Backlog Review

Review:

```text
AUDIT_BACKLOG.md
```

Verify:

```text
□ Critical findings prioritized

□ High findings prioritized

□ Completed findings removed

□ Resolved findings archived

□ Quick wins identified
```

Questions:

```text
□ Is backlog realistic?

□ Are priorities correct?

□ Is engineering work focused on important risks?
```

---

# Phase 12 — Trend Analysis

Compare against previous audits.

Evaluate:

```text
□ Open findings trend

□ Critical findings trend

□ Regression trend

□ Resolution trend

□ Overall health trend
```

Choose:

```text
Improving

Stable

Worsening
```

Provide justification.

---

# Phase 13 — Release Readiness Review

Determine:

```text
Ready For Production

Ready With Remediation

Not Ready
```

---

## Critical Finding Review

```text
□ No unresolved Critical findings

OR

□ Critical findings explicitly accepted
```

---

## Character Integrity Review

```text
□ No unresolved character integrity blockers
```

---

## Campaign Integrity Review

```text
□ No unresolved campaign integrity blockers
```

---

## Security Review

```text
□ No unresolved Critical security blockers
```

---

## Recovery Review

```text
□ Recovery path exists

□ Recovery path documented

□ Backup strategy exists
```

---

# Phase 14 — Executive Summary Generation

Verify:

```text
□ Executive Summary completed

□ Architecture assessment included

□ Rules assessment included

□ Campaign assessment included

□ Technical assessment included

□ Findings summary included

□ Top 10 findings included

□ Quick wins included

□ Roadmap included

□ Final recommendation included
```

---

# Executive Summary Quality Check

Questions:

```text
□ Does the report explain the most important risks?

□ Does the report explain what should happen next?

□ Does the report support decision making?

□ Is the report concise?

□ Is the report actionable?
```

---

# Audit Completion Checklist

The audit is complete only if:

```text
□ Architecture report exists

□ D&D report exists

□ Campaign report exists

□ Code Quality report exists

□ Critic report exists

□ Executive Summary exists

□ Findings Registry updated

□ Audit Backlog updated

□ Ownership disputes resolved

□ Regressions tracked

□ Final recommendation recorded
```

---

# Final Director Decision

## Repository Health

Choose:

```text
Healthy

Healthy With Improvements

Requires Remediation

High Risk
```

---

## Release Readiness

Choose:

```text
Ready For Production

Ready With Remediation

Not Ready
```

---

## Trend

Choose:

```text
Improving

Stable

Worsening
```

---

## Director Notes

Document:

- Most significant risks
- Most significant improvements
- Recommended priorities
- Release concerns
- Follow-up actions

---

# Success Criteria

The Repository Director has succeeded when:

```text
□ Findings are accurate

□ Findings are prioritized

□ Findings are actionable

□ Ownership is clear

□ Regressions are tracked

□ Roadmap is clear

□ Release readiness is understood
```

The purpose of this checklist is not bureaucracy.

The purpose is to ensure that every audit cycle produces reliable, repeatable, decision-quality information.

# Executive Dashboard Checklist

Before publishing the executive summary, verify it includes:

```text
Architecture Score
Rules Accuracy Score
Campaign Integrity Score
Reliability Score
Security Score
Maintainability Score
Operational Readiness Score
Release Status
```

If a score is unavailable, use `Not Provided` and explain why.

---

# Director Quality Gate

The Repository Director should verify:

```text
□ Every official finding passed the evidence gate
□ The Critic reviewed every finding
□ Severity corrections were considered
□ Ownership disputes were resolved
□ Duplicates were merged or removed
□ Not A Findings were not placed in the registry
□ Observations were not assigned permanent finding IDs
```
