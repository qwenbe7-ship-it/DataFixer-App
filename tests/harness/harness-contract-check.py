#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]

REQUIRED_FILES = [
    'AGENTS.md',
    'src/rules/AGENTS.md',
    'src/worker/AGENTS.md',
    'tests/AGENTS.md',
    '.agents/skills/datafixer-feature/SKILL.md',
    '.agents/skills/datafixer-release/SKILL.md',
    'docs/specs/README.md',
    'docs/specs/_template.md',
    'docs/reviews/SPEC_REVIEW.md',
    'docs/reviews/CODE_REVIEW.md',
    'docs/QUALITY_SCORE.md',
    'docs/TECH_DEBT.md',
    'docs/harness/README.md',
    'docs/ARCHITECTURE.md',
    'docs/REPO_MAP.md',
    'tests/golden/manifest.json',
    'tests/harness/architecture-check.py',
    'scripts/generate-repo-map.py',
    'scripts/verify.py',
    '.github/workflows/production-gates.yml',
    '.github/workflows/bootstrap-lockfile.yml',
    'scripts/validate-lockfile.mjs',
    'tests/harness/lockfile-validator-check.py',
    'tests/harness/production-bootstrap-workflow-check.py',
    'tests/harness/verify-local-production-unblock-check.py',
    'tests/harness/browser-matrix-contract-check.py',
    'tests/harness/privacy-production-contract-check.py',
    'tests/harness/performance-baseline-contract-check.py',
    'tests/harness/preflight-contract-check.py',
]

REQUIRED_ROOT_MARKERS = [
    '## Product invariants',
    '## Required workflow',
    '## Verification commands',
    '## Source-of-truth documents',
]


def main() -> int:
    errors: list[str] = []
    for rel in REQUIRED_FILES:
        path = ROOT / rel
        if not path.is_file():
            errors.append(f'missing required harness file: {rel}')
    root_agents = ROOT / 'AGENTS.md'
    if root_agents.is_file():
        text = root_agents.read_text(encoding='utf-8')
        for marker in REQUIRED_ROOT_MARKERS:
            if marker not in text:
                errors.append(f'AGENTS.md missing marker: {marker}')
        if len(text.splitlines()) > 140:
            errors.append('AGENTS.md must stay concise (<= 140 lines)')
    if errors:
        print('\n'.join(f'FAIL {e}' for e in errors))
        return 1
    print(f'PASS harness-contract-check files={len(REQUIRED_FILES)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
