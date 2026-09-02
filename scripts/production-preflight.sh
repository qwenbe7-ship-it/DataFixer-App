#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

blocked=0
fatal=0
say() { printf '%-30s %s\n' "$1" "$2"; }

node_version=$(node -p "process.versions.node")
if node -e "const [a,b]=process.versions.node.split('.').map(Number); process.exit(a>22 || (a===22 && b>=13) ? 0 : 1)"; then
  say "Node >= 22.13" "PASS ($node_version)"
else
  say "Node >= 22.13" "FAIL ($node_version)"
  fatal=1
fi

npm_version=$(npm -v)
say "npm" "INFO ($npm_version)"

if [[ -f package-lock.json ]]; then
  if node scripts/validate-lockfile.mjs >/dev/null 2>&1; then
    say "package-lock.json" "PASS (validated)"
  else
    say "package-lock.json" "FAIL (does not match package.json trust contract)"
    fatal=1
  fi
else
  say "package-lock.json" "BLOCKED (first networked bootstrap must create it)"
  blocked=1
fi

if (( fatal != 0 )); then
  exit 1
fi

if getent hosts registry.npmjs.org >/dev/null 2>&1; then
  say "DNS registry.npmjs.org" "PASS"
else
  say "DNS registry.npmjs.org" "BLOCKED"
  blocked=1
fi

if timeout 8 curl -fsS --connect-timeout 5 https://registry.npmjs.org/-/ping >/dev/null 2>&1; then
  say "npm registry HTTPS" "PASS"
else
  say "npm registry HTTPS" "BLOCKED"
  blocked=1
fi

if timeout 12 curl -fsS --range 0-0 --connect-timeout 5 -o /dev/null https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz >/dev/null 2>&1; then
  say "SheetJS CDN HTTPS" "PASS"
else
  say "SheetJS CDN HTTPS" "BLOCKED"
  blocked=1
fi

if command -v chromium >/dev/null 2>&1; then
  say "System Chromium" "PASS ($(chromium --version | head -1))"
else
  say "System Chromium" "INFO (Playwright installs its declared browser matrix)"
fi

if (( blocked != 0 )); then
  exit 2
fi
exit 0
