# Audit Operator Checklist

## Purpose

This checklist is used before, during, and after a manual AI-assisted audit run.

The goal is repeatability. An audit should record enough context that another reviewer can understand what was reviewed, which version was reviewed, and whether the reports are complete.

---

# Before Running The Audit

## Repository Snapshot

Record the following values before the first agent runs:

```yaml
repository_name:
repository_url:
repository_branch:
repository_commit:
repository_type:
primary_language:
frameworks:
database:
deployment_target:
approximate_size: Small / Medium / Large / Unknown
generated_on:
operator:
audit_cycle:
```

Use `Not Provided` when a value is unavailable. Do not invent values.

---

# Required Files

Verify these exist:

```text
/agents/architecture-agent.md
/agents/dnd-agent.md
/agents/campaign-agent.md
/agents/code-quality-agent.md
/agents/critic-agent.md
/agents/repository-director.md

/docs/audit/AUDIT_BOOTSTRAP.md
/docs/audit/AUDIT_WORKFLOW.md
/docs/audit/PROJECT_CONTEXT.md
/docs/audit/REPORT_TEMPLATE.md
/docs/audit/FINDING_SCHEMA.md
/docs/audit/FINDING_ID_GUIDELINES.md
/docs/audit/SEVERITY_MATRIX.md
/docs/audit/FINDINGS_REGISTRY.md
/docs/audit/AUDIT_BACKLOG.md
/docs/audit/DIRECTOR_CHECKLIST.md
/docs/audit/ARCHITECTURE_RED_FLAGS.md
/docs/audit/RULES_TEST_MATRIX.md
/docs/audit/CAMPAIGN_SCENARIOS.md
/docs/audit/RELIABILITY_SECURITY_CHECKLIST.md
```

---

# Output Folder

Before starting a new audit cycle:

```text
□ /audit-results exists
□ Old draft reports are archived or removed
□ Repository branch and commit are recorded
□ Registry and backlog are initialized
□ ADRs are present or explicitly absent
```

---

# During The Audit

Run reports in this order:

```text
1. Architecture & Data Model Agent
2. D&D Domain Agent
3. Campaign & Collaboration Agent
4. Code Quality & Reliability Agent
5. Critic Agent
6. Repository Director
```

D&D and Campaign may run in parallel after Architecture is complete.

---

# Finding Quality Gate

Before accepting any finding, verify:

```text
□ Evidence exists
□ Repository location exists when possible
□ Business/user/technical impact is stated
□ Recommendation is actionable
□ Owner is exactly one agent
□ Severity is from SEVERITY_MATRIX.md
□ Confidence is justified
□ Existing registry was checked
□ ADRs were checked where applicable
□ The issue is not better treated as an Observation or Not A Finding
```

If any required condition fails, the item should remain an Observation until validated.

---

# After The Audit

Verify expected outputs exist:

```text
/audit-results/architecture-report.md
/audit-results/dnd-report.md
/audit-results/campaign-report.md
/audit-results/code-quality-report.md
/audit-results/critic-report.md
/audit-results/executive-summary.md
```

Then run:

```bash
python scripts/validate_audit_outputs.py
```

---

# Final Publication Checklist

```text
□ Critic reviewed all findings
□ Director resolved ownership disputes
□ Director normalized severity where needed
□ Findings Registry updated
□ Audit Backlog updated
□ Executive Summary includes release readiness
□ Top risks are clear
□ Next actions are clear
```
