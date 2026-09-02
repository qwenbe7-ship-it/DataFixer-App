#!/usr/bin/env python3
from pathlib import Path
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

    if errors:
        print('\n'.join(f'FAIL {error}' for error in errors))
        return 1
    print('PASS performance-baseline-contract-check')
    return 0


if __name__ == '__main__':
    sys.exit(main())
