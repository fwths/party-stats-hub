#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
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
    '.agents/audit/architecture-agent.md',
    '.agents/audit/dnd-agent.md',
    '.agents/audit/campaign-agent.md',
    '.agents/audit/code-quality-agent.md',
    '.agents/audit/critic-agent.md',
    '.agents/audit/repository-director.md',
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
    'schemas/audit/finding.schema.json',
    'schemas/audit/report.schema.json',
]

STANDARD_ENDING_HEADINGS = [
    '# Overall Assessment',
    '# Top Risks',
    '# Recommended Next Actions',
    '# Confidence',
    '# Release Impact',
]

FRAMEWORK_VERSION = '1.0.1'
JSON_SCHEMAS = [
    'schemas/audit/finding.schema.json',
    'schemas/audit/report.schema.json',
]


def missing(paths: list[str]) -> list[str]:
    return [p for p in paths if not Path(p).exists()]


def validate_framework() -> int:
    problems = missing(EXPECTED_FRAMEWORK_FILES)

    version_path = Path('docs/audit/framework/VERSION')
    if not version_path.exists():
        problems.append(f'{version_path}: missing framework version file')
    else:
        actual_version = version_path.read_text(encoding='utf-8').strip()
        if actual_version != FRAMEWORK_VERSION:
            problems.append(
                f'{version_path}: expected {FRAMEWORK_VERSION}, '
                f'found {actual_version or "empty"}'
            )

    bootstrap_path = Path('docs/audit/AUDIT_BOOTSTRAP.md')
    if bootstrap_path.exists():
        bootstrap = bootstrap_path.read_text(encoding='utf-8', errors='ignore')
        if f'Audit Framework Version: v{FRAMEWORK_VERSION}' not in bootstrap:
            problems.append(
                'docs/audit/AUDIT_BOOTSTRAP.md: framework version does not match '
                'docs/audit/framework/VERSION'
            )

    for schema_path in JSON_SCHEMAS:
        path = Path(schema_path)
        if not path.exists():
            continue
        try:
            schema = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            problems.append(f'{schema_path}: invalid JSON ({exc})')
            continue
        if schema.get('$schema') != 'https://json-schema.org/draft/2020-12/schema':
            problems.append(f'{schema_path}: expected JSON Schema draft 2020-12')
        if schema.get('type') != 'object':
            problems.append(f'{schema_path}: root schema type must be object')

    if problems:
        print('Framework validation failed:')
        for p in problems:
            print(f'- {p}')
        return 1
    print(
        f'Audit framework v{FRAMEWORK_VERSION} is internally consistent; '
        'all expected files exist and JSON schemas parse.'
    )
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
