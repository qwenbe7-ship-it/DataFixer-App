#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
privacy = (ROOT / 'tests/e2e/privacy.spec.ts').read_text(encoding='utf-8')
vite = (ROOT / 'vite.config.ts').read_text(encoding='utf-8')
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

if errors:
    for error in errors:
        print(f'FAIL {error}')
    sys.exit(1)
print('PASS privacy-production-contract-check')
