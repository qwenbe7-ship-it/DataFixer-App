# DataFixer Step 8 — Bilingual Guided UI Status

Date: 2026-09-01

## Scope implemented

- Five-step workflow: MODE → FILES → RULES → DRY_RUN → RESULT
- Explicit reducer guards for illegal transitions
- Korean/English dictionaries with parity and interpolation checks
- Browser-language default with manual language switch
- File selection, worksheet inspection, first-20-row preview
- Clean/Validate single-file workflow and Merge multi-file workflow
- Rule editor for all V1 Clean and Validate rules
- Merge column mapping editor
- Job settings JSON load/save including Merge mappings
- Dry-run sampling capped at 200 total rows
- Explicit full-processing click after dry run
- Reconciled result summary and four download actions
- Accessible native controls, keyboard-focus movement, text/icon status labels
- Local-only privacy notice visible at the top of the workflow

## Integration correction discovered in this step

The previous settings JSON contract stored only RuleSpec[]. That was insufficient for Merge because the reusable settings must also retain source-specific column mappings, output columns, source column, and deduplication columns. Step 8 adds a versioned job-settings file containing mode, rules, and MergeSettings, with strict structural validation and rejection of unknown/executable fields.

## Fresh local verification

`tests/local/run-regression.sh` passed 25 checks covering Clean, Merge, Validate, evidence/reconciliation, hashing, export models, HTML report, settings, download safety, XLSX adapter contract, reducer, i18n, processing orchestration, job settings, and UI structural TypeScript compilation.

Final line:

`ALL_LOCAL_STAGE3_TO_STAGE8_CHECKS_PASS count=25`

## Official runtime gate

BLOCKED in the current execution environment:

- npm registry DNS: `EAI_AGAIN registry.npmjs.org`
- `npm run test:unit`: `vitest: not found`
- `npm run lint`: `eslint: not found`
- `npm run build`: React/XLSX/Vite dependencies are not installed
- Browser-mode test files exist, but cannot run until dependencies and Playwright browser runtime are installed

Therefore Step 8 is not claimed as browser-runtime verified. Its current status is:

**IMPLEMENTED + LOCAL CONTRACT/STRUCTURE VERIFIED / OFFICIAL BROWSER GATE BLOCKED BY ENVIRONMENT**
