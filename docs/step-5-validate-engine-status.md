# Step 5 — Validate Engine Status

Date: 2026-09-01

## Outcome

Implementation complete for the validation engine with independent TypeScript/Node verification passing. Official Vitest/ESLint/Vite gates remain BLOCKED because runtime dependencies cannot be installed in the current environment.

## Implemented validation rules

- required
- strict type: string, integer, number, date
- unique composite keys
- allowed values
- inclusive number ranges
- Unicode-aware string length
- regular expressions
- column-to-column comparison: eq, lt, lte, gt, gte

## Safety and evidence behavior

- Every rule is preflight-validated before row processing.
- Invalid regex throws INVALID_RULE before processing.
- Missing referenced columns throw MISSING_COLUMN before processing.
- Duplicate or blank rule IDs throw INVALID_RULE to keep evidence IDs unambiguous.
- Invalid numeric/length bounds throw INVALID_RULE.
- A failing row is placed in rejectedRows exactly once even when several rules fail.
- Every failed rule produces its own REJECTED evidence entry in declared rule order.
- Composite unique evidence records both key columns and collided values.
- Passing and rejected rows preserve input order.
- Input datasets and row values are never mutated.
- Date validation accepts real YYYY-MM-DD calendar dates and Excel date serial numbers when the user explicitly selects the date type; Excel serial 60 is rejected.

## Fresh local verification

The following checks passed together after the final Step 5 change:

- clean-check
- clean-rules-check
- engine-check
- merge-check
- merge-dedupe-check
- merge-type-conflict-check
- merge-preflight-check
- merge-settings-check
- merge-complete-check
- validate-all-check
- validate-boundary-check

Final marker: `ALL_LOCAL_STAGE3_TO_STAGE5_CHECKS_PASS`

## Official quality gates

- `npm run test:unit -- tests/rules/merge.test.ts tests/rules/validate.test.ts`: BLOCKED, exit 127 (`vitest: not found`)
- `npm run lint`: BLOCKED, exit 127 (`eslint: not found`)
- `npm run build`: BLOCKED, exit 1 because React, XLSX and Node type dependencies are not installed

These are environment/dependency blockers and are not marked PASS.
