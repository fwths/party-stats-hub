# Report Template

## Purpose

This document defines the common reporting framework used by all audit agents.

This document does **not** replace agent-specific output structures.

Each agent prompt defines domain-specific sections that remain authoritative.

This template defines the shared elements all audit reports should include.

---

# Template Hierarchy

When an agent report is generated:

## Agent Prompt

The agent-specific prompt is authoritative.

Examples:

```text
architecture-agent.md

dnd-agent.md

campaign-agent.md

frontend-agent.md

code-quality-agent.md

critic-agent.md

repository-director.md
```

The sections defined in those prompts must always appear.

---

## Report Template

This document provides:

- Metadata standards
- Findings standards
- Confidence standards
- Release impact standards
- Executive summary standards

This document supplements the agent prompt.

It does not override it.

---

# Standard Report Structure

All audit reports should follow this high-level structure.

```text
1. Report Metadata

2. Scope

3. Out Of Scope

4. Executive Summary

5. Agent-Specific Sections

6. Findings Summary

7. Detailed Findings

8. Confidence Assessment

9. Release Impact

10. Final Recommendation
```

Not all reports require identical wording.

However, the overall structure should remain consistent.

---

# Report Metadata

All reports should begin with:

```yaml
report_name:

report_type:

generated_by:

generated_on:

repository_version:

audit_cycle:
```

Example:

```yaml
report_name: Architecture & Data Model Audit

report_type: Architecture Review

generated_by: Architecture & Data Model Agent

generated_on: 2026-06-29

repository_version: main

audit_cycle: 2026-Q2
```

If values are unavailable:

```text
Not Provided
```

should be used.

Do not invent values.

---

# Scope

Describe:

- What was reviewed
- Which documents were used
- Which repository areas were reviewed

Example:

```text
The audit reviewed:

- Character domain
- Campaign domain
- Rules engine

Documents reviewed:

- PROJECT_CONTEXT.md
- FINDING_SCHEMA.md
- SEVERITY_MATRIX.md
```

---

# Out Of Scope

Every report should explicitly state what was not reviewed.

Examples:

```text
Security

Performance

Testing
```

or

```text
Gameplay Correctness

Campaign Workflows

Architecture
```

depending on the agent.

---

# Executive Summary

Every report should include an executive summary.

The Executive Summary should answer:

```text
What was reviewed?

What appears healthy?

What appears risky?

What should happen next?
```

The summary should be understandable without reading the rest of the report.

---

# Agent-Specific Sections

Agent prompts define their own required sections.

Examples:

Architecture Agent:

```text
Repository Map

Domain Model

Aggregate Analysis

Architecture Red Flag Assessment
```

D&D Agent:

```text
Rules Coverage Assessment

Spellcasting Assessment

Multiclass Assessment
```

Campaign Agent:

```text
Scenario Coverage Assessment

Campaign Assessment

Collaboration Assessment
```

Code Quality Agent:

```text
Reliability Assessment

Security Assessment

Testing Assessment
```

These sections remain required.

This template does not replace them.

---

# Findings Summary

Every report should include a severity summary.

Example:

```text
Critical: 1

High: 3

Medium: 5

Low: 4

Info: 2
```

If no findings exist:

```text
Critical: 0

High: 0

Medium: 0

Low: 0

Info: 0
```

---

# Detailed Findings

All findings must conform to:

```text
FINDING_SCHEMA.md
```

Every finding should include:

```yaml
id:

title:

severity:

confidence:

owner:

status:

lifecycle:

category:

location:

description:

impact:

recommendation:
```

Do not invent additional required fields.

---

# Finding Ordering

Unless the agent requires otherwise:

Sort findings by:

1. Severity
2. Business Impact
3. Confidence

Highest-priority findings should appear first.

---

# Registry Awareness

Before creating findings:

Agents should review:

```text
FINDINGS_REGISTRY.md
```

Determine:

- Existing findings
- Regressions
- Duplicates

Avoid creating duplicate findings.

Reuse IDs where appropriate.

---

# Regression Reporting

If a previously resolved finding returns:

Do not create a new finding.

Use:

```yaml
status: Open

lifecycle: Regressed
```

and reuse the original ID.

Agents should explicitly note any regressions identified.

---

# Ownership Referrals

When an issue belongs to another agent:

Do not create an official finding.

Instead use:

```text
Observation:

Refer To:

Reason:

No finding created.
```

Reports should include an Ownership Referrals section if applicable.

---

# Confidence Assessment

Every report must include one of:

```text
Very High

High

Moderate

Low
```

The assessment should explain:

- Evidence quality
- Areas reviewed
- Areas not reviewed
- Confidence limitations

---

# Release Impact

Every report should state whether findings affect release readiness.

Choose:

```text
No Impact

Minor Impact

Moderate Impact

Significant Impact

Release Blocking
```

Provide rationale.

---

# Final Recommendation

The report should end with a recommendation.

Examples:

Architecture Agent:

```text
Architecturally Healthy

Healthy With Improvements

Requires Remediation

Significant Architectural Risk
```

Code Quality Agent:

```text
Technically Healthy

Healthy With Improvements

Requires Remediation

High Risk
```

Campaign Agent:

```text
Healthy

Healthy With Improvements

Requires Remediation

High Risk
```

Frontend & UX Agent:

```text
Visually & Accessibly Healthy

Healthy With Improvements

Requires UI/a11y Remediation

High UI/a11y Risk
```

Use the recommendation options defined by the agent prompt.

---

# Report Quality Requirements

Every report should be:

- Evidence-based
- Actionable
- Concise where possible
- Detailed where necessary
- Consistent with severity rules
- Consistent with ownership rules
- Consistent with lifecycle rules

Avoid:

- Speculation
- Duplicate findings
- Findings without evidence
- Findings outside ownership

---

# Required Audit References

Reports should reference applicable documents.

Depending on the agent, this may include:

```text
PROJECT_CONTEXT.md

FINDING_SCHEMA.md

SEVERITY_MATRIX.md

FINDINGS_REGISTRY.md

ARCHITECTURE_RED_FLAGS.md

RULES_TEST_MATRIX.md

CAMPAIGN_SCENARIOS.md

RELIABILITY_SECURITY_CHECKLIST.md

ADRs
```

Only reference documents actually reviewed.

---

# Report Completion Checklist

Before a report is considered complete:

```text
□ Metadata included

□ Scope included

□ Out Of Scope included

□ Executive Summary included

□ Agent-Specific Sections included

□ Findings Summary included

□ Detailed Findings included

□ Confidence Assessment included

□ Release Impact included

□ Final Recommendation included
```

---

# Success Criteria

A successful report should allow a reader to answer:

```text
What was reviewed?

What matters most?

What is risky?

What should happen next?

How confident are we?
```

without needing to inspect source code.

If those questions can be answered clearly, the report is complete.

# Repository Snapshot

Every report should include a repository snapshot near the top, after metadata.

```yaml
repository_name:
repository_branch:
repository_commit:
repository_type:
primary_language:
frameworks:
database:
files_reviewed:
generated_on:
audit_cycle:
```

Use `Not Provided` when unavailable.

---

# Evidence Expectations

Every official finding should include:

```yaml
evidence:
  files:
  symbols:
  lines:
  observed_behavior:
  expected_behavior:
  rationale:
```

If evidence is incomplete, either lower confidence or record the item as an Observation.

---

# Observations And Not A Findings

Reports may include these sections:

```text
Observations
Not A Findings
```

Use `Observations` for concerns needing more validation.

Use `Not A Findings` for concerns that were reviewed and intentionally not escalated.

---

# Standard Report Ending

Every report should end with these sections in this order:

```text
# Overall Assessment
# Top Risks
# Recommended Next Actions
# Confidence
# Release Impact
```

This standardized ending helps the Repository Director compare reports consistently.

---

# Executive Dashboard

The Repository Director executive summary should begin with a dashboard:

```text
Architecture:
Rules Accuracy:
Campaign Integrity:
Reliability:
Security:
Maintainability:
Operational Readiness:
Release Status:
```

Use numeric scores when available. Use `Not Provided` when unavailable.


---

# Score Interpretation

Use the following qualitative rubric for any reported score.

| Score | Interpretation |
|---:|---|
| 90–100 | Excellent |
| 75–89 | Healthy |
| 60–74 | Needs Improvement |
| 40–59 | High Risk |
| 0–39 | Critical Risk |

Scores are decision-support tools and should be justified in the report narrative.
