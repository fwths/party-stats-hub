#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
import sys

EXPECTED_REPORTS = [
    'audit-results/architecture-report.md',
    'audit-results/dnd-report.md',
    'audit-results/campaign-report.md',
    'audit-results/code-quality-report.md',
    'audit-results/critic-report.md',
    'audit-results/executive-summary.md',
]

EXPECTED_FRAMEWORK_FILES = [
    'agents/architecture-agent.md',
    'agents/dnd-agent.md',
    'agents/campaign-agent.md',
    'agents/code-quality-agent.md',
    'agents/critic-agent.md',
    'agents/repository-director.md',
    'docs/audit/AUDIT_BOOTSTRAP.md',
    'docs/audit/AUDIT_WORKFLOW.md',
    'docs/audit/AUDIT_OPERATOR_CHECKLIST.md',
    'docs/audit/PROJECT_CONTEXT.md',
    'docs/audit/REPORT_TEMPLATE.md',
    'docs/audit/FINDING_SCHEMA.md',
    'docs/audit/FINDING_ID_GUIDELINES.md',
    'docs/audit/SEVERITY_MATRIX.md',
    'docs/audit/FINDINGS_REGISTRY.md',
    'docs/audit/AUDIT_BACKLOG.md',
    'docs/audit/DIRECTOR_CHECKLIST.md',
    'docs/audit/ARCHITECTURE_RED_FLAGS.md',
    'docs/audit/RULES_TEST_MATRIX.md',
    'docs/audit/CAMPAIGN_SCENARIOS.md',
    'docs/audit/RELIABILITY_SECURITY_CHECKLIST.md',
    'docs/adr/ADR_TEMPLATE.md',
    'schemas/finding.schema.json',
    'schemas/report.schema.json',
]

STANDARD_ENDING_HEADINGS = [
    '# Overall Assessment',
    '# Top Risks',
    '# Recommended Next Actions',
    '# Confidence',
    '# Release Impact',
]


def missing(paths: list[str]) -> list[str]:
    return [p for p in paths if not Path(p).exists()]


def validate_framework() -> int:
    problems = missing(EXPECTED_FRAMEWORK_FILES)
    if problems:
        print('Missing expected framework files:')
        for p in problems:
            print(f'- {p}')
        return 1
    print('All expected framework files exist.')
    return 0


def validate_reports(strict: bool = False) -> int:
    problems = missing(EXPECTED_REPORTS)
    if problems:
        print('Missing expected audit outputs:')
        for p in problems:
            print(f'- {p}')
        return 1

    if strict:
        strict_problems = []
        for p in EXPECTED_REPORTS:
            text = Path(p).read_text(errors='ignore')
            for heading in STANDARD_ENDING_HEADINGS:
                if heading not in text:
                    strict_problems.append(f'{p}: missing {heading}')
        if strict_problems:
            print('Strict report validation failed:')
            for item in strict_problems:
                print(f'- {item}')
            return 1

    print('All expected audit outputs exist.')
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description='Validate audit framework files and generated audit outputs.')
    parser.add_argument('--framework', action='store_true', help='Validate framework files instead of audit outputs.')
    parser.add_argument('--strict', action='store_true', help='For reports, also check standard ending headings.')
    args = parser.parse_args()

    if args.framework:
        return validate_framework()
    return validate_reports(strict=args.strict)


if __name__ == '__main__':
    raise SystemExit(main())
