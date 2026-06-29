# Audit Framework — Ready-to-Run v1

This package is a practical, usable audit framework for your D&D Beyond-style repository.

It includes:

- Six agent prompts in `/agents`
- Governance documents in `/docs/audit`
- ADRs in `/docs/adr`
- An empty `/audit-results` folder for generated reports
- A simple output validator in `/scripts`

## Folder layout expected in your repository

Copy these folders into the root of your GitHub repository:

```text
/agents
/docs/audit
/docs/adr
/audit-results
/scripts
```

## Quick start

1. Copy this package into your repository root.
2. Commit it on a branch such as `audit-framework-v1`.
3. Fill in audit metadata in `docs/audit/AUDIT_BOOTSTRAP.md` if desired.
4. Run the audit manually with your AI coding tool or ChatGPT/Claude by using the prompts below.

## Manual run order

Run agents in this order:

1. Architecture & Data Model Agent
2. D&D Domain Agent and Campaign & Collaboration Agent
3. Code Quality & Reliability Agent
4. Critic Agent
5. Repository Director

The expected outputs are:

```text
/audit-results/architecture-report.md
/audit-results/dnd-report.md
/audit-results/campaign-report.md
/audit-results/code-quality-report.md
/audit-results/critic-report.md
/audit-results/executive-summary.md
```

## Prompts to use

### 1. Architecture

```text
Perform the Architecture & Data Model audit using /agents/architecture-agent.md.

Use all required inputs listed in /docs/audit/AUDIT_BOOTSTRAP.md.
Review /docs/audit/ARCHITECTURE_RED_FLAGS.md as the diagnostic guide.
Review /docs/adr/*.md if present.
Produce /audit-results/architecture-report.md.
Follow /docs/audit/REPORT_TEMPLATE.md while preserving all architecture-specific output sections.
```

### 2. D&D Domain

```text
Perform the D&D Domain audit using /agents/dnd-agent.md.

Use all required inputs listed in /docs/audit/AUDIT_BOOTSTRAP.md.
Use /audit-results/architecture-report.md as architectural context.
Review /docs/audit/RULES_TEST_MATRIX.md as the diagnostic guide.
Produce /audit-results/dnd-report.md.
Follow /docs/audit/REPORT_TEMPLATE.md while preserving all D&D-specific output sections.
```

### 3. Campaign & Collaboration

```text
Perform the Campaign & Collaboration audit using /agents/campaign-agent.md.

Use all required inputs listed in /docs/audit/AUDIT_BOOTSTRAP.md.
Use /audit-results/architecture-report.md as architectural context.
Review /docs/audit/CAMPAIGN_SCENARIOS.md as the diagnostic guide.
Produce /audit-results/campaign-report.md.
Follow /docs/audit/REPORT_TEMPLATE.md while preserving all campaign-specific output sections.
```

### 4. Code Quality & Reliability

```text
Perform the Code Quality & Reliability audit using /agents/code-quality-agent.md.

Use all required inputs listed in /docs/audit/AUDIT_BOOTSTRAP.md.
Use architecture-report.md, dnd-report.md, and campaign-report.md as context if available.
Review /docs/audit/RELIABILITY_SECURITY_CHECKLIST.md as the diagnostic guide.
Produce /audit-results/code-quality-report.md.
Follow /docs/audit/REPORT_TEMPLATE.md while preserving all code-quality-specific output sections.
```

### 5. Critic

```text
Perform the Critic review using /agents/critic-agent.md.

Do not review source code.
Use PROJECT_CONTEXT.md, FINDING_SCHEMA.md, SEVERITY_MATRIX.md, FINDINGS_REGISTRY.md, and all generated agent reports.
Produce /audit-results/critic-report.md.
Challenge evidence, severity, ownership, duplicates, ADR conflicts, and actionability.
```

### 6. Repository Director

```text
Perform the Repository Director review using /agents/repository-director.md.

Do not review source code directly.
Use all generated reports and governance documents listed in /docs/audit/AUDIT_BOOTSTRAP.md.
Use /docs/audit/DIRECTOR_CHECKLIST.md as the final validation checklist.
Produce /audit-results/executive-summary.md.
Include release readiness, top risks, roadmaps, final scores, and final recommendation.
```

## Validate expected outputs

After reports are generated, run:

```bash
python scripts/validate_audit_outputs.py
```

This checks that all expected report files exist.

## What this package is

This is a working v1 audit framework. It is not a fully automated scanner. It is designed to be used with an AI coding assistant that can read your repository and write files.

## What to improve later

Later versions can add JSON outputs, GitHub Actions, automated repository profiling, and stricter schemas.

---

## v1.0.1 Practical Improvements

This package includes the small, high-value improvements requested for immediate use:

1. Evidence requirements for official findings.
2. `Observation` and `Not A Finding` handling.
3. Stronger Critic review questions.
4. Executive dashboard requirement.
5. Repository snapshot fields in reports.
6. Standard report endings.
7. Clear out-of-scope / ownership boundaries remain in each agent.
8. Severity calibration questions.
9. Operator checklist.
10. A stricter validation helper.

Start every audit with:

```text
/docs/audit/AUDIT_OPERATOR_CHECKLIST.md
```

## Finding quality rule

If an issue lacks evidence, do not make it an official finding. Record it as an Observation and ask for validation.

## Framework validation

Check framework files:

```bash
python scripts/validate_audit_outputs.py --framework
```

Check generated reports after an audit:

```bash
python scripts/validate_audit_outputs.py
```
