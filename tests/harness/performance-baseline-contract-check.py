#!/usr/bin/env python3
from pathlib import Path
import json
import os
import sys

ROOT = Path(__file__).resolve().parents[2]

REQUIRED_FILES = [
    'tests/performance/baseline.json',
    'tests/performance/fixtures.ts',
    'tests/performance/report.ts',
    'tests/performance/pipeline-performance.test.ts',
]

TEXT_MARKERS = {
    'package.json': ['"test:performance"'],
    'vitest.config.ts': [
        "name: 'performance'",
        "execArgv: ['--expose-gc']",
        'maxWorkers: 1',
        'fileParallelism: false',
    ],
    'scripts/production-gates.sh': ['npm run test:performance'],
    '.github/workflows/production-gates.yml': [
        'name: datafixer-performance',
        'path: benchmark-report.json',
    ],
}

EXPECTED_CASE_IDS = {
    'clean-10k',
    'clean-50k',
    'merge-10k-plus-10k',
    'merge-50k-plus-50k',
    'validate-10k',
    'validate-50k',
}


def validate_manifest(errors: list[str]) -> None:
    path = ROOT / 'tests/performance/baseline.json'
    if not path.is_file():
        return
    try:
        payload = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f'invalid performance baseline manifest: {exc}')
        return

    if payload.get('schemaVersion') != 1:
        errors.append('performance baseline schemaVersion must be 1')
    calibration = payload.get('calibration')
    if not isinstance(calibration, dict):
        errors.append('performance baseline calibration metadata missing')
    else:
        if calibration.get('node') != '22.16.0':
            errors.append('performance baseline calibration node must be 22.16.0')
        if calibration.get('platform') != 'github-ubuntu':
            errors.append('performance baseline calibration platform must be github-ubuntu')

    cases = payload.get('cases')
    if not isinstance(cases, list):
        errors.append('performance baseline cases must be a list')
        cases = []
    case_ids = {case.get('id') for case in cases if isinstance(case, dict)}
    if case_ids != EXPECTED_CASE_IDS:
        errors.append('performance baseline case IDs do not match the six required cases')

    enforce = payload.get('enforceBudgets') is True
    if enforce:
        for case in cases:
            if not isinstance(case, dict):
                errors.append('performance baseline case must be an object')
                continue
            if not isinstance(case.get('maxMedianMs'), (int, float)) or case.get('maxMedianMs') <= 0:
                errors.append(f"{case.get('id', '<unknown>')} must have a positive maxMedianMs when budgets are enforced")
            if not isinstance(case.get('maxRetainedHeapMiB'), (int, float)) or case.get('maxRetainedHeapMiB') <= 0:
                errors.append(f"{case.get('id', '<unknown>')} must have a positive maxRetainedHeapMiB when budgets are enforced")

    is_main_push = os.environ.get('GITHUB_EVENT_NAME') == 'push' and os.environ.get('GITHUB_REF') == 'refs/heads/main'
    if is_main_push and not enforce:
        errors.append('main push must not use calibration-only performance budgets; set enforceBudgets=true')


def main() -> int:
    errors: list[str] = []
    for rel in REQUIRED_FILES:
        if not (ROOT / rel).is_file():
            errors.append(f'missing performance baseline file: {rel}')

    for rel, markers in TEXT_MARKERS.items():
        path = ROOT / rel
        if not path.is_file():
            errors.append(f'missing contract source: {rel}')
            continue
        text = path.read_text(encoding='utf-8')
        for marker in markers:
            if marker not in text:
                errors.append(f'{rel} missing marker: {marker}')

    validate_manifest(errors)

    if errors:
        print('\n'.join(f'FAIL {error}' for error in errors))
        return 1
    print('PASS performance-baseline-contract-check')
    return 0


if __name__ == '__main__':
    sys.exit(main())
