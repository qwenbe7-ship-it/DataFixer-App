#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
config = (ROOT / 'playwright.config.ts').read_text(encoding='utf-8')
bootstrap = (ROOT / 'scripts/production-bootstrap.sh').read_text(encoding='utf-8')
bootstrap_workflow = (ROOT / '.github/workflows/bootstrap-lockfile.yml').read_text(encoding='utf-8')
production_workflow = (ROOT / '.github/workflows/production-gates.yml').read_text(encoding='utf-8')
errors: list[str] = []

for marker in ["name: 'chrome'", "channel: 'chrome'", "name: 'edge'", "channel: 'msedge'", "name: 'firefox'"]:
    if marker not in config:
        errors.append(f'playwright browser matrix missing {marker}')

install_marker = './node_modules/.bin/playwright install --with-deps chromium chrome msedge firefox'
if install_marker not in bootstrap_workflow:
    errors.append('bootstrap workflow must install Chromium + Chrome + Edge + Firefox')
if install_marker not in production_workflow:
    errors.append('production workflow must install Chromium + Chrome + Edge + Firefox')
if './node_modules/.bin/playwright install --with-deps chromium chrome msedge firefox' not in bootstrap:
    errors.append('local production bootstrap must install Chromium + Chrome + Edge + Firefox with installed binary and OS dependencies')

if errors:
    for error in errors:
        print(f'FAIL {error}')
    sys.exit(1)
print('PASS browser-matrix-contract-check')
