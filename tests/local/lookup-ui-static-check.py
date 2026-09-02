from pathlib import Path
root = Path(__file__).resolve().parents[2]
mode = (root / 'src/ui/ModePicker.tsx').read_text()
files = (root / 'src/ui/FilePicker.tsx').read_text()
rules = (root / 'src/ui/RuleEditor.tsx').read_text()
app = (root / 'src/app/App.tsx').read_text()
css = (root / 'src/app/app.css').read_text()

checks = {
    'mode picker exposes lookup': "'lookup'" in mode,
    'lookup accepts two files': "mode === 'merge' || mode === 'lookup'" in files,
    'rule editor accepts lookup settings': 'lookupSettings' in rules and 'LookupEditor' in rules,
    'lookup key labels are rendered': "lookup.leftKeyColumns" in rules and "lookup.rightKeyColumns" in rules,
    'lookup value mapping is rendered': "lookup.valueMap" in rules,
    'app initializes lookup settings': 'defaultLookupSettings' in app,
    'app sends lookup settings to preview': 'lookupSettings: state.lookupSettings' in app,
    'app sends lookup settings to worker': 'lookupSettings: state.lookupSettings' in app,
    'four modes use balanced desktop grid': '.mode-grid { display: grid; grid-template-columns: repeat(2, 1fr);' in css,
}
missing = [name for name, ok in checks.items() if not ok]
if missing:
    raise SystemExit('FAIL lookup-ui-static-check: ' + '; '.join(missing))
print('PASS lookup-ui-static-check')
