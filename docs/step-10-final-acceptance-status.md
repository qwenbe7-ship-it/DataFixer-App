# Step 10 — Final Product Acceptance Status

## Scope
Step 10 re-audits Stages 3–9, adds representative Clean/Merge/Validate acceptance scenarios, creates guided example files, browser E2E specifications, bilingual user guides, and the spec-to-build release checklist.

## Review finding fixed before acceptance
A Merge audit defect was reproduced: mapped output rows could change schema or gain a source column without emitting `CHANGED` evidence, causing accepted merged rows to be summarized as `UNCHANGED`.

Fix:
- Merge now emits `merge.mapped` evidence when the mapped output row differs from the input row structure/value sequence.
- Identity mappings that truly preserve keys, order, and values remain eligible for `UNCHANGED`.
- Korean/English UI and HTML report reason dictionaries include `merge.mapped`.
- Regression assertion added to `tests/local/merge-complete-check.ts`.

## Representative local acceptance
- Clean: 4 input = 1 unchanged + 1 changed + 1 removed + 1 rejected — PASS
- Merge: 5 input = 0 unchanged + 3 changed + 1 removed + 1 rejected — PASS
- Validate: 3 input = 1 unchanged + 0 changed + 0 removed + 2 rejected — PASS

`tests/local/release-scenarios-check.ts` also verifies workbook models, localized HTML reasons, stable output order, rejected-row preservation, and Clean/Validate/Merge settings round trips.

## Fresh local regression
Command:

```bash
bash tests/local/run-regression.sh
```

Result: `ALL_LOCAL_STAGE3_TO_STAGE10_CHECKS_PASS count=30`.

## Official quality gates
Fresh attempts in this execution environment:
- `npm run test:unit`: BLOCKED — `vitest` not installed (exit 127)
- `npm run test:browser`: BLOCKED — `vitest` not installed (exit 127)
- `npm run test:e2e`: BLOCKED — project Playwright test package unavailable; an unrelated/global CLI responds without the expected test command
- `npm run lint`: BLOCKED — `eslint` not installed (exit 127)
- `npm run build`: BLOCKED — React/XLSX/Node type dependencies are absent
- `npm ping`: BLOCKED — registry request timed out after 15 seconds

These conditions are environmental and are not counted as product PASS results.

## New release artifacts
- `public/examples/clean-orders.csv`
- `public/examples/merge-north.csv`
- `public/examples/merge-south.csv`
- `public/examples/validate-contacts.csv`
- `tests/e2e/clean.spec.ts`
- `tests/e2e/merge.spec.ts`
- `tests/e2e/validate.spec.ts`
- `docs/user-guide-ko.md`
- `docs/user-guide-en.md`
- `docs/release-checklist.md`

## Step 10 status
Implementation/audit artifacts: PASS.
Local acceptance and regression: PASS.
Release completion: BLOCKED until real dependencies, real SheetJS round-trips, Chrome/Edge/Firefox browser flows, offline flow, and network privacy inspection all pass.
