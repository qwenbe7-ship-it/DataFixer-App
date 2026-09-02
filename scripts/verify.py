#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys
import time
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPORT = ROOT / 'verify-report.json'
TAIL_CHARS = 6000


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def tail(text: str) -> str:
    return text[-TAIL_CHARS:]


def run_check(name: str, command: list[str], *, blocked_exit_codes: set[int] | None = None, cwd: Path = ROOT) -> dict[str, Any]:
    started = time.monotonic()
    proc = subprocess.run(command, cwd=cwd, text=True, capture_output=True)
    duration_ms = round((time.monotonic() - started) * 1000)
    blocked = blocked_exit_codes or set()
    status = 'PASS' if proc.returncode == 0 else ('BLOCKED' if proc.returncode in blocked else 'FAIL')
    return {
        'name': name,
        'command': command,
        'status': status,
        'exitCode': proc.returncode,
        'durationMs': duration_ms,
        'stdoutTail': tail(proc.stdout),
        'stderrTail': tail(proc.stderr),
    }


def git_state() -> dict[str, Any]:
    def capture(args: list[str]) -> str:
        proc = subprocess.run(['git', *args], cwd=ROOT, text=True, capture_output=True)
        return proc.stdout.strip() if proc.returncode == 0 else ''
    status = capture(['status', '--porcelain'])
    return {
        'commit': capture(['rev-parse', 'HEAD']) or None,
        'branch': capture(['branch', '--show-current']) or None,
        'dirty': bool(status),
    }


def build_report(mode: str, checks: list[dict[str, Any]], *, overall_status: str, started_at: str | None = None) -> dict[str, Any]:
    return {
        'schemaVersion': 1,
        'mode': mode,
        'git': git_state(),
        'startedAt': started_at or now_iso(),
        'finishedAt': now_iso(),
        'overallStatus': overall_status,
        'checks': checks,
    }


def write_report(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + '\n', encoding='utf-8')


def local_checks() -> list[dict[str, Any]]:
    py = sys.executable
    specs = [
        ('harness-contract', [py, 'tests/harness/harness-contract-check.py']),
        ('architecture-self-test', [py, 'tests/harness/architecture-check-test.py']),
        ('repo-map-freshness', [py, 'scripts/generate-repo-map.py', '--check']),
        ('verify-script-contract', [py, 'tests/harness/verify-script-check.py']),
        ('lockfile-validator-contract', [py, 'tests/harness/lockfile-validator-check.py']),
        ('production-bootstrap-contract', [py, 'tests/harness/production-bootstrap-workflow-check.py']),
        ('verify-local-unblock-contract', [py, 'tests/harness/verify-local-production-unblock-check.py']),
        ('browser-matrix-contract', [py, 'tests/harness/browser-matrix-contract-check.py']),
        ('privacy-production-contract', [py, 'tests/harness/privacy-production-contract-check.py']),
        ('performance-baseline-contract', [py, 'tests/harness/performance-baseline-contract-check.py']),
        ('preflight-contract', [py, 'tests/harness/preflight-contract-check.py']),
        ('local-regression', ['./tests/local/run-regression.sh']),
    ]
    checks = []
    for name, command in specs:
        print(f'RUN {name}', flush=True)
        checks.append(run_check(name, command))
    return checks


def official_checks() -> list[dict[str, Any]]:
    preflight = run_check('production-preflight', ['./scripts/production-preflight.sh'], blocked_exit_codes={2})
    checks = [preflight]
    if preflight['status'] != 'PASS':
        return checks
    checks.append(run_check('official-production-gates', ['./scripts/production-gates.sh']))
    return checks


def status_for(checks: list[dict[str, Any]]) -> str:
    statuses = {check['status'] for check in checks}
    if 'FAIL' in statuses:
        return 'FAIL'
    if 'BLOCKED' in statuses:
        return 'BLOCKED'
    return 'PASS'


def main() -> int:
    parser = argparse.ArgumentParser(description='DataFixer unified verification harness')
    parser.add_argument('mode', choices=['local', 'official', 'all'])
    parser.add_argument('--report', default=str(DEFAULT_REPORT))
    args = parser.parse_args()
    started_at = now_iso()
    checks: list[dict[str, Any]] = []

    if args.mode in {'local', 'all'}:
        checks.extend(local_checks())
        if status_for(checks) == 'FAIL':
            overall = 'FAIL'
            report = build_report(args.mode, checks, overall_status=overall, started_at=started_at)
            write_report(Path(args.report), report)
            for check in checks:
                print(f"{check['status']} {check['name']} ({check['durationMs']}ms)")
            print(f'VERIFY {overall} report={args.report}')
            return 1

    if args.mode in {'official', 'all'}:
        checks.extend(official_checks())

    overall = status_for(checks)
    report = build_report(args.mode, checks, overall_status=overall, started_at=started_at)
    write_report(Path(args.report), report)
    for check in checks:
        print(f"{check['status']} {check['name']} ({check['durationMs']}ms)")
    print(f'VERIFY {overall} report={args.report}')
    return 0 if overall == 'PASS' else (2 if overall == 'BLOCKED' else 1)


if __name__ == '__main__':
    sys.exit(main())
