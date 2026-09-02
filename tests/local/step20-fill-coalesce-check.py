from pathlib import Path

required = [
    'docs/step-20-fill-default-coalesce.md',
    'docs/step-20-fill-default-coalesce-status.md',
    'public/examples/fill-coalesce.csv',
    'public/examples/fill-coalesce-settings.json',
    'tests/e2e/fill-coalesce.spec.ts',
]
for item in required:
    assert Path(item).exists(), f'missing Step 20 asset: {item}'
readme = Path('README.md').read_text()
assert 'Step 20 — Fill / Default / Coalesce' in readme
rules = Path('src/domain/rule-kinds.ts').read_text()
assert "'fillDefault'" in rules and "'coalesce'" in rules
engine = Path('src/rules/engine.ts').read_text()
assert "case 'fillDefault'" in engine and "case 'coalesce'" in engine
print('PASS step20-fill-coalesce-check')
