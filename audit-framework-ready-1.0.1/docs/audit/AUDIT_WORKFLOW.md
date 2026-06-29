# Audit Workflow

## Purpose

This document defines the audit methodology.

It explains:

- How audits are executed
- Which agents participate
- Which artifacts are consumed
- Which artifacts are produced
- How findings move through the lifecycle
- How regressions are handled
- How release readiness is determined

AUDIT_WORKFLOW.md defines audit behavior.

AUDIT_BOOTSTRAP.md defines audit execution.

---

# Audit Principles

The objective of the audit system is not:

```text
Maximum Findings
```

The objective is:

```text
Maximum Confidence
```

Confidence in:

- Character Integrity
- Campaign Integrity
- Rules Correctness
- Security
- Reliability
- Recoverability
- Maintainability
- Scalability

---

# Audit Inputs

Every audit cycle should begin with the following documents.

## Core Governance Documents

```text
PROJECT_CONTEXT.md

FINDING_SCHEMA.md

SEVERITY_MATRIX.md

FINDINGS_REGISTRY.md

FINDING_ID_GUIDELINES.md

AUDIT_BACKLOG.md

REPORT_TEMPLATE.md
```

---

## Architecture Diagnostics

```text
ARCHITECTURE_RED_FLAGS.md
```

Used by:

```text
Architecture & Data Model Agent
```

---

## Rules Diagnostics

```text
RULES_TEST_MATRIX.md
```

Used by:

```text
D&D Domain Agent
```

---

## Campaign Diagnostics

```text
CAMPAIGN_SCENARIOS.md
```

Used by:

```text
Campaign & Collaboration Agent
```

---

## Technical Diagnostics

```text
RELIABILITY_SECURITY_CHECKLIST.md
```

Used by:

```text
Code Quality & Reliability Agent
```

---

## Governance Diagnostics

```text
DIRECTOR_CHECKLIST.md
```

Used by:

```text
Repository Director
```

---

## Architectural Decision Records

Optional but recommended:

```text
/adr/*.md
```

Examples:

```text
ADR-001 Character Domain Model

ADR-002 Campaign Ownership Model

ADR-003 Rules Engine Design
```

Used by:

```text
Architecture & Data Model Agent
Repository Director
```

---

# Agent Responsibilities

## Architecture & Data Model Agent

Primary responsibility:

```text
Architecture
```

Focus:

```text
System Structure

Domain Model

Ownership

Extensibility

Scalability

Architectural Debt
```

Diagnostic Guide:

```text
ARCHITECTURE_RED_FLAGS.md
```

Output:

```text
architecture-report.md
```

---

## D&D Domain Agent

Primary responsibility:

```text
Gameplay Correctness
```

Focus:

```text
Character Calculations

Rules Engine

Spellcasting

Progression

Conditions

Inventory Rules
```

Diagnostic Guide:

```text
RULES_TEST_MATRIX.md
```

Output:

```text
dnd-report.md
```

---

## Campaign & Collaboration Agent

Primary responsibility:

```text
Campaign Integrity
```

Focus:

```text
Ownership

Membership

Parties

Collaboration

Sessions

Permissions

DM Experience
```

Diagnostic Guide:

```text
CAMPAIGN_SCENARIOS.md
```

Output:

```text
campaign-report.md
```

---

## Code Quality & Reliability Agent

Primary responsibility:

```text
Technical Risk
```

Focus:

```text
Security

Reliability

Performance

Testing

Recovery

Deployment

Operations
```

Diagnostic Guide:

```text
RELIABILITY_SECURITY_CHECKLIST.md
```

Output:

```text
code-quality-report.md
```

---

## Critic Agent

Primary responsibility:

```text
Audit Quality
```

Focus:

```text
Duplicates

Ownership

Severity

Evidence

Registry Consistency
```

Output:

```text
critic-report.md
```

---

## Repository Director

Primary responsibility:

```text
Risk Prioritization
```

Focus:

```text
Roadmaps

Ownership Conflicts

Release Readiness

Trend Analysis

Executive Reporting
```

Diagnostic Guide:

```text
DIRECTOR_CHECKLIST.md
```

Output:

```text
executive-summary.md
```

---

# Audit Sequence

The audit flows through the following stages.

```text
Architecture
      ↓
D&D + Campaign
      ↓
Code Quality
      ↓
Critic
      ↓
Repository Director
```

---

# Stage 1 — Architecture Audit

Inputs:

```text
Repository Source Code

PROJECT_CONTEXT.md

FINDING_SCHEMA.md

SEVERITY_MATRIX.md

FINDINGS_REGISTRY.md

FINDING_ID_GUIDELINES.md

ARCHITECTURE_RED_FLAGS.md

REPORT_TEMPLATE.md

ADRs
```

Output:

```text
architecture-report.md
```

Required Reviews:

```text
Repository Mapping

Domain Review

Aggregate Review

Architecture Red Flag Review

ADR Review
```

---

# Stage 2A — D&D Audit

Inputs:

```text
Repository Source Code

PROJECT_CONTEXT.md

FINDING_SCHEMA.md

SEVERITY_MATRIX.md

FINDINGS_REGISTRY.md

FINDING_ID_GUIDELINES.md

RULES_TEST_MATRIX.md

REPORT_TEMPLATE.md

architecture-report.md
```

Output:

```text
dnd-report.md
```

Required Reviews:

```text
Rules Coverage Assessment

Multiclass Review

Spellcasting Review

Character Review
```

---

# Stage 2B — Campaign Audit

Inputs:

```text
Repository Source Code

PROJECT_CONTEXT.md

FINDING_SCHEMA.md

SEVERITY_MATRIX.md

FINDINGS_REGISTRY.md

FINDING_ID_GUIDELINES.md

CAMPAIGN_SCENARIOS.md

REPORT_TEMPLATE.md

architecture-report.md
```

Output:

```text
campaign-report.md
```

Required Reviews:

```text
Scenario Coverage Assessment

Ownership Review

Membership Review

Collaboration Review
```

---

# Stage 3 — Code Quality Audit

Inputs:

```text
Repository Source Code

PROJECT_CONTEXT.md

FINDING_SCHEMA.md

SEVERITY_MATRIX.md

FINDINGS_REGISTRY.md

FINDING_ID_GUIDELINES.md

RELIABILITY_SECURITY_CHECKLIST.md

REPORT_TEMPLATE.md

architecture-report.md

dnd-report.md

campaign-report.md
```

Output:

```text
code-quality-report.md
```

Required Reviews:

```text
Reliability & Security Checklist Assessment

Security Review

Reliability Review

Testing Review

Recovery Review

Deployment Review
```

---

# Stage 4 — Critic Review

Inputs:

```text
PROJECT_CONTEXT.md

FINDING_SCHEMA.md

SEVERITY_MATRIX.md

FINDINGS_REGISTRY.md

FINDING_ID_GUIDELINES.md

REPORT_TEMPLATE.md

architecture-report.md

dnd-report.md

campaign-report.md

code-quality-report.md
```

Output:

```text
critic-report.md
```

Required Reviews:

```text
Duplicates

Ownership

Severity

Evidence

Registry Consistency

Regressions
```

---

# Stage 5 — Repository Director Review

Inputs:

```text
PROJECT_CONTEXT.md

FINDING_SCHEMA.md

SEVERITY_MATRIX.md

FINDINGS_REGISTRY.md

FINDING_ID_GUIDELINES.md

AUDIT_BACKLOG.md

DIRECTOR_CHECKLIST.md

REPORT_TEMPLATE.md

architecture-report.md

dnd-report.md

campaign-report.md

code-quality-report.md

critic-report.md
```

Output:

```text
executive-summary.md
```

Required Reviews:

```text
Repository Health

Roadmaps

Regression Trends

Release Readiness

Top Risks

Quick Wins
```

---

# Finding Lifecycle

Every finding exists in one lifecycle state.

## New

```yaml
status: Open
lifecycle: New
```

---

## Existing

```yaml
status: Open
lifecycle: Existing
```

---

## Resolved

```yaml
status: Resolved
lifecycle: Resolved
```

---

## Regressed

```yaml
status: Open
lifecycle: Regressed
```

Original IDs must be reused.

---

# Duplicate Handling

Before creating a finding:

Check:

```text
Same root cause?

Same subsystem?

Same remediation?

Same business impact?
```

If yes:

Reuse the existing finding.

Do not create a new ID.

Reference:

```text
FINDINGS_REGISTRY.md
```

---

# Ownership Rules

Each finding must have:

```text
One Owner
```

Only one.

If ownership is unclear:

```text
Ownership Review Required
```

and escalate to:

```text
Repository Director
```

---

# Severity Rules

Use:

```text
SEVERITY_MATRIX.md
```

as the source of truth.

Severity must be assigned consistently across all reports.

---

# Release Readiness

Final release recommendation must be one of:

```text
Ready For Production

Ready With Remediation

Not Ready
```

The Repository Director makes the final determination.

---

# Audit Success Criteria

An audit cycle is successful when:

```text
Architecture reviewed

Gameplay reviewed

Campaign reviewed

Code quality reviewed

Findings validated

Registry updated

Backlog updated

Roadmap generated

Release readiness determined
```

The end result should provide a clear answer to:

> Can the platform safely support character management, campaign management, future development, and long‑term growth?

---

# Repository Director Post-Processing

After the Critic review, the Repository Director is responsible for:

- Updating FINDINGS_REGISTRY.md
- Updating AUDIT_BACKLOG.md
- Publishing executive-summary.md

This step closes the audit lifecycle and establishes the authoritative audit state.
