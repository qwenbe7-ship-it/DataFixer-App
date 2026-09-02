# DataFixer Step 9 — Worker, Performance Boundaries, and Privacy Status

## Scope completed

- Added a serializable worker protocol for Clean/Merge/Validate jobs.
- Added worker-side file limit enforcement, worksheet parsing, source hashing, processing, XLSX export, HTML report generation, and settings JSON generation.
- Added ordered progress events for `parse`, `process`, and `export`.
- Added a browser worker client that transfers file ArrayBuffers and converts structured worker errors back into `DataFixerError`.
- Added eager worker creation on page load so an already opened page has its processing worker loaded before a later offline transition.
- Added strict meta CSP and documented the required production `frame-ancestors 'none'` response header.
- Added browser/E2E test specifications for worker execution, privacy, byte boundaries, and offline continuity.

## Review fixes made before and during Step 9

1. Clean job settings could contain Validate rules (and vice versa) and pass parsing. Mode-specific rule validation was added to both job-settings parsing and `processDatasets()`.
2. Clean processing allowed blank or duplicate rule IDs, which could make audit evidence ambiguous. Engine preflight now rejects them.
3. Clean schema rules could remove every column, repeat schema columns, or rename a column to a blank name. Engine preflight now rejects these configurations.
4. Clean date parsing accepted extremely large Excel serial numbers that could produce invalid dates. The supported serial range is now bounded consistently with date validation.
5. Validate `numberRange` and `length` rules with neither minimum nor maximum could silently become no-op rules. They are now rejected as `INVALID_RULE`.
6. Creating the worker only when full processing began could violate current-page offline continuity. The worker is now created and retained when the application mounts and terminated only when the app unmounts.

## Fresh local verification

`tests/local/run-regression.sh` covers Clean, Merge, Validate, evidence/reconciliation, hashing, export models, settings, UI state, worker orchestration, worker client/request construction, and static privacy checks.

Expected current result: `ALL_LOCAL_STAGE3_TO_STAGE9_CHECKS_PASS count=29`.

## Official gates still blocked by this execution environment

- npm registry connectivity times out.
- Vitest is not installed, so official unit/browser suites cannot execute.
- `@playwright/test` is not installed, so Playwright E2E cannot execute.
- ESLint is not installed.
- React/XLSX/Node dependency types are not installed, so the official Vite build cannot complete.

Do not mark browser privacy, current-page offline continuity, or real SheetJS XLSX round-trip as PASS until those official suites run in a dependency-enabled environment.
