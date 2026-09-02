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
for name in "$@"; do
  config="tests/local/tsconfig.${name}.json"
  outdir=$(python - "$config" <<'PY2'
import json,sys,os
p=sys.argv[1]; d=json.load(open(p)); out=d['compilerOptions']['outDir']
print(os.path.abspath(os.path.join(os.path.dirname(p), out)))
PY2
)
  rm -rf "$outdir"
  "$TSC_BIN" -p "$config" >/tmp/datafixer-tsc-${name}.log 2>&1 || { cat /tmp/datafixer-tsc-${name}.log; exit 1; }
  mkdir -p "$outdir"
  printf '{"type":"commonjs"}\n' > "$outdir/package.json"
  if [[ "$name" == "xlsx-adapter" || "$name" == "worker" || "$name" == "workbook-reader" || "$name" == "example-files" || "$name" == "golden-dataset" ]]; then
    mkdir -p "$outdir/node_modules/xlsx"
    cat > "$outdir/node_modules/xlsx/index.js" <<'JS'
function parseCsv(text) {
  const rows = []; let row = [], cur = '', quote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (quote && text[i + 1] === '"') { cur += '"'; i++; } else quote = !quote; }
    else if (ch === ',' && !quote) { row.push(cur); cur = ''; }
    else if ((ch === '\n' || ch === '\r') && !quote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += ch;
  }
  if (cur !== '' || row.length > 0) { row.push(cur); rows.push(row); }
  return rows;
}
exports.read = function(input, options) {
  if (options.type === 'array') throw new Error('corrupt xlsx');
  const rows = parseCsv(String(input));
  return { SheetNames: ['Sheet1'], Sheets: { Sheet1: { __rows: rows } }, Props: {} };
};
exports.utils = {
  sheet_to_json(sheet, options) { return options && options.blankrows ? sheet.__rows : sheet.__rows.filter((row, index) => index === 0 || row.some((v) => v !== '' && v !== null && v !== undefined)); },
  book_new() { return { SheetNames: [], Sheets: {}, Props: {} }; },
  aoa_to_sheet(rows) { return { __rows: rows }; },
  book_append_sheet(workbook, sheet, name) { workbook.SheetNames.push(name); workbook.Sheets[name] = sheet; },
};
exports.write = function(workbook, options) {
  const sheets = {};
  for (const name of workbook.SheetNames) sheets[name] = workbook.Sheets[name].__rows;
  return new TextEncoder().encode(JSON.stringify({ sheetNames: workbook.SheetNames, sheets, props: workbook.Props || {}, options }));
};
JS
  fi
  check=$(find "$outdir" -type f -name "${name}-check.js" -print -quit)
  if [[ -z "$check" ]]; then check=$(find "$outdir" -type f -name '*-check.js' -print -quit); fi
  if [[ -z "$check" ]]; then echo "No check JS found for $name"; exit 1; fi
  node "$check"
  count=$((count+1))
done
echo "PASS_GROUP count=$count"
