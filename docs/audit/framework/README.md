# Audit Framework Ready-to-Run v1.0.1

This package is a practical audit framework for Party Stats Hub.

It contains:

- Agent prompts in `.agents/audit/`
- Audit guidance in `docs/audit/`
- Proposed ADRs in `docs/adr/`
- Report outputs in `audit-results/`
- A validator in `scripts/`
- Optional JSON schemas in `schemas/audit/`

## Run An Audit

Use Codex, Antigravity, Claude Code, or another AI coding assistant that can read the repository and write files.

From the repository root, ask:

```text
Run the repository audit framework from the repository root, from start to finish.

Use the agents in order:
1. .agents/audit/architecture-agent.md
2. .agents/audit/dnd-agent.md
3. .agents/audit/campaign-agent.md
4. .agents/audit/code-quality-agent.md
5. .agents/audit/critic-agent.md
6. .agents/audit/repository-director.md

Use all required inputs listed in docs/audit/AUDIT_BOOTSTRAP.md.

Write the required reports to audit-results/.

After the reports are complete, update:
- docs/audit/FINDINGS_REGISTRY.md
- docs/audit/AUDIT_BACKLOG.md
```

That is the normal workflow. You do not need an API key or a separate automation command.

## Expected Reports

The audit should produce:

```text
audit-results/architecture-report.md
audit-results/dnd-report.md
audit-results/campaign-report.md
audit-results/code-quality-report.md
audit-results/critic-report.md
audit-results/executive-summary.md
```

## Agent Order

Run the agents in this order:

1. Architecture & Data Model Agent
2. D&D Domain Agent
3. Campaign & Collaboration Agent
4. Code Quality & Reliability Agent
5. Critic Agent
6. Repository Director

The D&D and Campaign agents may run in parallel after the Architecture report exists. The Critic and Repository Director should run after the earlier reports are complete.

## Required Final Updates

After the Repository Director report is complete, update:

```text
docs/audit/FINDINGS_REGISTRY.md
docs/audit/AUDIT_BACKLOG.md
```

The audit is not complete until the reports, registry, and backlog are all updated.

## Validate Outputs

After the audit is complete, run the validator from the repository root:

```bash
python scripts/audit/validate_audit_outputs.py
```

If Python is not on your `PATH`, use any available Python executable.

To validate the framework files themselves:

```bash
python scripts/audit/validate_audit_outputs.py --framework
```

## Finding Quality Rule

Official findings must have:

- Evidence
- Impact
- Recommendation
- Owner
- Severity
- Confidence
- Lifecycle state

If evidence is not strong enough, record an Observation instead of an official finding.

## Notes

The ADRs in `docs/adr/` are intentionally marked `Proposed`. They provide context, but they are not authoritative until accepted.

This framework is not a scanner. It is a repeatable review process for an AI coding assistant or human reviewer.
