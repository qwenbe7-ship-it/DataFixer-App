# Step 7 — Export Artifacts Status

Date: 2026-09-01

## Outcome

The export layer is implemented for the four promised customer artifacts:

1. Result XLSX
2. Rejected XLSX
3. Self-contained bilingual HTML report
4. Reusable deterministic settings JSON

The available TypeScript/Node runtime independently verifies the export data model, HTML safety and bilingual reasons, settings validation/canonicalization, safe download filenames, and the SheetJS adapter contract.

Actual SheetJS XLSX binary round-trip remains BLOCKED because the current environment cannot install the `xlsx` dependency from the network.

## Implemented behavior

- Result workbook model uses sheets in exact order: `Result`, `Evidence`, `Summary`.
- Rejected workbook model uses sheets in exact order: `Rejected`, `Evidence`.
- Rejected workbook retains every evidence entry belonging to a rejected row, including prior CHANGED evidence, not only the terminal REJECTED reason.
- Header-only `Rejected` and `Evidence` sheets are still generated when there are no rejected rows.
- Evidence columns are fixed as: `rowId`, `ruleId`, `status`, `column`, `before`, `after`, `reasonKey`, `reasonParams`.
- Summary includes row counts, reconciliation state as a boolean, source hash, and settings hash.
- Unreconciled results are refused by XLSX export with `EXPORT_FAILED`.
- HTML report is UTF-8, self-contained, inline-CSS only, with no script, remote image, remote font, link stylesheet, iframe, or object resource.
- Dynamic values are HTML escaped.
- HTML report contains Korean/English human-readable explanations for every current Clean/Merge/Validate `reasonKey`, while retaining the machine-readable reason key.
- Settings JSON is canonicalized with recursively sorted object keys, preserves array/rule order, uses two-space indentation, and ends with a newline.
- Settings import rejects malformed JSON, non-array roots, unknown rule kinds, duplicate IDs, invalid rule fields/ranges/regex, blank required columns, and executable/remote fields such as `script`, `url`, and `callback`.
- Download filenames are prefixed with `datafixer-` and restricted to `[A-Za-z0-9._-]` plus the final extension.
- Production XLSX serialization is connected to SheetJS `book_new`, `aoa_to_sheet`, `book_append_sheet`, and `write({ type: 'array', bookType: 'xlsx' })`.
- No workbook creation timestamp is intentionally set.

## TDD / local verification

Step 7 features were introduced through RED → GREEN local checks, including:

- export workbook model
- rejected-row evidence completeness
- reconciliation value type in Summary
- HTML escaping and bilingual human reason text
- settings round trip and invalid/executable settings rejection
- safe download filenames
- SheetJS adapter contract and unreconciled-export refusal

Fresh combined verification after the final Step 7 changes passed 20 local checks covering Steps 3–7.

Final marker:

`ALL_LOCAL_STAGE3_TO_STAGE7_CHECKS_PASS count=20`

## Official quality gates

Fresh checks after the final Step 7 changes:

- `npm run test:unit -- tests/export`: BLOCKED, exit 127 (`vitest: not found`).
- `npm run lint`: BLOCKED, exit 127 (`eslint: not found`).
- `npm run build`: BLOCKED because React, SheetJS/XLSX and Node type dependencies are not installed.
- `npm ping`: BLOCKED; timed out while contacting `https://registry.npmjs.org/`.

Therefore real SheetJS XLSX round-trip and the official Vitest/ESLint/Vite gates are not marked PASS.
