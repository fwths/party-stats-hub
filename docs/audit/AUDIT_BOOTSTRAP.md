# Audit Bootstrap

## Purpose

This document is the practical runbook for starting and completing an audit cycle.

It defines:

- Which agents run
- In what order they run
- Which inputs each agent receives
- Which outputs each agent must produce
- Which documents must be updated at the end
- How the audit cycle becomes repeatable

This file is the operational entry point for running the full audit system.

Use this document when starting a new audit cycle.

---

# Audit Framework Version

```text
Audit Framework Version: v1.0.1
```

Do not modify agent prompts, audit documents, or templates during an active audit cycle.

If the framework changes, record the change and apply it to the next audit cycle.

---

# Audit Cycle Metadata

Before starting, define:

```yaml
audit_cycle:

audit_type:

repository_branch:

repository_commit:

started_on:

operator:
```

Example:

```yaml
audit_cycle: 2026-06-initial-audit

audit_type: Full Repository Audit

repository_branch: main

repository_commit: Not Provided

started_on: 2026-06-29

operator: Fotis
```

If a value is unavailable, use:

```text
Not Provided
```

Do not invent missing values.

---

# Required Repository Folders

Before running the audit, ensure these folders exist:

```text
/agents

/docs/audit

/docs/adr

/audit-results

/schemas
```

---

# Required Agent Files

The following agent prompts should exist:

```text
/.agents/audit/architecture-agent.md

/.agents/audit/dnd-agent.md

/.agents/audit/campaign-agent.md

/.agents/audit/code-quality-agent.md

/.agents/audit/critic-agent.md

/.agents/audit/repository-director.md
```

---

# Required Audit Documents

The following audit documents should exist:

```text
/docs/audit/PROJECT_CONTEXT.md

/docs/audit/FINDING_SCHEMA.md

/docs/audit/SEVERITY_MATRIX.md

/docs/audit/FINDINGS_REGISTRY.md

/docs/audit/FINDING_ID_GUIDELINES.md

/docs/audit/AUDIT_BACKLOG.md

/docs/audit/AUDIT_WORKFLOW.md

/docs/audit/REPORT_TEMPLATE.md

/docs/audit/DIRECTOR_CHECKLIST.md

/docs/audit/ARCHITECTURE_RED_FLAGS.md

/docs/audit/RULES_TEST_MATRIX.md

/docs/audit/CAMPAIGN_SCENARIOS.md

/docs/audit/RELIABILITY_SECURITY_CHECKLIST.md
```

---

# Required Structured Schemas

The framework validator also requires:

```text
/schemas/audit/finding.schema.json

/schemas/audit/report.schema.json
```

These schemas define optional structured companions to the required Markdown reports and keep finding fields machine-checkable.

---

# Optional But Recommended Documents

The following documents are optional but recommended:

```text
/docs/adr/ADR-001 Character Domain Model.md

/docs/adr/ADR-002 Campaign Ownership Model.md

/docs/adr/ADR-003 Rules Engine Design.md

/docs/adr/ADR-004 Homebrew Strategy.md

/docs/adr/ADR-005 Party Collaboration Model.md
```

If no ADRs exist, agents should state:

```text
No ADRs were provided.
```

They must not fabricate ADR content.

---

# Required Output Files

The audit cycle should produce:

```text
/audit-results/architecture-report.md

/audit-results/dnd-report.md

/audit-results/campaign-report.md

/audit-results/code-quality-report.md

/audit-results/critic-report.md

/audit-results/executive-summary.md
```

---

# Full Audit Execution Order

The full audit must run in this order:

```text
1. Architecture & Data Model Agent

2. D&D Domain Agent
   Campaign & Collaboration Agent

3. Code Quality & Reliability Agent

4. Critic Agent

5. Repository Director
```

D&D and Campaign audits may run in parallel after the Architecture audit completes.

All other stages should run sequentially.

---

# Stage 0 — Audit Preparation

## Responsible Role

```text
Repository Operator
```

## Inputs

```text
Repository Source Code

/docs/audit/PROJECT_CONTEXT.md

/docs/audit/FINDING_SCHEMA.md

/docs/audit/SEVERITY_MATRIX.md

/docs/audit/FINDINGS_REGISTRY.md

/docs/audit/FINDING_ID_GUIDELINES.md

/docs/audit/AUDIT_BACKLOG.md

/docs/audit/REPORT_TEMPLATE.md
```

## Preparation Checklist

```text
□ Repository source code available

□ /agents folder exists

□ /docs/audit folder exists

□ /audit-results folder exists

□ PROJECT_CONTEXT.md is current

□ FINDINGS_REGISTRY.md exists

□ AUDIT_BACKLOG.md exists

□ Agent prompts are finalized for this audit cycle

□ Audit framework version recorded
```

## Output

No formal report is required.

Proceed to Stage 1 when preparation is complete.

---

# Stage 1 — Architecture Audit

## Agent

```text
Architecture & Data Model Agent
```

## Agent Prompt

```text
/.agents/audit/architecture-agent.md
```

## Required Inputs

```text
Repository Source Code

/docs/audit/PROJECT_CONTEXT.md

/docs/audit/FINDING_SCHEMA.md

/docs/audit/SEVERITY_MATRIX.md

/docs/audit/FINDINGS_REGISTRY.md

/docs/audit/FINDING_ID_GUIDELINES.md

/docs/audit/ARCHITECTURE_RED_FLAGS.md

/docs/audit/REPORT_TEMPLATE.md

/docs/adr/*.md
```

## Primary Diagnostic Document

```text
/docs/audit/ARCHITECTURE_RED_FLAGS.md
```

## Required Output

```text
/audit-results/architecture-report.md
```

## Architecture Agent Request

Use this request:

```text
Perform the Architecture & Data Model audit using /.agents/audit/architecture-agent.md.

Use all required inputs listed in AUDIT_BOOTSTRAP.md.

Review ARCHITECTURE_RED_FLAGS.md as the diagnostic guide.

Review ADRs if present.

Produce:

/audit-results/architecture-report.md

Follow REPORT_TEMPLATE.md while preserving all architecture-specific output sections.
```

## Completion Checklist

```text
□ Repository Map included

□ Domain Model included

□ Aggregate Analysis included

□ Architecture Red Flag Assessment included

□ ADR Assessment included

□ Findings Summary included

□ Detailed Findings included

□ Confidence Assessment included

□ Release Impact included

□ Final Recommendation included
```

---

# Stage 2A — D&D Domain Audit

This stage may run in parallel with Stage 2B.

## Agent

```text
D&D Domain Agent
```

## Agent Prompt

```text
/.agents/audit/dnd-agent.md
```

## Required Inputs

```text
Repository Source Code

/docs/audit/PROJECT_CONTEXT.md

/docs/audit/FINDING_SCHEMA.md

/docs/audit/SEVERITY_MATRIX.md

/docs/audit/FINDINGS_REGISTRY.md

/docs/audit/FINDING_ID_GUIDELINES.md

/docs/audit/RULES_TEST_MATRIX.md

/docs/audit/REPORT_TEMPLATE.md

/audit-results/architecture-report.md
```

## Primary Diagnostic Document

```text
/docs/audit/RULES_TEST_MATRIX.md
```

## Required Output

```text
/audit-results/dnd-report.md
```

## D&D Agent Request

Use this request:

```text
Perform the D&D Domain audit using /.agents/audit/dnd-agent.md.

Use all required inputs listed in AUDIT_BOOTSTRAP.md.

Use architecture-report.md as architectural context.

Review RULES_TEST_MATRIX.md as the diagnostic guide.

Produce:

/audit-results/dnd-report.md

Follow REPORT_TEMPLATE.md while preserving all D&D-specific output sections.
```

## Completion Checklist

```text
□ Rules Accuracy Score included

□ Rules Coverage Assessment included

□ Character System Assessment included

□ Spellcasting Assessment included

□ Multiclass Assessment included

□ Gameplay Integrity Risks included

□ Findings Summary included

□ Detailed Findings included

□ Confidence Assessment included

□ Release Impact included

□ Final Recommendation included
```

---

# Stage 2B — Campaign & Collaboration Audit

This stage may run in parallel with Stage 2A.

## Agent

```text
Campaign & Collaboration Agent
```

## Agent Prompt

```text
/.agents/audit/campaign-agent.md
```

## Required Inputs

```text
Repository Source Code

/docs/audit/PROJECT_CONTEXT.md

/docs/audit/FINDING_SCHEMA.md

/docs/audit/SEVERITY_MATRIX.md

/docs/audit/FINDINGS_REGISTRY.md

/docs/audit/FINDING_ID_GUIDELINES.md

/docs/audit/CAMPAIGN_SCENARIOS.md

/docs/audit/REPORT_TEMPLATE.md

/audit-results/architecture-report.md
```

## Primary Diagnostic Document

```text
/docs/audit/CAMPAIGN_SCENARIOS.md
```

## Required Output

```text
/audit-results/campaign-report.md
```

## Campaign Agent Request

Use this request:

```text
Perform the Campaign & Collaboration audit using /.agents/audit/campaign-agent.md.

Use all required inputs listed in AUDIT_BOOTSTRAP.md.

Use architecture-report.md as architectural context.

Review CAMPAIGN_SCENARIOS.md as the diagnostic guide.

Produce:

/audit-results/campaign-report.md

Follow REPORT_TEMPLATE.md while preserving all campaign-specific output sections.
```

## Completion Checklist

```text
□ Campaign Health Score included

□ Scenario Coverage Assessment included

□ Campaign Assessment included

□ Party Assessment included

□ Ownership Assessment included

□ Collaboration Assessment included

□ Dungeon Master Experience Assessment included

□ Player Experience Assessment included

□ Findings Summary included

□ Detailed Findings included

□ Confidence Assessment included

□ Release Impact included

□ Final Recommendation included
```

---

# Stage 3 — Code Quality & Reliability Audit

## Agent

```text
Code Quality & Reliability Agent
```

## Agent Prompt

```text
/.agents/audit/code-quality-agent.md
```

## Required Inputs

```text
Repository Source Code

/docs/audit/PROJECT_CONTEXT.md

/docs/audit/FINDING_SCHEMA.md

/docs/audit/SEVERITY_MATRIX.md

/docs/audit/FINDINGS_REGISTRY.md

/docs/audit/FINDING_ID_GUIDELINES.md

/docs/audit/RELIABILITY_SECURITY_CHECKLIST.md

/docs/audit/REPORT_TEMPLATE.md

/audit-results/architecture-report.md

/audit-results/dnd-report.md

/audit-results/campaign-report.md
```

## Primary Diagnostic Document

```text
/docs/audit/RELIABILITY_SECURITY_CHECKLIST.md
```

## Required Output

```text
/audit-results/code-quality-report.md
```

## Code Quality Agent Request

Use this request:

```text
Perform the Code Quality & Reliability audit using /.agents/audit/code-quality-agent.md.

Use all required inputs listed in AUDIT_BOOTSTRAP.md.

Use architecture-report.md, dnd-report.md, and campaign-report.md as context.

Review RELIABILITY_SECURITY_CHECKLIST.md as the diagnostic guide.

Produce:

/audit-results/code-quality-report.md

Follow REPORT_TEMPLATE.md while preserving all code-quality-specific output sections.
```

## Completion Checklist

```text
□ Reliability & Security Checklist Assessment included

□ Reliability Score included

□ Security Score included

□ Performance Score included

□ Maintainability Score included

□ Operational Readiness Score included

□ Testing Assessment included

□ Backup Assessment included

□ Recovery Assessment included

□ Deployment Risks included

□ Findings Summary included

□ Detailed Findings included

□ Confidence Assessment included

□ Release Impact included

□ Final Recommendation included
```

---

# Stage 4 — Critic Review

## Agent

```text
Critic Agent
```

## Agent Prompt

```text
/.agents/audit/critic-agent.md
```

## Required Inputs

```text
/docs/audit/PROJECT_CONTEXT.md

/docs/audit/FINDING_SCHEMA.md

/docs/audit/SEVERITY_MATRIX.md

/docs/audit/FINDINGS_REGISTRY.md

/docs/audit/FINDING_ID_GUIDELINES.md

/docs/audit/REPORT_TEMPLATE.md

/audit-results/architecture-report.md

/audit-results/dnd-report.md

/audit-results/campaign-report.md

/audit-results/code-quality-report.md
```

## Required Output

```text
/audit-results/critic-report.md
```

## Critic Agent Request

Use this request:

```text
Perform the Critic review using /.agents/audit/critic-agent.md.

Do not review source code.

Review only the generated audit reports and audit tracking documents.

Validate:

- Evidence quality
- Duplicate findings
- Severity accuracy
- Ownership accuracy
- Regression handling
- Registry consistency

Produce:

/audit-results/critic-report.md

Follow REPORT_TEMPLATE.md while preserving all critic-specific output sections.
```

## Completion Checklist

```text
□ Confirmed Findings included

□ Findings With Changes included

□ Severity Corrections included

□ Ownership Reviews included

□ Duplicate Findings included

□ Findings Needing More Evidence included

□ Rejected Findings included

□ Registry Review included

□ Regression Review included

□ Final Prioritized Risk List included

□ Overall Audit Confidence included
```

---

# Stage 5 — Repository Director Review

## Agent

```text
Repository Director
```

## Agent Prompt

```text
/.agents/audit/repository-director.md
```

## Required Inputs

```text
/docs/audit/PROJECT_CONTEXT.md

/docs/audit/FINDING_SCHEMA.md

/docs/audit/SEVERITY_MATRIX.md

/docs/audit/FINDINGS_REGISTRY.md

/docs/audit/FINDING_ID_GUIDELINES.md

/docs/audit/AUDIT_BACKLOG.md

/docs/audit/DIRECTOR_CHECKLIST.md

/docs/audit/REPORT_TEMPLATE.md

/audit-results/architecture-report.md

/audit-results/dnd-report.md

/audit-results/campaign-report.md

/audit-results/code-quality-report.md

/audit-results/critic-report.md
```

## Primary Governance Document

```text
/docs/audit/DIRECTOR_CHECKLIST.md
```

## Required Output

```text
/audit-results/executive-summary.md
```

## Repository Director Request

Use this request:

```text
Perform the Repository Director review using /.agents/audit/repository-director.md.

Do not review source code.

Use all reports and governance documents listed in AUDIT_BOOTSTRAP.md.

Use DIRECTOR_CHECKLIST.md as the final validation checklist.

Produce:

/audit-results/executive-summary.md

Include:

- Executive Summary
- Overall Repository Health
- Architecture Assessment
- Rules Engine Assessment
- Campaign Assessment
- Technical Quality Assessment
- Open Findings Trend
- Regressed Findings
- Ownership Decisions
- Top 10 Critical Findings
- Top 10 Quick Wins
- 30-Day Roadmap
- 90-Day Roadmap
- Long-Term Roadmap
- Final Scores
- Final Recommendation
```

## Completion Checklist

```text
□ Executive Summary included

□ Top 10 Critical Findings included

□ Top 10 Quick Wins included

□ Roadmaps included

□ Ownership Decisions included

□ Regressed Findings included

□ Final Scores included

□ Final Recommendation included

□ Release readiness decided
```

---

# Stage 6 — Registry And Backlog Update

## Responsible Role

```text
Repository Operator
```

or

```text
Repository Director
```

## Inputs

```text
/audit-results/executive-summary.md

/audit-results/critic-report.md

/docs/audit/FINDINGS_REGISTRY.md

/docs/audit/AUDIT_BACKLOG.md
```

## Required Updates

Update:

```text
/docs/audit/FINDINGS_REGISTRY.md

/docs/audit/AUDIT_BACKLOG.md
```

## Registry Update Rules

For each official finding:

```text
□ Confirm ID

□ Confirm owner

□ Confirm severity

□ Confirm confidence

□ Confirm status

□ Confirm lifecycle

□ Confirm first_detected

□ Confirm last_reviewed

□ Confirm location

□ Confirm recommendation
```

## Backlog Update Rules

Add actionable findings to:

```text
Critical Priority

High Priority

Medium Priority

Low Priority

Blocked Findings

Ready For Validation
```

as appropriate.

---

# Stage 7 — Audit Completion

The audit is complete only when:

```text
□ architecture-report.md exists

□ dnd-report.md exists

□ campaign-report.md exists

□ code-quality-report.md exists

□ critic-report.md exists

□ executive-summary.md exists

□ FINDINGS_REGISTRY.md updated

□ AUDIT_BACKLOG.md updated

□ Ownership disputes resolved or documented

□ Regressions tracked

□ Final recommendation recorded
```

---

# Pull Request Audit Workflow

For normal pull requests, do not run the full workflow unless necessary.

Run:

```text
D&D Domain Agent

Code Quality & Reliability Agent
```

Use changed files only where possible.

## Pull Request Inputs

```text
Changed files

PROJECT_CONTEXT.md

FINDING_SCHEMA.md

SEVERITY_MATRIX.md

FINDINGS_REGISTRY.md

FINDING_ID_GUIDELINES.md

RULES_TEST_MATRIX.md

RELIABILITY_SECURITY_CHECKLIST.md
```

## Pull Request Outputs

```text
/audit-results/pr-dnd-report.md

/audit-results/pr-code-quality-report.md
```

---

# Weekly Audit Workflow

Run:

```text
Campaign & Collaboration Agent
```

Use:

```text
CAMPAIGN_SCENARIOS.md

FINDINGS_REGISTRY.md

AUDIT_BACKLOG.md
```

Focus on:

- Campaign workflows
- Party workflows
- Ownership
- Collaboration
- UX friction

---

# Monthly Audit Workflow

Run:

```text
Architecture & Data Model Agent
```

Use:

```text
ARCHITECTURE_RED_FLAGS.md

ADRs

FINDINGS_REGISTRY.md
```

Focus on:

- Architectural drift
- Extensibility
- Domain boundaries
- Red flags

---

# Release Audit Workflow

Before a major release, run the full workflow:

```text
Stage 0

Stage 1

Stage 2A

Stage 2B

Stage 3

Stage 4

Stage 5

Stage 6

Stage 7
```

A release should not proceed if unresolved Critical findings exist unless explicitly accepted and documented.

---

# Audit Success Criteria

A successful audit produces:

```text
Complete reports

Unique findings

Clear ownership

Validated severity

Updated registry

Updated backlog

Release recommendation

Actionable roadmap
```

The audit system succeeds when it improves confidence in:

- Character integrity
- Campaign integrity
- Rules correctness
- Security
- Reliability
- Recoverability
- Maintainability
- Long-term product growth

# v1.0.1 Practical Quality Additions

This version adds a small set of quality controls intended to improve manual audit reliability without changing the core workflow.

## Operator Checklist

Before each audit cycle, review:

```text
/docs/audit/AUDIT_OPERATOR_CHECKLIST.md
```

The checklist records repository snapshot metadata, required files, report outputs, and finding quality gates.

## Required Finding Evidence

Official findings should include evidence. Findings without sufficient evidence should remain Observations until validated.

## Observation / Not A Finding

Agents may record:

```text
Observation
```

for risks that need more validation, and:

```text
Not A Finding
```

for items that were investigated but should not become official findings.

Common reasons for `Not A Finding`:

- ADR explicitly accepts the design.
- Evidence is insufficient.
- Business impact is not meaningful.
- Item belongs to another agent.
- Item is already represented by an existing finding.

## Consistent Report Endings

Every report should end with:

```text
Overall Assessment
Top Risks
Recommended Next Actions
Confidence
Release Impact
```
