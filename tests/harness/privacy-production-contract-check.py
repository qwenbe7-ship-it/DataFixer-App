#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
privacy = (ROOT / 'tests/e2e/privacy.spec.ts').read_text(encoding='utf-8')
vite = (ROOT / 'vite.config.ts').read_text(encoding='utf-8')
playwright = (ROOT / 'playwright.config.ts').read_text(encoding='utf-8')
live_script_path = ROOT / 'scripts/verify-live-host.mjs'
live_workflow_path = ROOT / '.github/workflows/live-host-verification.yml'
errors: list[str] = []

for marker in [
    "context.on('request'",
    'request.postData()',
    'request.headers()',
    "page.on('console'",
    'customerSecrets',
    "frame-ancestors 'none'",
    "content-security-policy",
]:
    if marker not in privacy.lower() if marker == 'content-security-policy' else marker not in privacy:
        errors.append(f'privacy E2E missing marker: {marker}')

listener_index = privacy.find("context.on('request'")
first_navigation_index = privacy.find("await page.goto('/')")
if listener_index < 0 or first_navigation_index < 0 or listener_index > first_navigation_index:
    errors.append('privacy E2E must install the request listener before the first navigation')

if "frame-ancestors 'none'" not in vite:
    errors.append('Vite production preview CSP must include frame-ancestors none')
if 'preview:' not in vite or 'Content-Security-Policy' not in vite:
    errors.append('Vite production preview must emit CSP as an HTTP response header')

if 'DATAFIXER_BASE_URL' not in playwright:
    errors.append('Playwright config must support DATAFIXER_BASE_URL for live-host verification')
if 'webServer' not in playwright:
    errors.append('Playwright config must retain the local preview webServer path')

if not live_script_path.exists():
    errors.append('live-host header verifier script is missing')
else:
    live_script = live_script_path.read_text(encoding='utf-8')
    for marker in [
        'content-security-policy',
        "frame-ancestors 'none'",
        'x-content-type-options',
        'x-frame-options',
        'referrer-policy',
        'permissions-policy',
    ]:
        if marker not in live_script.lower():
            errors.append(f'live-host verifier missing marker: {marker}')

if not live_workflow_path.exists():
    errors.append('live-host verification workflow is missing')
else:
    live_workflow = live_workflow_path.read_text(encoding='utf-8')
    for marker in [
        'verify-live-host.mjs',
        'DATAFIXER_BASE_URL',
        'privacy.spec.ts',
        'clean.spec.ts',
    ]:
        if marker not in live_workflow:
            errors.append(f'live-host workflow missing marker: {marker}')

if errors:
    for error in errors:
        print(f'FAIL {error}')
    sys.exit(1)
print('PASS privacy-production-contract-check')
