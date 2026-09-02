#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
import re
import sys

IMPORT_RE = re.compile(r"(?:from\s+|import\s*\(|import\s+)(['\"])([^'\"]+)\1")

FORBIDDEN: dict[str, set[str]] = {
    'domain': {'app', 'ui', 'worker', 'export', 'file-io', 'i18n', 'rules', 'evidence'},
    'rules': {'app', 'ui', 'worker', 'export', 'file-io', 'i18n', 'evidence'},
    'evidence': {'app', 'ui', 'worker', 'export', 'file-io', 'i18n', 'rules'},
    'file-io': {'app', 'ui', 'worker', 'export', 'i18n', 'rules', 'evidence'},
    'ui': {'worker', 'evidence', 'export', 'rules'},
    'worker': {'ui', 'i18n'},
}


def source_area(path: Path, src_root: Path) -> str:
    rel = path.relative_to(src_root)
    return rel.parts[0] if len(rel.parts) > 1 else '<root>'


def resolve_target_area(path: Path, spec: str, src_root: Path) -> str | None:
    if not spec.startswith('.'):
        return None
    candidate = (path.parent / spec).resolve()
    try:
        rel = candidate.relative_to(src_root.resolve())
    except ValueError:
        return None
    return rel.parts[0] if len(rel.parts) > 1 else '<root>'


def violations(root: Path) -> list[str]:
    src_root = root / 'src'
    found: list[str] = []
    if not src_root.is_dir():
        return ['src directory missing']

    for path in sorted([*src_root.rglob('*.ts'), *src_root.rglob('*.tsx')]):
        area = source_area(path, src_root)
        text = path.read_text(encoding='utf-8')
        for match in IMPORT_RE.finditer(text):
            spec = match.group(2)
            target = resolve_target_area(path, spec, src_root)
            if target is None:
                continue
            if area in FORBIDDEN and target in FORBIDDEN[area]:
                found.append(f'{path.relative_to(root)}: forbidden dependency {area} -> {target} ({spec})')
            if path.relative_to(root).as_posix() == 'src/app/process-job.ts' and target in {'ui', 'worker', 'export', 'file-io', 'i18n'}:
                found.append(f'{path.relative_to(root)}: process-job forbidden dependency app-core -> {target} ({spec})')
            if path.relative_to(root).as_posix() == 'src/main.tsx' and target not in {'app', '<root>'}:
                found.append(f'{path.relative_to(root)}: main entry may only import app/root assets plus external packages ({spec})')
    return found


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default=str(Path(__file__).resolve().parents[2]))
    args = parser.parse_args()
    root = Path(args.root).resolve()
    errors = violations(root)
    if errors:
        for error in errors:
            print(f'FAIL {error}')
        return 1
    print('PASS architecture-check')
    return 0


if __name__ == '__main__':
    sys.exit(main())
