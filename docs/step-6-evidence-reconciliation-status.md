# Step 6 — Evidence, Reconciliation, and Deterministic Hashes Status

Date: 2026-09-01

## Review before Step 6

Before starting Step 6, the full available local regression suite for Steps 3–5 was recompiled and rerun. All 11 checks passed. No blocking product defect was found in the Step 5 Validate engine during the review.

## Outcome

The evidence accounting layer, row reconciliation invariant, evidence completeness checks, final status precedence, and deterministic SHA-256 helpers are implemented and independently verified with the available TypeScript/Node runtime.

Official Vitest/ESLint/Vite gates remain BLOCKED because project runtime dependencies cannot be installed in the current execution environment.

## Implemented behavior

- Final row states use precedence: REJECTED > REMOVED > CHANGED > UNCHANGED.
- Every input row must appear in exactly one partition: output, removed, or rejected.
- Duplicate input row IDs, unknown result rows, unknown evidence rows, missing rows, and overlapping partitions fail with RECONCILIATION_FAILED.
- Every removed row requires at least one REMOVED evidence reason.
- Every rejected row requires at least one REJECTED evidence reason.
- Blank rule IDs or reason keys are rejected by the finalizer.
- Multiple CHANGED evidence entries for one row count as one changed row.
- UNCHANGED is represented in the in-memory status map and is not added to the downloadable evidence ledger.
- Evidence is returned in input-row order while preserving original evidence/rule order within each row.
- The invariant is enforced: inputRows = unchangedRows + changedRows + removedRows + rejectedRows.
- SHA-256 byte hashing matches the standard `abc` test vector.
- Canonical hashing recursively sorts object keys but preserves array order, so equivalent settings objects hash identically while rule-order changes hash differently.

## Fresh local verification

The final combined run passed 15 checks:

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
- reconcile-check
- ledger-check
- evidence-boundary-check
- hash-check

Final marker: `ALL_LOCAL_STAGE3_TO_STAGE6_CHECKS_PASS`

## Official quality gates

- `npm run test:unit -- tests/evidence`: BLOCKED, exit 127 (`vitest: not found`).
- `npm run lint`: BLOCKED, exit 127 (`eslint: not found`).
- `npm run build`: BLOCKED, exit 1 because React, XLSX and Node type dependencies are not installed.
- `npm ping`: BLOCKED in this execution environment; the fresh check timed out after 20 seconds while contacting `https://registry.npmjs.org/`.

These environment/dependency blockers are not marked PASS.
