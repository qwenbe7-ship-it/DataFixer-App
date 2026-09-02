#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
if [[ -x node_modules/.bin/tsc ]]; then
  TSC_BIN="node_modules/.bin/tsc"
elif command -v tsc >/dev/null 2>&1; then
  TSC_BIN="$(command -v tsc)"
else
  echo "TypeScript compiler not found (node_modules/.bin/tsc or global tsc required)" >&2
  exit 127
fi
count=0
"$TSC_BIN" -p tests/local/tsconfig.ui-structure.json >/tmp/datafixer-tsc-ui.log 2>&1 || { cat /tmp/datafixer-tsc-ui.log; exit 1; }
echo "PASS ui-structure-check"; count=$((count+1))
./tests/local/privacy-static-check.sh; count=$((count+1))
python tests/local/lookup-ui-static-check.py; count=$((count+1))
python tests/local/merge-output-types-ui-check.py; count=$((count+1))
python tests/local/regex-replace-ui-check.py; count=$((count+1))
python tests/local/rule-kind-contract-check.py; count=$((count+1))
python tests/local/step19-pattern-normalize-check.py; count=$((count+1))
python tests/local/fill-coalesce-ui-check.py; count=$((count+1))
python tests/local/step20-fill-coalesce-check.py; count=$((count+1))
echo "PASS_STATIC count=$count"
