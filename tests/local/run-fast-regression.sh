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
outdir=".local-test-harness"
rm -rf "$outdir"
"$TSC_BIN" -p tests/local/tsconfig.harness.json
printf '{"type":"commonjs"}\n' > "$outdir/package.json"
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
mapfile -t checks < <(find "$outdir/tests/local" -maxdepth 1 -type f -name '*-check.js' | sort)
for check in "${checks[@]}"; do
  node "$check"
done
./tests/local/run-static-checks.sh
count=$((${#checks[@]} + 9))
echo "ALL_LOCAL_DATAFIXER_CHECKS_PASS count=$count"
