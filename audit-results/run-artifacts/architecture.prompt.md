# Audit Stage: Architecture & Data Model Agent

## Required Inputs

- docs/audit/PROJECT_CONTEXT.md
- docs/audit/FINDING_SCHEMA.md
- docs/audit/SEVERITY_MATRIX.md
- docs/audit/FINDINGS_REGISTRY.md
- docs/audit/FINDING_ID_GUIDELINES.md
- docs/audit/REPORT_TEMPLATE.md
- .agents/audit/architecture-agent.md
- docs/audit/ARCHITECTURE_RED_FLAGS.md
- docs/adr

## Required Output

audit-results/architecture-report.md

## Task

Perform the Architecture & Data Model audit using .agents/audit/architecture-agent.md.

Use all required inputs listed in docs/audit/AUDIT_BOOTSTRAP.md.
Review docs/audit/ARCHITECTURE_RED_FLAGS.md as the diagnostic guide.
Review docs/adr/*.md if present.
Produce audit-results/architecture-report.md.
Follow docs/audit/REPORT_TEMPLATE.md while preserving all architecture-specific output sections.
