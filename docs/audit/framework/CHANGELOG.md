# Changelog

## 1.0.1

### Added

- Audit Operator Checklist.
- Required evidence guidance for official findings.
- Observation and Not A Finding formats.
- Severity calibration questions.
- Repository snapshot requirement for reports.
- Standard report ending sections.
- Executive dashboard requirement for Repository Director output.
- Stronger mandatory Critic review questions.
- Framework validation mode for `scripts/audit/validate_audit_outputs.py`.
- JSON schemas required by framework validation.
- Current-state, near-term, and later-product scope boundaries.
- Application-alignment notes for all proposed ADRs.

### Changed

- Agent prompts now include a shared v1.0.1 reporting quality gate.
- Finding schema now models structured evidence and repository locations more explicitly.
- Report template now distinguishes findings, observations, and not-a-findings.
- Audit priorities now make security and durable persistence explicit release concerns.
- All bundled ADRs are `Proposed` until explicitly ratified.
- Framework version references are normalized to v1.0.1.

## 1.0.0

- Ready-to-run manual audit framework package.


### Included corrections

- Added scoring rubric.
- Clarified Repository Director post-processing responsibilities.
- Added evidence/observation rule to all agent prompts.
