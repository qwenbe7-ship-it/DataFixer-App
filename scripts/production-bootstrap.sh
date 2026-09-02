#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

node -e "const [a,b]=process.versions.node.split('.').map(Number); if (!(a>22 || (a===22 && b>=13))) { console.error('Node >=22.13 required'); process.exit(1) }"

if ! timeout 15 curl -fsS --connect-timeout 8 https://registry.npmjs.org/-/ping >/dev/null; then
  echo 'ERROR: npm registry is unreachable from this environment.' >&2
  exit 20
fi
if ! timeout 15 curl -fsS --range 0-0 --connect-timeout 8 -o /dev/null https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz >/dev/null; then
  echo 'ERROR: SheetJS CDN is unreachable from this environment.' >&2
  exit 21
fi

if [[ ! -f package-lock.json ]]; then
  echo 'Creating package-lock.json with the pinned package.json versions...'
  npm install --package-lock-only --ignore-scripts
fi

node scripts/validate-lockfile.mjs
npm ci --ignore-scripts
./node_modules/.bin/playwright install --with-deps chromium chrome msedge firefox

echo 'Production dependencies and browser runtimes are installed.'
