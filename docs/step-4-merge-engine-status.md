# Step 4 — Merge Engine Status

Date: 2026-09-01

## Purpose

Merge multiple source datasets into one deterministic output schema without coercing conflicting values or mutating source data.

## Implemented

- Source-specific column mappings into declared output columns.
- Stable input dataset and row order.
- Missing target columns filled with `null`.
- Optional source-file column populated from `row.sourceId`.
- Selected-column deduplication; first row survives and later duplicates become `REMOVED`.
- Deterministic target-type inference from the first non-null value in stable input order.
- Type-conflicting rows become `REJECTED` without coercion.
- Rejected rows preserve their complete original values.
- Multiple type conflicts on one row retain all conflict evidence while rejecting the row once.
- Preflight validation before row construction:
  - missing source columns -> `MISSING_COLUMN`
  - missing source mapping -> `INVALID_RULE`
  - target outside output schema -> `INVALID_RULE`
  - two source columns mapped to one target -> `INVALID_RULE`
  - undeclared or colliding source column -> `INVALID_RULE`
  - missing dedupe column -> `MISSING_COLUMN`
  - duplicate/blank output columns -> `INVALID_RULE`
- Input datasets remain immutable.

## Fresh local verification

The following checks were compiled with TypeScript 5.8.3 in strict mode and executed with Node 22.16.0:

- `PASS clean-check`
- `PASS clean-rules-check`
- `PASS engine-check`
- `PASS merge-check`
- `PASS merge-dedupe-check`
- `PASS merge-type-conflict-check`
- `PASS merge-preflight-check`
- `PASS merge-settings-check`
- `PASS merge-complete-check`
- `ALL_LOCAL_STAGE3_AND_STAGE4_CHECKS_PASS`

This verifies Step 4 locally and also confirms that Step 4 did not break the independently executable Step 3 Clean checks.

## Official npm quality gates

Current environment status:

- `npm run test:unit -- tests/rules/merge.test.ts` -> `BLOCKED` (`vitest: not found`)
- `npm run lint` -> `BLOCKED` (`eslint: not found`)
- `npm run build` -> `BLOCKED` because React, XLSX, and Node type dependencies are not installed.
- `npm ping` -> no registry response before timeout.

These are environment/dependency-installation blockers. They are not recorded as PASS.

## Step status

**IMPLEMENTED + LOCAL VERIFICATION PASS / OFFICIAL NPM GATES BLOCKED**

The next product-roadmap step is Validate engine implementation.
