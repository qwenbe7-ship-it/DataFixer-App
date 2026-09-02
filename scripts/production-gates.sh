#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f package-lock.json ]] || { echo 'package-lock.json missing. Run scripts/production-bootstrap.sh first.' >&2; exit 30; }
node scripts/validate-lockfile.mjs
[[ -x node_modules/.bin/vitest ]] || { echo 'Dependencies missing. Run scripts/production-bootstrap.sh first.' >&2; exit 31; }

npm run lint
npm run test:unit
npm run test:performance
npm run test:browser
npm run build
npm run test:e2e

echo 'ALL_OFFICIAL_PRODUCTION_GATES_PASS'
