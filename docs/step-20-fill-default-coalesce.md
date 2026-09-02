# Step 20 — Fill / Default / Coalesce

## Why this exists
Real CSV/Excel cleanup jobs repeatedly ask for rules such as “fill blank country with US”, “use mobile when phone is empty”, or “use the first available identifier from several columns”. These are deterministic and reusable, so they belong in the Clean rule engine rather than manual spreadsheet work.

## Rules

### `fillDefault`
Shape: `{ id, kind: "fillDefault", column, value }`.

- Runs only when the target value is `null`.
- Does not overwrite strings, numbers, zero, or `false`.
- Default may be a string, finite number, or boolean.
- `null` and empty-string defaults are rejected before processing.
- Evidence reason: `clean.defaultFilled`.

### `coalesce`
Shape: `{ id, kind: "coalesce", column, sourceColumns }`.

- The target column must already exist in V1.
- Runs only when the target is `null`.
- Scans `sourceColumns` left-to-right and uses the first value that is not `null`.
- Zero and `false` count as present values.
- If no source has a value, the row remains unchanged.
- Empty lists, duplicate source columns, and missing columns are rejected before processing.
- Evidence reason: `clean.coalesced` with `sourceColumn` in `reasonParams`.

Creating a brand-new derived target column is intentionally deferred to the later calculated/derived-column extension.

## Actual CSV example
Files:
- `public/examples/fill-coalesce.csv`
- `public/examples/fill-coalesce-settings.json`

Expected local result:
- 4 input rows
- 1 unchanged
- 3 changed
- 0 removed
- 0 rejected
- reconciliation `true`

The example verifies actual CSV parsing, job-settings parsing, Clean processing, Evidence, HTML reason text, Result workbook model values, and an empty Rejected workbook model.

## Regex safety stabilization discovered during direct verification
Direct adversarial execution of `(a+)+$` against only 31 characters exceeded a two-second process timeout. Because JavaScript regular expressions have no built-in execution timeout, Pattern Normalize and Validate regex preflight now reject a conservative high-risk subset before execution, including nested repeated groups, repeated alternation groups, backreferences, non-capturing constructs outside the supported simple subset, and patterns longer than 256 characters. Existing phone/SKU patterns and capture-group formatting remain supported.

This is defense-in-depth, not a mathematical proof that every possible JavaScript regular expression has bounded runtime. A worker-level hard timeout remains a useful later production safeguard.
