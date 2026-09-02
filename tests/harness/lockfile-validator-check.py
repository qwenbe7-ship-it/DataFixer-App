#!/usr/bin/env python3
from pathlib import Path
import json
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / 'scripts/validate-lockfile.mjs'
PACKAGE = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))


def make_lock(*, bad_react: bool = False, bad_sheetjs: bool = False, bad_registry: bool = False, bad_identity: bool = False, bad_transitive_registry: bool = False, bad_sheetjs_version: bool = False, bad_lockfile_version: bool = False) -> dict:
    root_deps = dict(PACKAGE['dependencies'])
    root_dev = dict(PACKAGE['devDependencies'])
    packages: dict[str, dict] = {
        '': {
            'name': PACKAGE['name'],
            'version': PACKAGE['version'],
            'dependencies': root_deps,
            'devDependencies': root_dev,
        }
    }
    for name, spec in {**root_deps, **root_dev}.items():
        if spec.startswith('https://'):
            version = ('9.9.9' if bad_sheetjs_version and name == 'xlsx' else ('0.20.3' if name == 'xlsx' else '1.0.0'))
            resolved = 'https://example.invalid/wrong.tgz' if bad_sheetjs and name == 'xlsx' else spec
            packages[f'node_modules/{name}'] = {'version': version, 'resolved': resolved, 'integrity': 'sha512-test'}
        else:
            version = '0.0.0' if bad_react and name == 'react' else spec
            packages[f'node_modules/{name}'] = {
                'version': version,
                'resolved': ('https://evil.invalid/react.tgz' if bad_registry and name == 'react' else f'https://registry.npmjs.org/{name}/-/{name}-{version}.tgz'),
                'integrity': 'sha512-test',
            }
    if bad_transitive_registry:
        packages['node_modules/transitive-example'] = {
            'version': '1.2.3',
            'resolved': 'https://evil.invalid/transitive-example-1.2.3.tgz',
            'integrity': 'sha512-test',
        }
    return {
        'name': ('not-datafixer' if bad_identity else PACKAGE['name']),
        'version': ('9.9.9' if bad_identity else PACKAGE['version']),
        'lockfileVersion': (4 if bad_lockfile_version else 3),
        'requires': True,
        'packages': packages,
    }


if not VALIDATOR.is_file():
    print('FAIL lockfile validator missing')
    sys.exit(1)

with tempfile.TemporaryDirectory() as tmp:
    tmp_path = Path(tmp)
    package_path = tmp_path / 'package.json'
    package_path.write_text(json.dumps(PACKAGE), encoding='utf-8')

    good = tmp_path / 'good-lock.json'
    good.write_text(json.dumps(make_lock()), encoding='utf-8')
    proc = subprocess.run(['node', str(VALIDATOR), '--package', str(package_path), '--lockfile', str(good)], text=True, capture_output=True)
    if proc.returncode != 0:
        print('FAIL valid synthetic lockfile rejected')
        print(proc.stdout, proc.stderr)
        sys.exit(1)

    bad_version = tmp_path / 'bad-version.json'
    bad_version.write_text(json.dumps(make_lock(bad_react=True)), encoding='utf-8')
    proc = subprocess.run(['node', str(VALIDATOR), '--package', str(package_path), '--lockfile', str(bad_version)], text=True, capture_output=True)
    if proc.returncode == 0 or 'react' not in (proc.stdout + proc.stderr):
        print('FAIL mismatched direct dependency version was not rejected')
        sys.exit(1)

    bad_sheetjs = tmp_path / 'bad-sheetjs.json'
    bad_sheetjs.write_text(json.dumps(make_lock(bad_sheetjs=True)), encoding='utf-8')
    proc = subprocess.run(['node', str(VALIDATOR), '--package', str(package_path), '--lockfile', str(bad_sheetjs)], text=True, capture_output=True)
    if proc.returncode == 0 or 'xlsx' not in (proc.stdout + proc.stderr):
        print('FAIL SheetJS resolved URL drift was not rejected')
        sys.exit(1)


    bad_registry = tmp_path / 'bad-registry.json'
    bad_registry.write_text(json.dumps(make_lock(bad_registry=True)), encoding='utf-8')
    proc = subprocess.run(['node', str(VALIDATOR), '--package', str(package_path), '--lockfile', str(bad_registry)], text=True, capture_output=True)
    if proc.returncode == 0 or 'react' not in (proc.stdout + proc.stderr):
        print('FAIL direct dependency registry redirection was not rejected')
        sys.exit(1)

    bad_identity = tmp_path / 'bad-identity.json'
    bad_identity.write_text(json.dumps(make_lock(bad_identity=True)), encoding='utf-8')
    proc = subprocess.run(['node', str(VALIDATOR), '--package', str(package_path), '--lockfile', str(bad_identity)], text=True, capture_output=True)
    if proc.returncode == 0 or 'identity' not in (proc.stdout + proc.stderr).lower():
        print('FAIL lockfile project identity drift was not rejected')
        sys.exit(1)

    bad_transitive = tmp_path / 'bad-transitive-registry.json'
    bad_transitive.write_text(json.dumps(make_lock(bad_transitive_registry=True)), encoding='utf-8')
    proc = subprocess.run(['node', str(VALIDATOR), '--package', str(package_path), '--lockfile', str(bad_transitive)], text=True, capture_output=True)
    if proc.returncode == 0 or 'transitive-example' not in (proc.stdout + proc.stderr):
        print('FAIL transitive dependency registry redirection was not rejected')
        sys.exit(1)

    bad_sheetjs_version = tmp_path / 'bad-sheetjs-version.json'
    bad_sheetjs_version.write_text(json.dumps(make_lock(bad_sheetjs_version=True)), encoding='utf-8')
    proc = subprocess.run(['node', str(VALIDATOR), '--package', str(package_path), '--lockfile', str(bad_sheetjs_version)], text=True, capture_output=True)
    if proc.returncode == 0 or 'xlsx' not in (proc.stdout + proc.stderr):
        print('FAIL SheetJS package version drift was not rejected')
        sys.exit(1)

    bad_lockfile_version = tmp_path / 'bad-lockfile-version.json'
    bad_lockfile_version.write_text(json.dumps(make_lock(bad_lockfile_version=True)), encoding='utf-8')
    proc = subprocess.run(['node', str(VALIDATOR), '--package', str(package_path), '--lockfile', str(bad_lockfile_version)], text=True, capture_output=True)
    if proc.returncode == 0 or 'lockfileVersion' not in (proc.stdout + proc.stderr):
        print('FAIL unsupported future lockfile format was not rejected')
        sys.exit(1)

print('PASS lockfile-validator-check')
