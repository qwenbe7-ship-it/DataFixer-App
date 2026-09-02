# Step 3 — Clean Rules and Ordered Rule Engine Status

Date: 2026-09-01

## Outcome

Task 3 production code and tests are implemented. The dependency-free local verification suite passes. The official npm quality gate remains BLOCKED because this execution environment cannot resolve `registry.npmjs.org`, so project dependencies are not installed.

## Implemented Clean rules

- trim
- collapseSpaces
- normalizeEmpty
- changeCase: upper / lower / title
- parseDate: YYYY-M-D / YYYY/M/D to YYYY-MM-DD
- parseDate: modern Excel numeric serial dates to YYYY-MM-DD
- parseNumber with optional thousands separators
- replace
- renameColumn
- keepColumns
- dedupe by selected columns
- dedupe by complete current row when `columns` is empty

## Safety behavior

- Invalid date and number values are not partially coerced; they are preserved and marked REJECTED.
- Malformed thousands separators such as `1,2,3` are rejected.
- Rule execution is deterministic and follows declared order.
- Source datasets and rows are not mutated.
- Missing columns are detected before any row processing begins.
- Renaming a column onto an existing column is rejected with `INVALID_RULE` before processing, preventing silent data loss.
- First duplicate survives; later duplicates are removed with machine-readable evidence.
- Rejected rows are excluded from normal output and retained once in `rejectedRows`.
- Evidence order follows input-row order and rule order.

## Fresh local verification

Commands executed through dedicated TypeScript harnesses:

- `tsc -p tests/local/tsconfig.clean.json` + `node .../clean-check.js` → PASS
- `tsc -p tests/local/tsconfig.clean-rules.json` + `node .../clean-rules-check.js` → PASS
- `tsc -p tests/local/tsconfig.engine.json` + `node .../engine-check.js` → PASS

Observed output:

```text
PASS clean-check
PASS clean-rules-check
PASS engine-check
ALL_LOCAL_TASK3_CHECKS_PASS
```

## Official quality gate

The plan requires:

```text
npm run test:unit -- tests/rules/clean.test.ts tests/rules/engine.test.ts
npm run lint
npm run build
```

Current result:

- unit: BLOCKED (`vitest: not found`)
- lint: BLOCKED (`eslint: not found`)
- build: BLOCKED (React, Node types, and XLSX packages unavailable)

Fresh registry check:

```text
npm ping
EAI_AGAIN getaddrinfo registry.npmjs.org
```

Therefore Task 3 must not be marked fully released until dependencies can be installed and the official commands exit 0.
