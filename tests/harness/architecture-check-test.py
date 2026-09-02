#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
CHECKER = ROOT / 'tests/harness/architecture-check.py'

if not CHECKER.is_file():
    print('FAIL architecture checker missing')
    sys.exit(1)

with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / 'src/domain').mkdir(parents=True)
    (root / 'src/ui').mkdir(parents=True)
    (root / 'src/domain/bad.ts').write_text("import '../ui/widget';\n", encoding='utf-8')
    (root / 'src/ui/widget.ts').write_text('export const widget = 1;\n', encoding='utf-8')
    proc = subprocess.run([sys.executable, str(CHECKER), '--root', str(root)], text=True, capture_output=True)
    if proc.returncode == 0 or 'domain -> ui' not in (proc.stdout + proc.stderr):
        print('FAIL architecture checker did not reject forbidden domain -> ui dependency')
        print(proc.stdout)
        print(proc.stderr)
        sys.exit(1)

proc = subprocess.run([sys.executable, str(CHECKER), '--root', str(ROOT)], text=True, capture_output=True)
if proc.returncode != 0:
    print('FAIL current DataFixer architecture must pass')
    print(proc.stdout)
    print(proc.stderr)
    sys.exit(1)

print('PASS architecture-check-test')
