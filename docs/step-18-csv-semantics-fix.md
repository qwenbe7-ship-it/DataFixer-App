# Step 18 Stabilization — Real CSV Numeric Semantics

## Why this stabilization was required
Actual CSV files are read with SheetJS `raw:true` so identifiers such as `001` are not silently converted to numbers. That safety choice means numeric-looking CSV cells arrive as strings. Real-example verification exposed two consequences that the in-memory unit fixtures had hidden:

1. Validate treated `"30"` as non-numeric even when a numeric rule explicitly requested numeric semantics.
2. Merge inferred every raw CSV value as `string`, so an invalid value such as `"oops"` could not conflict with valid numeric-looking values such as `"100"`.

## Fix 1 — Validate interprets strict numeric text only for numeric rules
`type:number`, `type:integer`, and `numberRange` now interpret only strict decimal numeric text as a number for the purpose of validation. The source value is never mutated.

Examples:
- `"30"` with `type:number` → PASS, original remains `"30"`.
- `"17"` with range `18..65` → REJECTED by the range rule.
- `"30x"`, `"1e3"`, or whitespace-padded text → not silently accepted as a strict decimal number.

This is rule-directed interpretation, not global CSV coercion.

## Fix 2 — Merge supports explicit output types
`MergeSettings` now supports optional `outputTypes` for result columns:

```json
{
  "outputTypes": {
    "id": "string",
    "amount": "number",
    "source": "string"
  }
}
```

Supported expected types are `string`, `number`, and `boolean`.

Behavior:
- `id:string` preserves `"001"` exactly.
- `amount:number` converts strict numeric CSV text such as `"100"` to `100`.
- `amount:number` rejects `"oops"` with `merge.typeConflict` while preserving the original rejected row.
- a source-file metadata column can only be declared `string` because the source ID is textual.
- if `outputTypes` is omitted, the previous inference behavior remains for backward compatibility.

The Merge UI exposes these expected types per result column and warns users to keep identifier-like values such as `001` as strings.

## Actual example-file result
The real CSV examples now pass through file parsing, settings parsing, engine processing, evidence finalization, workbook-model generation, and HTML report generation:

- Clean: `4 = 1 unchanged + 1 changed + 1 removed + 1 rejected`
- Merge: `5 = 0 unchanged + 3 changed + 1 removed + 1 rejected`
- Lookup: `3 base = 0 unchanged + 1 changed + 0 removed + 2 rejected`
- Validate: `3 = 1 unchanged + 0 changed + 0 removed + 2 rejected`

All four summaries reconcile.

## Remaining release limitation
This local harness uses a contract stub for the unavailable `xlsx` package. The real SheetJS binary round-trip, Vitest/browser tests, Playwright E2E, production Vite build, and live browser network-privacy inspection remain blocked until npm dependencies can be installed.
