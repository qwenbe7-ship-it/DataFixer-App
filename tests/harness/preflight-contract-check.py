#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
text = (ROOT / 'scripts/production-preflight.sh').read_text(encoding='utf-8')
errors: list[str] = []
for marker in [
    'node scripts/validate-lockfile.mjs',
    'blocked=0',
    'fatal=0',
    'exit 2',
    'exit 1',
]:
    if marker not in text:
        errors.append(f'production preflight missing marker: {marker}')
fatal_guard = text.find('if (( fatal != 0 )); then')
dns_probe = text.find('if getent hosts registry.npmjs.org')
if fatal_guard < 0 or dns_probe < 0 or fatal_guard > dns_probe:
    errors.append('fatal project-state errors must exit before network probes')

node_fail = text.find('say "Node >= 22.13" "FAIL')
node_fatal = text.find('fatal=1', node_fail)
if node_fail < 0 or node_fatal < 0:
    errors.append('unsupported Node version must be a project FAIL that sets fatal=1')

if errors:
    for error in errors:
        print(f'FAIL {error}')
    sys.exit(1)
print('PASS preflight-contract-check')
