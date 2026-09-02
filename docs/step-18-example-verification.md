# Step 18 — Real Example File Verification

## Verdict
All four provided CSV example workflows now pass in the local file-level verification harness after fixing the CSV numeric-semantics defects discovered by the first real-example run.

This is stronger than the earlier in-memory scenario tests because the check reads the actual files under `public/examples/` as browser `File` objects, passes them through `readWorksheet()`, parses reusable settings, runs `processDatasets()`, finalizes evidence, and builds workbook models and HTML reports.

## Actual example results

### Clean — PASS
`clean-orders.csv`:
- input 4
- unchanged 1
- changed 1
- removed 1
- rejected 1
- reconciled true
- rejected source row remains `clean-orders.csv:5`

### Merge — PASS
`merge-north.csv` + `merge-south.csv` with explicit result types:
- input 5
- unchanged 0
- changed 3
- removed 1
- rejected 1
- reconciled true
- `amount:number` converts `"100"`, `"50"`, `"200"` to numeric values
- `"oops"` is rejected and the original source row is preserved
- `id:string` preserves identifier semantics

### Lookup — PASS
`lookup-orders.csv` + `lookup-inventory.csv`:
- base input 3
- changed 1
- rejected 2
- duplicate reference key → `lookup.multipleMatches`
- missing key → `lookup.notFound`
- evidence points to `lookup-inventory.csv:2`

### Validate — PASS
`validate-contacts.csv`:
- input 3
- unchanged 1
- rejected 2
- reconciled true
- strict numeric CSV text such as `"30"` satisfies numeric validation without changing the original cell value
- invalid rows retain multiple applicable validation reasons

## Defects found by real-example testing

### Fixed — CSV empty cells vs XLSX blanks
Exact empty CSV fields are normalized to `null`, aligning blank-cell behavior without trimming meaningful whitespace.

### Fixed — Validate numeric rules on raw CSV text
Numeric validation now performs strict, rule-directed numeric interpretation rather than requiring JavaScript `number` values. It does not globally coerce CSV data.

### Fixed — Merge semantic type checking on raw CSV text
Merge now supports explicit output types. Numeric CSV text is converted only when the user declares a numeric target column, preventing accidental loss of leading-zero identifiers.

## Fresh local regression status
The final code is covered by dedicated regressions for:
- actual example files
- Validate CSV numeric semantics
- Merge explicit output types
- Merge output-type UI/settings handling
- all pre-existing Clean/Merge/Lookup/Validate, evidence, export, Worker, UI-structure, privacy, sales, and operations checks

## Official environment
Official Vitest, ESLint, Vite production build, real SheetJS, and browser E2E remain `BLOCKED` because required npm dependencies are not installed and npm registry access timed out during this verification run.

## Release decision
The provided CSV examples are locally verified across all four modes. Public release remains `NO-GO` until the separate official browser, real XLSX, production-build, and network-privacy gates pass.
