#!/usr/bin/env python3
from pathlib import Path
import importlib.util
import json
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts/verify.py'
if not SCRIPT.is_file():
    print('FAIL scripts/verify.py missing')
    sys.exit(1)

spec = importlib.util.spec_from_file_location('datafixer_verify', SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)

passed = module.run_check('pass-probe', [sys.executable, '-c', 'print("ok")'])
failed = module.run_check('fail-probe', [sys.executable, '-c', 'import sys; print("bad", file=sys.stderr); sys.exit(7)'])
blocked = module.run_check('blocked-probe', [sys.executable, '-c', 'import sys; sys.exit(2)'], blocked_exit_codes={2})
not_blocked = module.run_check('not-blocked-probe', [sys.executable, '-c', 'import sys; sys.exit(1)'], blocked_exit_codes={2})
if passed['status'] != 'PASS' or passed['exitCode'] != 0:
    raise SystemExit('FAIL PASS probe not represented correctly')
if failed['status'] != 'FAIL' or failed['exitCode'] != 7:
    raise SystemExit('FAIL FAIL probe not represented correctly')
if blocked['status'] != 'BLOCKED' or blocked['exitCode'] != 2:
    raise SystemExit('FAIL configured blocked exit code not represented correctly')
if not_blocked['status'] != 'FAIL' or not_blocked['exitCode'] != 1:
    raise SystemExit('FAIL project failure was incorrectly classified as BLOCKED')

with tempfile.TemporaryDirectory() as tmp:
    report = Path(tmp) / 'report.json'
    payload = module.build_report('local', [passed, failed], overall_status='FAIL')
    module.write_report(report, payload)
    parsed = json.loads(report.read_text())
    if parsed['schemaVersion'] != 1 or parsed['overallStatus'] != 'FAIL' or len(parsed['checks']) != 2:
        raise SystemExit('FAIL report schema')

print('PASS verify-script-check')
