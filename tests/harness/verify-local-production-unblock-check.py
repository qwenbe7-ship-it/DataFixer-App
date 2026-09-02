#!/usr/bin/env python3
from pathlib import Path
import importlib.util
import sys

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts/verify.py'
spec = importlib.util.spec_from_file_location('datafixer_verify_for_unblock', SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)

# Inspect source rather than execute the whole suite: these checks must be part of the unified local harness.
text = SCRIPT.read_text(encoding='utf-8')
for required in ['lockfile-validator-check.py', 'production-bootstrap-workflow-check.py', 'browser-matrix-contract-check.py', 'privacy-production-contract-check.py', 'preflight-contract-check.py']:
    if required not in text:
        print(f'FAIL unified local verifier missing {required}')
        sys.exit(1)
print('PASS verify-local-production-unblock-check')
