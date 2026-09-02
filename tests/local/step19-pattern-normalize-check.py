from pathlib import Path
root = Path(__file__).resolve().parents[2]
required = [
    root / 'docs/step-19-pattern-normalize.md',
    root / 'docs/step-19-pattern-normalize-status.md',
    root / 'public/examples/pattern-normalize.csv',
    root / 'public/examples/pattern-normalize-settings.json',
    root / 'tests/e2e/pattern-normalize.spec.ts',
]
missing = [str(p.relative_to(root)) for p in required if not p.exists()]
if missing:
    raise SystemExit('FAIL step19-pattern-normalize-check: missing ' + ', '.join(missing))
settings = (root / 'public/examples/pattern-normalize-settings.json').read_text()
readme = (root / 'README.md').read_text()
ko = (root / 'docs/user-guide-ko.md').read_text()
en = (root / 'docs/user-guide-en.md').read_text()
check = (root / 'tests/local/run-regression.sh').read_text() + '\n' + (root / 'tests/local/run-static-checks.sh').read_text()
checks = {
    'example uses regexReplace': '"kind": "regexReplace"' in settings,
    'example uses safe deterministic patterns': '"[^0-9]+"' in settings and '[-\\\\s]+' in settings,
    'README documents Step 19': 'Step 19 — Pattern Normalize' in readme,
    'Korean guide documents Pattern Replace': '정규식 패턴 찾아 바꾸기' in ko,
    'English guide documents Pattern Replace': 'regular-expression pattern' in en,
    'regression includes regex-replace': 'regex-replace' in check,
    'regression includes UI guard': 'regex-replace-ui-check.py' in check,
    'regression includes shared kind guard': 'rule-kind-contract-check.py' in check,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('FAIL step19-pattern-normalize-check: ' + '; '.join(failed))
print('PASS step19-pattern-normalize-check')
