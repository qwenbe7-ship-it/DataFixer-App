# Step 18 — Market-driven Exact Lookup / Join

## Decision
Step 18 is an explicitly approved post-original-V1 market extension. The original V1 core modes were Clean, Merge, and Validate. Step 18 adds a fourth mode, **Lookup**, because exact-key matching (XLOOKUP/VLOOKUP/SKU/customer-ID style work) repeatedly appeared in paid Excel/CSV automation jobs.

## Customer problem
A base file contains rows that must be enriched from a second reference file using an exact business key.

Example:

- Base: `sku | product_name`
- Reference: `product_sku | stock | supplier`
- Exact key: `sku = product_sku`
- Result: `sku | product_name | inventory_stock | inventory_supplier`

## Safety contract
Lookup intentionally implements a narrow, deterministic join rather than fuzzy matching.

1. Exactly two files are required.
2. The first file is the **base** file. Its rows are the rows being processed and reconciled.
3. The second file is the **reference** file. Its rows are lookup evidence, not rows in the processing-summary denominator.
4. One or more key columns may be configured on each side. Key counts must match.
5. Matching is exact and type-sensitive. Number `1` is not string `"1"`.
6. A base key with exactly one reference match is accepted and selected reference values are appended.
7. A base key with zero matches is `REJECTED` with `lookup.notFound`.
8. A base key with more than one reference match is `REJECTED` with `lookup.multipleMatches`; DataFixer does not guess which row to use.
9. Output target columns cannot overwrite existing base columns and cannot duplicate one another.
10. Reference values are copied without silent type coercion.
11. The base and reference datasets are not mutated.
12. Every added value records the reference `rowId`, source ID, and original source-row number in Evidence.

## Deterministic output order
Lookup result columns follow:

`base file column order → selected reference columns in the reference file's original column order`

The order does not depend on JavaScript object-key insertion order or JSON canonicalization. Saving and reloading a settings JSON therefore does not reorder Lookup result columns.

## Preview behavior
For ordinary modes the preview remains capped at up to 200 total input rows.

For Lookup:

- up to the first 200 **base rows** are previewed;
- the complete already-loaded reference dataset is indexed.

This prevents false `NOT_FOUND` preview results caused by truncating the reference file before a valid match.

## Reconciliation and evidence
For Lookup, `inputRows` means base-file rows only:

`base input rows = unchanged + changed + removed + rejected`

Reference rows are covered by `sourceHash` but are not counted as processed output rows.

Lookup currently produces:

- `lookup.valueAdded` — exact one-to-one match; value added to the base row
- `lookup.notFound` — no exact reference match
- `lookup.multipleMatches` — more than one reference row shares the exact key

Matched value evidence includes the reference row provenance.

## Reusable settings
Lookup settings are supported by the existing job-settings JSON format:

```json
{
  "version": 1,
  "mode": "lookup",
  "rules": [],
  "mergeSettings": null,
  "lookupSettings": {
    "leftKeyColumns": ["sku"],
    "rightKeyColumns": ["product_sku"],
    "rightValueMap": {
      "stock": "inventory_stock",
      "supplier": "inventory_supplier"
    }
  }
}
```

Existing Clean/Merge/Validate settings JSON output and settings hashes are deliberately kept compatible; adding Lookup does not inject a new null field into old-mode settings or change their historical hash input shape.

## UI
The guided application now exposes four modes:

- Clean
- Merge
- Lookup
- Validate

Lookup file selection explicitly explains that order matters: first file = base, second file = reference. The settings screen exposes base key columns, reference key columns, and reference-column → new-result-column mappings.

## Worker / exports
Lookup is connected through the same Web Worker pipeline as existing modes:

`parse → exact lookup → reconciliation/evidence → Result XLSX / Rejected XLSX / HTML report / Settings JSON`

The source identity includes both files, their selected worksheets, hashes, sizes, and processing order.

## Intentionally not implemented
Step 18 does **not** implement:

- fuzzy entity matching;
- approximate text similarity;
- “best match” guessing;
- many-to-many expansion;
- web enrichment;
- Shopify/CRM API writes;
- external database joins.

These remain separate market-driven decisions.

## Verification status
Local checks cover the Lookup engine, exact type-sensitive matching, zero/multiple matches, immutability, output order, reference provenance, mode isolation, preview behavior, settings round-trip, worker processing, bilingual reasons, HTML reporting, UI wiring, and four-mode representative acceptance.

Official Vitest/Playwright/real-SheetJS/Vite browser gates remain blocked in this execution environment until the npm dependencies can be installed.
