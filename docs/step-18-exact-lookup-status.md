# Step 18 Exact Lookup / Join — Status

## Status
`IMPLEMENTED / LOCAL PASS / OFFICIAL BROWSER-BUILD GATES BLOCKED`

## Implemented
- New `Lookup` app mode.
- Exactly two input files: first = base, second = reference.
- Exact, type-sensitive single- or composite-key lookup.
- One exact match appends configured reference values.
- Zero matches reject with `lookup.notFound`.
- Multiple reference matches reject with `lookup.multipleMatches` rather than guessing.
- Added-value evidence records target column, reference source column, reference row ID, source ID, and original row number.
- Reference column output order follows the reference dataset, so settings JSON canonicalization cannot reorder results.
- Lookup preview samples up to 200 base rows while retaining the full already-loaded reference dataset for accurate matching.
- Reconciliation counts base rows only; the reference file remains covered by `sourceHash`.
- Lookup job settings serialize/parse safely.
- Existing Clean/Merge/Validate settings JSON output and hash identity remain compatible.
- Mode-isolation preflight rejects irrelevant settings instead of silently ignoring them.
- Worker, HTML report, bilingual UI, guided state machine, and download pipeline are connected.
- Playwright Lookup E2E scenario is written for the official environment.

## Bugs / design hazards caught during Step 18
1. A generic 200-row preview would have truncated the reference dataset and produced false `NOT_FOUND` results.
2. Adding a nullable Lookup field to every settings hash would have changed existing Clean/Merge/Validate hashes without a real settings change.
3. Depending on object insertion order for mapped output columns would have allowed settings JSON canonicalization to reorder result columns.
4. Internal processing previously allowed irrelevant wrong-mode settings to be silently ignored; mode isolation is now explicit.
5. Lookup value evidence initially lacked the exact reference-row provenance needed for auditability.

## Fresh local verification
Final split verification on the current codebase:
- 24 file/rule/evidence/export checks: PASS
- 11 app/settings/worker/scenario checks: PASS
- 7 UI/privacy/sales/operations/market/Lookup-UI checks: PASS
- Total local gates: **42 PASS**

## Official gates
Fresh attempts remain blocked by the environment:
- Vitest unit: command unavailable (`vitest: not found`)
- Playwright E2E: project Playwright test command unavailable/incomplete
- ESLint: command unavailable (`eslint: not found`)
- Production build: React/XLSX/Node type dependencies unavailable
- `npm ping`: timeout

These official gates are not marked PASS.
