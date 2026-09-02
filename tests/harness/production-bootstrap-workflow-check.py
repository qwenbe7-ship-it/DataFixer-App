#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
workflow = ROOT / '.github/workflows/bootstrap-lockfile.yml'
bootstrap = ROOT / 'scripts/production-bootstrap.sh'
validator = ROOT / 'scripts/validate-lockfile.mjs'
production = ROOT / '.github/workflows/production-gates.yml'
production_script = ROOT / 'scripts/production-gates.sh'
errors: list[str] = []

if not workflow.is_file():
    errors.append('bootstrap-lockfile workflow missing')
else:
    text = workflow.read_text(encoding='utf-8')
    required = [
        'workflow_dispatch:',
        'npm install --package-lock-only --ignore-scripts',
        'node scripts/validate-lockfile.mjs',
        'npm ci --ignore-scripts',
        './node_modules/.bin/playwright install --with-deps chromium chrome msedge firefox',
        'python scripts/verify.py local',
        'python scripts/verify.py official',
        'path: package-lock.json',
    ]
    for marker in required:
        if marker not in text:
            errors.append(f'bootstrap workflow missing marker: {marker}')
    if 'cache: npm' in text:
        errors.append('bootstrap workflow must not enable npm cache before a lockfile exists')
    official_pos = text.find('python scripts/verify.py official')
    verified_artifact_pos = text.find('name: datafixer-package-lock')
    if official_pos == -1 or verified_artifact_pos == -1 or verified_artifact_pos < official_pos:
        errors.append('verified lockfile artifact must only be published after official production gates pass')

if not validator.is_file():
    errors.append('lockfile validator missing')


if not production.is_file():
    errors.append('production-gates workflow missing')
else:
    text = production.read_text(encoding='utf-8')
    if 'node scripts/validate-lockfile.mjs' not in text:
        errors.append('production-gates must validate committed lockfile before npm ci')
    require_lock_pos = text.find('Require committed dependency lock')
    setup_node_pos = text.find('uses: actions/setup-node@v4')
    if require_lock_pos == -1 or setup_node_pos == -1 or require_lock_pos > setup_node_pos:
        errors.append('production-gates must require package-lock.json before setup-node npm caching')
    validate_pos = text.find('node scripts/validate-lockfile.mjs')
    ci_pos = text.find('npm ci --ignore-scripts')
    if validate_pos == -1 or ci_pos == -1 or validate_pos > ci_pos:
        errors.append('production-gates lockfile validation must run before npm ci')

if not production_script.is_file():
    errors.append('production-gates.sh missing')
else:
    text = production_script.read_text(encoding='utf-8')
    validate_pos = text.find('node scripts/validate-lockfile.mjs')
    vitest_guard_pos = text.find('node_modules/.bin/vitest')
    if validate_pos == -1:
        errors.append('production-gates.sh must validate the committed lockfile itself')
    if vitest_guard_pos != -1 and validate_pos > vitest_guard_pos:
        errors.append('production-gates.sh must validate lockfile before checking/running project tools')

if bootstrap.is_file():
    text = bootstrap.read_text(encoding='utf-8')
    if 'npm install --package-lock-only --ignore-scripts' not in text:
        errors.append('production-bootstrap must generate only the lockfile before npm ci')
    if 'node scripts/validate-lockfile.mjs' not in text:
        errors.append('production-bootstrap must validate the generated lockfile')
    if './node_modules/.bin/playwright install --with-deps chromium chrome msedge firefox' not in text:
        errors.append('production-bootstrap must execute the installed Playwright binary directly with OS dependencies')
    if 'curl -fsSI' in text or '--range 0-0' not in text:
        errors.append('production-bootstrap must probe SheetJS with a bounded GET rather than relying on HEAD')
    if 'npx ' in text:
        errors.append('production-bootstrap must not use npx for Playwright installation')
else:
    errors.append('production-bootstrap.sh missing')

if errors:
    for error in errors:
        print(f'FAIL {error}')
    sys.exit(1)
print('PASS production-bootstrap-workflow-check')
