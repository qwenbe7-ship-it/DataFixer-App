# DataFixer V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual, static, browser-only DataFixer V1 that cleans, merges, and validates CSV/XLSX files without sending customer data to a server.

**Architecture:** A React/TypeScript static app reads spreadsheet bytes in a Web Worker, converts them to a typed in-memory dataset, applies pure deterministic rules, records row-level evidence, and returns downloadable XLSX/HTML/JSON artifacts. UI state is separate from domain logic so file processing, reconciliation, and export behavior can be tested without rendering the interface.

**Tech Stack:** React, TypeScript, Vite, SheetJS CE 0.20.3, Vitest, Vitest Browser Mode, Playwright, ESLint, Web Crypto API, Web Workers

**Spec:** `docs/superpowers/specs/2026-09-01-datafixer-v1-design.md`

## Global Constraints

- Support `.csv` encoded as UTF-8 or UTF-8 BOM and `.xlsx` selected worksheets only.
- Enforce 20MB per file, 50MB total per job, and 10 files per job.
- Never overwrite, rename, move, or delete source files.
- Never transmit file bytes, column names, cell values, settings, or evidence to a server or analytics endpoint.
- Every row has exactly one final status: `UNCHANGED`, `CHANGED`, `REMOVED`, or `REJECTED`.
- Reconcile every run with `input rows = unchanged + changed + removed + rejected`; block normal downloads when reconciliation fails.
- Every removed or rejected row must have at least one machine-readable rule ID and a Korean/English human-readable reason.
- The same input bytes plus the same settings JSON must produce the same output bytes except for an explicitly excluded download timestamp field; V1 omits timestamps from deterministic artifacts.
- Provide Korean and English UI copy; detect browser language on first load and allow immediate switching.
- V1 excludes PDF/OCR, external APIs, email, scraping, cloud databases, authentication, payments, AI APIs, collaborative editing, mobile-only UI, Windows `.exe`, tax invoicing, accounting filing, automated trading, and investment advice.
- Use TDD: write a focused failing test, observe the expected failure, add the minimum implementation, run focused tests, then run the relevant suite.
- Commit after every task using the exact commit message listed in that task.

---

## File Structure

```text
datafixer/
├── index.html                         # Static entry point and Content Security Policy
├── package.json                       # Scripts and pinned dependencies
├── package-lock.json                  # Reproducible dependency lock
├── tsconfig.json                      # Strict TypeScript settings
├── vite.config.ts                     # Static build and worker bundling
├── vitest.config.ts                   # Unit and browser test projects
├── playwright.config.ts               # Chromium/Firefox and release smoke tests
├── eslint.config.js                   # TypeScript/React lint rules
├── public/
│   └── examples/                      # Safe sample files for the guided demo
├── src/
│   ├── main.tsx                       # React bootstrap only
│   ├── app/
│   │   ├── App.tsx                    # Five-step application shell
│   │   ├── app-reducer.ts             # Explicit UI workflow state machine
│   │   └── app.css                    # Shared visual styles and status colors
│   ├── domain/
│   │   ├── types.ts                   # Dataset, row, rule, evidence, and result contracts
│   │   ├── errors.ts                  # Stable user-facing error codes
│   │   └── factories.ts               # Deterministic row/dataset construction
│   ├── file-io/
│   │   ├── limits.ts                  # File-count and byte-limit checks
│   │   ├── workbook-reader.ts         # CSV/XLSX parsing and sheet inspection
│   │   └── normalize-sheet.ts         # Two-dimensional sheet to typed dataset
│   ├── rules/
│   │   ├── clean.ts                   # Clean rule implementations
│   │   ├── merge.ts                   # Schema mapping and deterministic merge
│   │   ├── validate.ts                # Validation rule implementations
│   │   └── engine.ts                  # Ordered rule execution
│   ├── evidence/
│   │   ├── ledger.ts                  # Row-level evidence accumulation
│   │   ├── reconcile.ts               # Summary invariant and download gate
│   │   └── hash.ts                    # SHA-256 source/settings identity
│   ├── export/
│   │   ├── xlsx-export.ts             # Result and rejected-row workbooks
│   │   ├── html-report.ts              # Self-contained bilingual evidence report
│   │   ├── settings-export.ts          # Canonical JSON rule settings
│   │   └── download.ts                 # Main-thread Blob download helper
│   ├── worker/
│   │   ├── protocol.ts                 # Structured request/response messages
│   │   └── data.worker.ts              # Parse, process, reconcile, and export work
│   ├── i18n/
│   │   ├── ko.ts                       # Korean copy
│   │   ├── en.ts                       # English copy
│   │   └── index.ts                    # Typed translation lookup
│   └── ui/
│       ├── ModePicker.tsx              # Clean/Merge/Validate selection
│       ├── FilePicker.tsx              # Drag/drop, limits, and sheet selection
│       ├── RuleEditor.tsx              # Explicit rule form and ordering
│       ├── DryRunPreview.tsx            # Before/after and status preview
│       ├── ResultSummary.tsx            # Reconciled totals and downloads
│       └── ErrorPanel.tsx               # Actionable input/rule/process errors
├── tests/
│   ├── fixtures/                       # Generated deterministic CSV/XLSX inputs
│   ├── domain/                         # Pure model and invariant tests
│   ├── file-io/                        # Parser, encoding, sheet, and limit tests
│   ├── rules/                          # Clean, merge, validate, and engine tests
│   ├── evidence/                       # Ledger, hash, and reconciliation tests
│   ├── export/                         # XLSX/HTML/JSON round-trip tests
│   ├── browser/                        # Component and browser API tests
│   └── e2e/                            # Full user flow and network privacy tests
└── docs/
    ├── user-guide-ko.md                # Korean user guide
    ├── user-guide-en.md                # English user guide
    └── release-checklist.md            # Supported-browser and privacy evidence
```

## Stable Domain Interfaces

The following names are contractual. Later tasks use these exact types and signatures.

```ts
export type CellValue = string | number | boolean | null;
export type RowStatus = 'UNCHANGED' | 'CHANGED' | 'REMOVED' | 'REJECTED';

export interface DataRow {
  rowId: string;
  sourceId: string;
  sourceRowNumber: number;
  values: Record<string, CellValue>;
}

export interface Dataset {
  columns: string[];
  rows: DataRow[];
  sourceIds: string[];
}

export interface EvidenceEntry {
  rowId: string;
  ruleId: string;
  status: RowStatus;
  column?: string;
  before?: CellValue;
  after?: CellValue;
  reasonKey: string;
  reasonParams: Record<string, string | number>;
}

export interface ProcessingSummary {
  inputRows: number;
  unchangedRows: number;
  changedRows: number;
  removedRows: number;
  rejectedRows: number;
  reconciled: boolean;
}

export interface ProcessingResult {
  output: Dataset;
  rejected: Dataset;
  evidence: EvidenceEntry[];
  summary: ProcessingSummary;
  sourceHash: string;
  settingsHash: string;
}
```

---

### Task 1: Project Foundation and Domain Contracts

**Files:**
- Modify: `datafixer/package.json`
- Modify: `datafixer/tsconfig.json`
- Modify: `datafixer/vite.config.ts`
- Create: `datafixer/vitest.config.ts`
- Create: `datafixer/playwright.config.ts`
- Modify: `datafixer/eslint.config.js`
- Create: `datafixer/src/domain/types.ts`
- Create: `datafixer/src/domain/errors.ts`
- Create: `datafixer/src/domain/factories.ts`
- Test: `datafixer/tests/domain/factories.test.ts`

**Interfaces:**
- Consumes: approved design spec only.
- Produces: `CellValue`, `RowStatus`, `DataRow`, `Dataset`, `EvidenceEntry`, `ProcessingSummary`, `ProcessingResult`, `DataFixerError`, `makeRow()`, and `makeDataset()`.

- [ ] **Step 1: Scaffold the Vite React TypeScript app and install test dependencies**

Run:

```bash
npm create vite@latest datafixer -- --template react-ts
cd datafixer
npm install
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
npm install -D vitest @vitest/browser-playwright vitest-browser-react @playwright/test eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh
npx playwright install chromium firefox
```

Expected: `package-lock.json` exists and `npm run build` succeeds with the untouched scaffold.

- [ ] **Step 2: Replace package scripts with the project quality gates**

Create `vitest.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/{domain,file-io,rules,evidence,export}/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'browser',
          include: ['tests/browser/**/*.test.ts', 'tests/browser/**/*.test.tsx'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
```

Set the `scripts` object in `package.json` to:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "test:unit": "vitest run --project unit",
  "test:browser": "vitest run --project browser",
  "test:e2e": "playwright test",
  "test": "npm run test:unit && npm run test:browser && npm run test:e2e",
  "preview": "vite preview"
}
```

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Write a failing factory test**

Create `tests/domain/factories.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeDataset, makeRow } from '../../src/domain/factories';

describe('domain factories', () => {
  it('creates deterministic row IDs from source and source row number', () => {
    const row = makeRow('orders.csv', 2, { order_id: 'A-1', amount: 10 });
    expect(row).toEqual({
      rowId: 'orders.csv:2',
      sourceId: 'orders.csv',
      sourceRowNumber: 2,
      values: { order_id: 'A-1', amount: 10 },
    });
  });

  it('preserves declared column and source order', () => {
    const row = makeRow('orders.csv', 2, { order_id: 'A-1' });
    expect(makeDataset(['order_id'], [row], ['orders.csv'])).toEqual({
      columns: ['order_id'], rows: [row], sourceIds: ['orders.csv'],
    });
  });
});
```

- [ ] **Step 4: Run the focused test and observe the expected failure**

Run: `npm run test:unit -- tests/domain/factories.test.ts`

Expected: FAIL because `src/domain/factories.ts` does not exist.

- [ ] **Step 5: Implement strict domain contracts and factories**

Create `src/domain/factories.ts`:

```ts
import type { CellValue, DataRow, Dataset } from './types';

export function makeRow(
  sourceId: string,
  sourceRowNumber: number,
  values: Record<string, CellValue>,
): DataRow {
  return {
    rowId: `${sourceId}:${sourceRowNumber}`,
    sourceId,
    sourceRowNumber,
    values: { ...values },
  };
}

export function makeDataset(
  columns: string[],
  rows: DataRow[],
  sourceIds: string[],
): Dataset {
  return { columns: [...columns], rows: [...rows], sourceIds: [...sourceIds] };
}
```

Create `src/domain/errors.ts`:

```ts
export type DataFixerErrorCode =
  | 'EMPTY_FILE'
  | 'UNSUPPORTED_FILE'
  | 'FILE_TOO_LARGE'
  | 'JOB_TOO_LARGE'
  | 'TOO_MANY_FILES'
  | 'DUPLICATE_SOURCE_NAME'
  | 'MISSING_COLUMN'
  | 'INVALID_RULE'
  | 'PARSE_FAILED'
  | 'EXPORT_FAILED'
  | 'RECONCILIATION_FAILED';

export class DataFixerError extends Error {
  constructor(
    public readonly code: DataFixerErrorCode,
    public readonly details: Record<string, string | number> = {},
  ) {
    super(code);
    this.name = 'DataFixerError';
  }
}
```

Create `src/domain/types.ts` with the Stable Domain Interfaces above and the rule union defined in Task 3.

- [ ] **Step 6: Run foundation checks**

Run:

```bash
npm run test:unit -- tests/domain/factories.test.ts
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 7: Commit the foundation**

```bash
git add datafixer
git commit -m "build: scaffold DataFixer web application"
```

---

### Task 2: File Limits, CSV/XLSX Reading, and Schema Inspection

**Files:**
- Create: `datafixer/src/file-io/limits.ts`
- Create: `datafixer/src/file-io/workbook-reader.ts`
- Create: `datafixer/src/file-io/normalize-sheet.ts`
- Create: `datafixer/tests/file-io/limits.test.ts`
- Create: `datafixer/tests/file-io/workbook-reader.test.ts`
- Create: `datafixer/tests/fixtures/build-fixtures.ts`

**Interfaces:**
- Consumes: `Dataset`, `DataRow`, `DataFixerError`, `makeRow()`, `makeDataset()`.
- Produces: `assertJobLimits(files: File[]): void`, `inspectWorkbook(file: File): Promise<WorkbookInspection>`, and `readWorksheet(file: File, sheetName: string): Promise<Dataset>`.

- [ ] **Step 1: Write failing byte-limit and file-count tests**

Create `tests/file-io/limits.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { assertJobLimits } from '../../src/file-io/limits';

const file = (name: string, bytes: number) =>
  new File([new Uint8Array(bytes)], name);

describe('assertJobLimits', () => {
  it('rejects a file larger than 20 MiB', () => {
    expect(() => assertJobLimits([file('large.csv', 20 * 1024 * 1024 + 1)]))
      .toThrowError('FILE_TOO_LARGE');
  });

  it('rejects a job larger than 50 MiB', () => {
    expect(() => assertJobLimits([
      file('a.csv', 20 * 1024 * 1024),
      file('b.csv', 20 * 1024 * 1024),
      file('c.csv', 10 * 1024 * 1024 + 1),
    ])).toThrowError('JOB_TOO_LARGE');
  });

  it('rejects eleven files', () => {
    expect(() => assertJobLimits(Array.from({ length: 11 }, (_, index) => file(`${index}.csv`, 1))))
      .toThrowError('TOO_MANY_FILES');
  });

  it('rejects duplicate source names because row IDs and mappings use file names', () => {
    expect(() => assertJobLimits([file('orders.csv', 1), file('orders.csv', 1)]))
      .toThrowError('DUPLICATE_SOURCE_NAME');
  });
});
```

- [ ] **Step 2: Run the limit tests and observe failure**

Run: `npm run test:unit -- tests/file-io/limits.test.ts`

Expected: FAIL because `assertJobLimits` is missing.

- [ ] **Step 3: Implement exact limits**

Create `src/file-io/limits.ts`:

```ts
import { DataFixerError } from '../domain/errors';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_JOB_BYTES = 50 * 1024 * 1024;
export const MAX_JOB_FILES = 10;

export function assertJobLimits(files: File[]): void {
  if (files.length > MAX_JOB_FILES) throw new DataFixerError('TOO_MANY_FILES', { count: files.length });
  const duplicate = files.find((file, index) => files.findIndex((candidate) => candidate.name === file.name) !== index);
  if (duplicate) throw new DataFixerError('DUPLICATE_SOURCE_NAME', { file: duplicate.name });
  const oversized = files.find((file) => file.size > MAX_FILE_BYTES);
  if (oversized) throw new DataFixerError('FILE_TOO_LARGE', { file: oversized.name, bytes: oversized.size });
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_JOB_BYTES) throw new DataFixerError('JOB_TOO_LARGE', { bytes: total });
}
```

- [ ] **Step 4: Write failing CSV/XLSX inspection tests**

Create `tests/file-io/workbook-reader.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { inspectWorkbook, readWorksheet } from '../../src/file-io/workbook-reader';

describe('workbook reader', () => {
  it('reads quoted CSV values and treats row two as source row two', async () => {
    const input = new File(['name,note\nAlice,"hello, world"\n'], 'people.csv', { type: 'text/csv' });
    const inspection = await inspectWorkbook(input);
    expect(inspection.sheets).toEqual([{ name: 'Sheet1', rows: 1, columns: ['name', 'note'] }]);
    const dataset = await readWorksheet(input, 'Sheet1');
    expect(dataset.rows[0]).toMatchObject({
      rowId: 'people.csv:2',
      sourceRowNumber: 2,
      values: { name: 'Alice', note: 'hello, world' },
    });
  });

  it('lists XLSX sheets before reading the selected sheet', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['id'], [1]]), 'Orders');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['id'], [2]]), 'Returns');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const input = new File([bytes], 'book.xlsx');
    const inspection = await inspectWorkbook(input);
    expect(inspection.sheets.map((sheet) => sheet.name)).toEqual(['Orders', 'Returns']);
  });
});
```

- [ ] **Step 5: Run parser tests and observe failure**

Run: `npm run test:unit -- tests/file-io/workbook-reader.test.ts`

Expected: FAIL because the reader module is missing.

- [ ] **Step 6: Implement dense, local-only workbook parsing**

Create `src/file-io/workbook-reader.ts` using these exact public contracts:

```ts
import * as XLSX from 'xlsx';
import { DataFixerError } from '../domain/errors';
import type { Dataset } from '../domain/types';
import { normalizeSheet } from './normalize-sheet';

export interface SheetInspection { name: string; rows: number; columns: string[] }
export interface WorkbookInspection { fileName: string; sheets: SheetInspection[] }

async function parse(file: File): Promise<XLSX.WorkBook> {
  if (!/\.(csv|xlsx)$/i.test(file.name)) throw new DataFixerError('UNSUPPORTED_FILE', { file: file.name });
  if (file.size === 0) throw new DataFixerError('EMPTY_FILE', { file: file.name });
  try {
    const bytes = await file.arrayBuffer();
    if (/\.csv$/i.test(file.name)) {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
      return XLSX.read(text, { type: 'string', dense: true, raw: true, cellDates: false });
    }
    return XLSX.read(bytes, { type: 'array', dense: true, raw: true, cellDates: false });
  } catch {
    throw new DataFixerError('PARSE_FAILED', { file: file.name });
  }
}

export async function inspectWorkbook(file: File): Promise<WorkbookInspection> {
  const workbook = await parse(file);
  return {
    fileName: file.name,
    sheets: workbook.SheetNames.map((name) => {
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
        header: 1, raw: true, defval: null, blankrows: false,
      });
      return { name, rows: Math.max(0, matrix.length - 1), columns: (matrix[0] ?? []).map(String) };
    }),
  };
}

export async function readWorksheet(file: File, sheetName: string): Promise<Dataset> {
  const workbook = await parse(file);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new DataFixerError('PARSE_FAILED', { file: file.name, sheet: sheetName });
  return normalizeSheet(file.name, XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1, raw: true, defval: null, blankrows: false,
  }));
}
```

Implement `normalizeSheet()` so duplicate or blank headers throw `PARSE_FAILED`, supported cell types map to `CellValue`, and source row numbers begin at 2. Add parser cases for UTF-8 BOM acceptance, malformed UTF-8 rejection, blank headers, duplicate headers, an unknown sheet name, and a corrupt XLSX archive.

- [ ] **Step 7: Run file-reading checks**

Run:

```bash
npm run test:unit -- tests/file-io
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 8: Commit file ingestion**

```bash
git add datafixer/src/file-io datafixer/tests/file-io datafixer/tests/fixtures
git commit -m "feat: add local CSV and XLSX ingestion"
```

---

### Task 3: Clean Rules and Ordered Rule Engine

**Files:**
- Modify: `datafixer/src/domain/types.ts`
- Create: `datafixer/src/rules/clean.ts`
- Create: `datafixer/src/rules/engine.ts`
- Create: `datafixer/tests/rules/clean.test.ts`
- Create: `datafixer/tests/rules/engine.test.ts`

**Interfaces:**
- Consumes: `Dataset`, `DataRow`, `EvidenceEntry`, `DataFixerError`.
- Produces: `CleanRule`, `RuleSpec`, `applyCleanRule(row, rule): RuleOutcome`, and `applyRules(dataset, rules): EngineResult`.

- [ ] **Step 1: Define the discriminated Clean rule union**

Add to `src/domain/types.ts`:

```ts
export type CleanRule =
  | { id: string; kind: 'trim'; column: string }
  | { id: string; kind: 'collapseSpaces'; column: string }
  | { id: string; kind: 'normalizeEmpty'; column: string; emptyValues: string[] }
  | { id: string; kind: 'changeCase'; column: string; mode: 'upper' | 'lower' | 'title' }
  | { id: string; kind: 'parseDate'; column: string; output: 'YYYY-MM-DD' }
  | { id: string; kind: 'parseNumber'; column: string; removeThousandsSeparator: boolean }
  | { id: string; kind: 'replace'; column: string; search: string; replacement: string }
  | { id: string; kind: 'renameColumn'; from: string; to: string }
  | { id: string; kind: 'keepColumns'; columns: string[] }
  | { id: string; kind: 'dedupe'; columns: string[] };

export type RuleSpec = CleanRule;

export interface RuleOutcome {
  row: DataRow;
  evidence: EvidenceEntry[];
  remove: boolean;
  reject: boolean;
}

export interface EngineResult {
  dataset: Dataset;
  removedRows: DataRow[];
  rejectedRows: DataRow[];
  evidence: EvidenceEntry[];
}
```

- [ ] **Step 2: Write failing clean-rule tests**

Create `tests/rules/clean.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeRow } from '../../src/domain/factories';
import { applyCleanRule } from '../../src/rules/clean';

describe('applyCleanRule', () => {
  it('trims a string and records before, after, and reason', () => {
    const row = makeRow('people.csv', 2, { name: '  Alice  ' });
    const result = applyCleanRule(row, { id: 'trim-name', kind: 'trim', column: 'name' });
    expect(result.row.values.name).toBe('Alice');
    expect(result.evidence).toEqual([expect.objectContaining({
      rowId: 'people.csv:2', ruleId: 'trim-name', status: 'CHANGED',
      column: 'name', before: '  Alice  ', after: 'Alice', reasonKey: 'clean.trimmed',
    })]);
  });

  it('does not emit evidence when a trim changes nothing', () => {
    const row = makeRow('people.csv', 2, { name: 'Alice' });
    expect(applyCleanRule(row, { id: 'trim-name', kind: 'trim', column: 'name' }).evidence).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the focused test and observe failure**

Run: `npm run test:unit -- tests/rules/clean.test.ts`

Expected: FAIL because `applyCleanRule` is missing.

- [ ] **Step 4: Implement each Clean rule as a pure function**

Use this dispatch shape in `src/rules/clean.ts`:

```ts
export function applyCleanRule(row: DataRow, rule: CleanRule): RuleOutcome {
  switch (rule.kind) {
    case 'trim': return transformString(row, rule, (value) => value.trim(), 'clean.trimmed');
    case 'collapseSpaces': return transformString(row, rule, (value) => value.replace(/\s+/g, ' '), 'clean.spacesCollapsed');
    case 'normalizeEmpty': return normalizeEmpty(row, rule);
    case 'changeCase': return changeCase(row, rule);
    case 'parseDate': return parseDateValue(row, rule);
    case 'parseNumber': return parseNumberValue(row, rule);
    case 'replace': return replaceValue(row, rule);
    case 'renameColumn': return renameColumn(row, rule);
    case 'keepColumns': return keepColumns(row, rule);
    case 'dedupe': return unchangedOutcome(row);
  }
}
```

For invalid values in `parseDate` and `parseNumber`, return `reject: true` with `reasonKey` `clean.invalidDate` or `clean.invalidNumber`; never coerce a partially parsed value.

- [ ] **Step 5: Write failing order and deduplication tests**

Create `tests/rules/engine.test.ts` asserting that trim runs before case conversion, the first duplicate survives, later duplicates become `REMOVED`, and the original dataset object is unchanged.

```ts
it('runs rules in declared order without mutating input', () => {
  const input = makeDataset(['email'], [makeRow('a.csv', 2, { email: ' A@EXAMPLE.COM ' })], ['a.csv']);
  const result = applyRules(input, [
    { id: 'trim', kind: 'trim', column: 'email' },
    { id: 'lower', kind: 'changeCase', column: 'email', mode: 'lower' },
  ]);
  expect(result.dataset.rows[0].values.email).toBe('a@example.com');
  expect(input.rows[0].values.email).toBe(' A@EXAMPLE.COM ');
});
```

- [ ] **Step 6: Implement ordered engine and deterministic deduplication**

Implement `applyRules()` with immutable row copies, stable input order, a `Set` key joined from canonical JSON values, and evidence ordered by input row then rule order. Missing rule columns throw `MISSING_COLUMN` before any row is processed.

- [ ] **Step 7: Run Clean engine checks**

Run:

```bash
npm run test:unit -- tests/rules/clean.test.ts tests/rules/engine.test.ts
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 8: Commit Clean processing**

```bash
git add datafixer/src/domain/types.ts datafixer/src/rules datafixer/tests/rules
git commit -m "feat: implement deterministic clean rules"
```

---

### Task 4: Merge and Validate Engines

**Files:**
- Modify: `datafixer/src/domain/types.ts`
- Create: `datafixer/src/rules/merge.ts`
- Create: `datafixer/src/rules/validate.ts`
- Create: `datafixer/tests/rules/merge.test.ts`
- Create: `datafixer/tests/rules/validate.test.ts`

**Interfaces:**
- Consumes: `Dataset`, `DataRow`, `EvidenceEntry`, `makeDataset()`.
- Produces: `MergeSettings`, `ValidationRule`, `mergeDatasets(inputs, settings): EngineResult`, and `validateDataset(dataset, rules): EngineResult`.

- [ ] **Step 1: Add exact merge and validation contracts**

Add to `src/domain/types.ts`:

```ts
export interface MergeSettings {
  columnMapBySource: Record<string, Record<string, string>>;
  outputColumns: string[];
  sourceColumn?: string;
  dedupeColumns: string[];
}

export type ValidationRule =
  | { id: string; kind: 'required'; column: string }
  | { id: string; kind: 'type'; column: string; expected: 'string' | 'integer' | 'number' | 'date' }
  | { id: string; kind: 'unique'; columns: string[] }
  | { id: string; kind: 'allowed'; column: string; values: CellValue[] }
  | { id: string; kind: 'numberRange'; column: string; min?: number; max?: number }
  | { id: string; kind: 'length'; column: string; min?: number; max?: number }
  | { id: string; kind: 'regex'; column: string; pattern: string }
  | { id: string; kind: 'columnCompare'; left: string; operator: 'eq' | 'lt' | 'lte' | 'gt' | 'gte'; right: string };

// Replace the temporary `export type RuleSpec = CleanRule` alias from Task 3.
export type RuleSpec = CleanRule | ValidationRule;
```

- [ ] **Step 2: Write failing merge tests**

Create tests proving that source-specific mappings produce the declared output column order, missing target values become `null`, the optional source column is populated, source order is stable, and type conflicts reject affected rows instead of coercing them.

```ts
it('maps two source schemas into one stable output', () => {
  const result = mergeDatasets([north, south], {
    columnMapBySource: {
      'north.csv': { order_id: 'id', total: 'amount' },
      'south.csv': { id: 'id', amount_krw: 'amount' },
    },
    outputColumns: ['id', 'amount', 'source'],
    sourceColumn: 'source',
    dedupeColumns: ['id'],
  });
  expect(result.dataset.columns).toEqual(['id', 'amount', 'source']);
  expect(result.dataset.rows.map((row) => row.values.source)).toEqual(['north.csv', 'south.csv']);
});
```

- [ ] **Step 3: Run merge tests and observe failure**

Run: `npm run test:unit -- tests/rules/merge.test.ts`

Expected: FAIL because `mergeDatasets` is missing.

- [ ] **Step 4: Implement deterministic merge**

Implement a two-pass merge: validate every mapping and inferred target type first, then construct output rows. If a value conflicts with the established target type, put the original row in `rejectedRows` with `reasonKey: 'merge.typeConflict'` and preserve all original values in the rejected dataset.

- [ ] **Step 5: Write failing validation tests**

Create one test per validation kind. Include these decisive cases:

```ts
it('rejects a row once while retaining every failed rule reason', () => {
  const result = validateDataset(input, [
    { id: 'required-email', kind: 'required', column: 'email' },
    { id: 'email-shape', kind: 'regex', column: 'email', pattern: '^[^@]+@[^@]+$' },
  ]);
  expect(result.rejectedRows).toHaveLength(1);
  expect(result.evidence.map((entry) => entry.ruleId)).toEqual(['required-email', 'email-shape']);
  expect(result.evidence.every((entry) => entry.status === 'REJECTED')).toBe(true);
});
```

Also assert that an invalid regex throws `INVALID_RULE` before processing starts.

- [ ] **Step 6: Implement validation with complete row reasons**

Compile regular expressions and validate referenced columns before the row loop. Evaluate all rules for each row, retain all failure evidence, place a failing row in `rejectedRows` exactly once, and preserve passing row order.

- [ ] **Step 7: Run merge and validation checks**

Run:

```bash
npm run test:unit -- tests/rules/merge.test.ts tests/rules/validate.test.ts
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 8: Commit Merge and Validate**

```bash
git add datafixer/src/domain/types.ts datafixer/src/rules/merge.ts datafixer/src/rules/validate.ts datafixer/tests/rules
git commit -m "feat: add merge and validation engines"
```

---

### Task 5: Evidence Ledger, Reconciliation, and Deterministic Hashes

**Files:**
- Create: `datafixer/src/evidence/ledger.ts`
- Create: `datafixer/src/evidence/reconcile.ts`
- Create: `datafixer/src/evidence/hash.ts`
- Create: `datafixer/tests/evidence/ledger.test.ts`
- Create: `datafixer/tests/evidence/reconcile.test.ts`
- Create: `datafixer/tests/evidence/hash.test.ts`

**Interfaces:**
- Consumes: `Dataset`, `EngineResult`, `EvidenceEntry`, `ProcessingSummary`.
- Produces: `finalizeEvidence(input, engineResult): FinalizedEvidence`, `reconcile(inputRows, statuses): ProcessingSummary`, `sha256Bytes(bytes): Promise<string>`, and `sha256Canonical(value): Promise<string>`.

- [ ] **Step 1: Write the failing reconciliation test**

Create `tests/evidence/reconcile.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { reconcile } from '../../src/evidence/reconcile';

describe('reconcile', () => {
  it('accepts an exact partition of input rows', () => {
    expect(reconcile(10, { UNCHANGED: 3, CHANGED: 4, REMOVED: 2, REJECTED: 1 }))
      .toEqual({ inputRows: 10, unchangedRows: 3, changedRows: 4, removedRows: 2, rejectedRows: 1, reconciled: true });
  });

  it('marks a mismatched partition as unreconciled', () => {
    expect(reconcile(10, { UNCHANGED: 3, CHANGED: 4, REMOVED: 2, REJECTED: 0 }).reconciled).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test and observe failure**

Run: `npm run test:unit -- tests/evidence/reconcile.test.ts`

Expected: FAIL because `reconcile` is missing.

- [ ] **Step 3: Implement the invariant and final status precedence**

Implement precedence `REJECTED > REMOVED > CHANGED > UNCHANGED`. `finalizeEvidence()` must add one synthetic `UNCHANGED` evidence entry only to the in-memory status map, not to the downloadable evidence ledger. It must throw `RECONCILIATION_FAILED` when the invariant is false.

- [ ] **Step 4: Write failing ledger completeness tests**

Assert that every removed/rejected row has at least one evidence reason, multiple `CHANGED` entries still count as one changed row, and no row appears in both output and rejected datasets.

- [ ] **Step 5: Implement ledger completeness checks**

Build `Map<string, EvidenceEntry[]>` and `Map<string, RowStatus>` indexes. Return deterministic arrays ordered by input row and original rule order. Throw `RECONCILIATION_FAILED` with the first offending `rowId` when evidence is missing.

- [ ] **Step 6: Write failing deterministic SHA-256 tests**

Test that different object key insertion order produces the same canonical hash, different rule order produces a different hash, and the byte hash matches a known SHA-256 test vector.

- [ ] **Step 7: Run hash tests and observe failure**

Run: `npm run test:unit -- tests/evidence/hash.test.ts`

Expected: FAIL because `sha256Bytes` and `sha256Canonical` are missing.

- [ ] **Step 8: Implement deterministic SHA-256 functions**

Use Web Crypto:

```ts
export async function sha256Bytes(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
```

Implement `sha256Canonical()` using recursively sorted object keys and stable array order.

- [ ] **Step 9: Run evidence checks**

Run:

```bash
npm run test:unit -- tests/evidence
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 10: Commit evidence accounting**

```bash
git add datafixer/src/evidence datafixer/tests/evidence
git commit -m "feat: add auditable row evidence and reconciliation"
```

---

### Task 6: XLSX, HTML, and Settings Exports

**Files:**
- Create: `datafixer/src/export/xlsx-export.ts`
- Create: `datafixer/src/export/html-report.ts`
- Create: `datafixer/src/export/settings-export.ts`
- Create: `datafixer/src/export/download.ts`
- Create: `datafixer/tests/export/xlsx-export.test.ts`
- Create: `datafixer/tests/export/html-report.test.ts`
- Create: `datafixer/tests/export/settings-export.test.ts`

**Interfaces:**
- Consumes: `ProcessingResult`, `RuleSpec[]`, translation function `t(key, params)`.
- Produces: `buildResultWorkbook(result): Uint8Array`, `buildRejectedWorkbook(result): Uint8Array`, `buildHtmlReport(result, locale): string`, `serializeSettings(settings): string`, `parseSettings(json): RuleSpec[]`, and `downloadBytes(bytes, fileName, mimeType): void`.

- [ ] **Step 1: Write failing XLSX round-trip tests**

Create a reconciled `ProcessingResult`, call both workbook builders, read the bytes back through SheetJS, and assert exact sheet names, row counts, and column order. The normal result workbook contains `Result`, `Evidence`, and `Summary`; the separate error workbook contains `Rejected` and `Evidence` filtered to rejected rows.

```ts
it('exports separate result and rejected workbooks', () => {
  const output = XLSX.read(buildResultWorkbook(result), { type: 'array', dense: true });
  const rejected = XLSX.read(buildRejectedWorkbook(result), { type: 'array', dense: true });
  expect(output.SheetNames).toEqual(['Result', 'Evidence', 'Summary']);
  expect(rejected.SheetNames).toEqual(['Rejected', 'Evidence']);
});
```

- [ ] **Step 2: Run export tests and observe failure**

Run: `npm run test:unit -- tests/export/xlsx-export.test.ts`

Expected: FAIL because `buildResultWorkbook` is missing.

- [ ] **Step 3: Implement deterministic XLSX bytes**

Use explicit sheet order, explicit columns, inline strings, and no workbook creation timestamp. Export evidence columns in this order: `rowId`, `ruleId`, `status`, `column`, `before`, `after`, `reasonKey`, `reasonParams`. If there are no rejected rows, still create the rejected workbook with header-only `Rejected` and `Evidence` sheets so all four promised artifacts remain downloadable.

- [ ] **Step 4: Write failing HTML safety and bilingual tests**

Test Korean and English headings, summary counts, hashes, rule reasons, and HTML escaping for source values such as `<script>alert(1)</script>`. The script text must appear escaped and no `<script>` tag may exist in the report.

- [ ] **Step 5: Implement self-contained HTML report**

Generate one UTF-8 HTML string with inline CSS, no JavaScript, no external images, no external fonts, no external links, and escaped dynamic values. Include summary, applied rules, failure counts, source hash, settings hash, and reconciliation state.

- [ ] **Step 6: Write failing settings round-trip and rejection tests**

Test canonical key ordering, two-space indentation, a valid round trip, unknown kinds, duplicate IDs, missing columns, invalid regex patterns, and forbidden executable fields (`script`, `url`, `callback`).

- [ ] **Step 7: Run settings tests and observe failure**

Run: `npm run test:unit -- tests/export/settings-export.test.ts`

Expected: FAIL because the settings serializer and parser are missing.

- [ ] **Step 8: Implement canonical settings JSON and validation**

`serializeSettings()` must use two-space indentation and canonical key ordering. `parseSettings()` must reject unknown rule kinds, duplicate IDs, missing columns, invalid regex patterns, and extra executable fields such as `script`, `url`, or `callback` with `INVALID_RULE`.

- [ ] **Step 9: Implement safe main-thread downloads**

Create a Blob, call `URL.createObjectURL`, click a temporary anchor, remove it, and revoke the URL in a zero-delay timer. Sanitize filenames to `[A-Za-z0-9._-]`, prepend `datafixer-`, and never reuse the input filename unchanged.

- [ ] **Step 10: Run export checks**

Run:

```bash
npm run test:unit -- tests/export
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 11: Commit deterministic exports**

```bash
git add datafixer/src/export datafixer/tests/export
git commit -m "feat: export deterministic results and evidence reports"
```

---

### Task 7: Bilingual Five-Step UI and Explicit Workflow State

**Files:**
- Create: `datafixer/src/i18n/ko.ts`
- Create: `datafixer/src/i18n/en.ts`
- Create: `datafixer/src/i18n/index.ts`
- Create: `datafixer/src/app/app-reducer.ts`
- Create: `datafixer/src/app/App.tsx`
- Create: `datafixer/src/app/app.css`
- Modify: `datafixer/src/main.tsx`
- Delete: `datafixer/src/App.tsx`
- Delete: `datafixer/src/App.css`
- Create: `datafixer/src/ui/ModePicker.tsx`
- Create: `datafixer/src/ui/FilePicker.tsx`
- Create: `datafixer/src/ui/RuleEditor.tsx`
- Create: `datafixer/src/ui/DryRunPreview.tsx`
- Create: `datafixer/src/ui/ResultSummary.tsx`
- Create: `datafixer/src/ui/ErrorPanel.tsx`
- Test: `datafixer/tests/domain/app-reducer.test.ts`
- Test: `datafixer/tests/browser/app-flow.test.tsx`
- Test: `datafixer/tests/browser/i18n.test.tsx`

**Interfaces:**
- Consumes: file inspection, exact limits, rule contracts, processing result, export functions.
- Produces: `AppState`, `AppAction`, `appReducer()`, typed `t()`, and an accessible UI for `MODE → FILES → RULES → DRY_RUN → RESULT`.

- [ ] **Step 1: Define the reducer and illegal transition tests**

Use this state contract:

```ts
export type AppStep = 'MODE' | 'FILES' | 'RULES' | 'DRY_RUN' | 'RESULT';
export interface AppState {
  step: AppStep;
  locale: 'ko' | 'en';
  mode: 'clean' | 'merge' | 'validate' | null;
  files: File[];
  selectedSheets: Record<string, string>;
  rules: RuleSpec[];
  mergeSettings: MergeSettings | null;
  result: ProcessingResult | null;
  error: DataFixerError | null;
}
```

Test that the reducer cannot enter `RULES` without files and a selected sheet for each file, `DRY_RUN` without valid mode-specific rules or Merge settings, or `RESULT` without a reconciled result.

- [ ] **Step 2: Run reducer tests and observe failure**

Run: `npm run test:unit -- tests/domain/app-reducer.test.ts`

Expected: FAIL because `appReducer` is missing.

- [ ] **Step 3: Implement explicit reducer guards**

Every illegal transition must leave the previous step unchanged and set `INVALID_RULE` or the relevant file error. `RESET` is pure and returns state to `MODE`. The `App` layer owns a download URL registry; before dispatching `RESET` and during unmount cleanup, it calls `URL.revokeObjectURL()` for every registered URL.

- [ ] **Step 4: Write a failing bilingual dictionary contract test**

Create `tests/browser/i18n.test.tsx` and assert that Korean and English have identical keys and identical interpolation parameter names, including every error code and every `reasonKey` emitted by Tasks 3–5.

- [ ] **Step 5: Run the dictionary test and observe failure**

Run: `npm run test:browser -- tests/browser/i18n.test.tsx`

Expected: FAIL because the dictionaries do not exist.

- [ ] **Step 6: Create typed Korean and English dictionaries**

Define the Korean dictionary first and type the English dictionary as `Record<keyof typeof ko, string>`. Include all headings, buttons, privacy statements, error actions, status labels, and every `reasonKey` emitted by Tasks 3–5.

- [ ] **Step 7: Write failing browser flow tests**

In Vitest Browser Mode, render `App`, select Clean, upload a small CSV, add a trim rule, run the dry preview, process the file, and assert the reconciled summary and four download buttons.

```ts
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';

it('completes the Clean flow without navigation or upload', async () => {
  await render(<App />);
  await userEvent.click(page.getByRole('button', { name: 'Clean' }));
  await page.getByLabelText('Choose files').upload(cleanCsvFile);
  await userEvent.click(page.getByRole('button', { name: 'Add trim rule' }));
  await userEvent.click(page.getByRole('button', { name: 'Run preview' }));
  await userEvent.click(page.getByRole('button', { name: 'Process all rows' }));
  await expect.element(page.getByText('Reconciled')).toBeVisible();
  expect(page.getByRole('button', { name: /Download/ }).elements()).toHaveLength(4);
});
```

- [ ] **Step 8: Implement the five screens with accessibility constraints**

Use native buttons, labels, fieldsets, tables, and progress text. Status must be conveyed by text and icon as well as color. Keyboard focus moves to the new step heading after every transition. The first screen states that files stay on the device.

- [ ] **Step 9: Implement dry-run preview rules**

Process the first 200 data rows only, show before/after values, status, rule reason, and predicted counts. Clearly label counts as a sample. Full processing requires an explicit user click and never starts on file selection.

- [ ] **Step 10: Run UI checks**

Run:

```bash
npm run test:unit -- tests/domain/app-reducer.test.ts
npm run test:browser -- tests/browser
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 11: Commit the bilingual workflow**

```bash
git add datafixer/src/app datafixer/src/ui datafixer/src/i18n datafixer/tests/browser datafixer/tests/domain/app-reducer.test.ts
git commit -m "feat: add bilingual guided DataFixer workflow"
```

---

### Task 8: Web Worker Processing, Offline Continuity, and Network Privacy

**Files:**
- Create: `datafixer/src/worker/protocol.ts`
- Create: `datafixer/src/worker/data.worker.ts`
- Modify: `datafixer/src/app/App.tsx`
- Modify: `datafixer/vite.config.ts`
- Modify: `datafixer/index.html`
- Create: `datafixer/tests/browser/worker.test.ts`
- Create: `datafixer/tests/e2e/privacy.spec.ts`
- Create: `datafixer/tests/e2e/large-files.spec.ts`

**Interfaces:**
- Consumes: `File`, `RuleSpec[]`, file readers, engines, evidence finalizer, export builders.
- Produces: `WorkerRequest`, `WorkerResponse`, `runWorkerJob(request): Promise<WorkerSuccess>`, and a UI progress stream.

- [ ] **Step 1: Define the serializable worker protocol**

Create `src/worker/protocol.ts`:

```ts
export type WorkerRequest = {
  jobId: string;
  mode: 'clean' | 'merge' | 'validate';
  files: Array<{ name: string; bytes: ArrayBuffer; sheetName: string }>;
  rules: RuleSpec[];
  mergeSettings?: MergeSettings;
  locale: 'ko' | 'en';
};

export type WorkerResponse =
  | { jobId: string; type: 'progress'; phase: 'parse' | 'process' | 'export'; completed: number; total: number }
  | { jobId: string; type: 'success'; result: ProcessingResult; resultXlsx: Uint8Array; rejectedXlsx: Uint8Array; reportHtml: string; settingsJson: string }
  | { jobId: string; type: 'error'; code: DataFixerErrorCode; details: Record<string, string | number> };
```

- [ ] **Step 2: Write a failing worker success/error test**

Send a two-row CSV to the worker and assert ordered progress phases followed by a reconciled success. Send a malformed workbook and assert one structured `PARSE_FAILED` response without an uncaught worker exception.

- [ ] **Step 3: Implement worker orchestration and transferable buffers**

Parse and process inside the worker. Use `postMessage(response, [resultXlsx.buffer, rejectedXlsx.buffer])` for workbook bytes. Do not call `XLSX.writeFile` in the worker; return bytes and let the main thread create the download Blobs. The main thread exposes exactly four downloads: result XLSX, rejected XLSX, HTML report, and settings JSON.

- [ ] **Step 4: Add strict Content Security Policy**

Add this production policy to `index.html`:

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'">
```

Bundle SheetJS and all runtime dependencies locally. Do not use analytics, CDN scripts, remote fonts, error-reporting SDKs, or service-worker update telemetry. Record `Content-Security-Policy: frame-ancestors 'none'` as a required hosting response header because browsers do not enforce `frame-ancestors` from a meta policy.

- [ ] **Step 5: Write the network privacy E2E test**

Start request collection after the page reaches `networkidle`, upload a fixture, complete Clean processing, and assert zero requests whose method is not `GET` and zero requests outside the app origin.

```ts
test('processing never transmits customer data', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET' || new URL(request.url()).origin !== new URL(page.url()).origin) {
      requests.push(`${request.method()} ${request.url()}`);
    }
  });
  await completeCleanFlow(page, 'tests/fixtures/quoted.csv');
  expect(requests).toEqual([]);
});
```

- [ ] **Step 6: Add exact boundary tests**

Programmatically generate a file at exactly 20MiB and one at 20MiB plus one byte; assert accept/reject. Generate ten files totalling exactly 50MiB and a set totalling 50MiB plus one byte; assert accept/reject. Confirm the UI remains responsive by clicking the language toggle while a large valid job reports progress.

- [ ] **Step 7: Verify current-page offline continuity**

Load the production build, set the browser context offline, upload a local fixture, complete processing, and download all artifacts. This verifies the spec promise that an already opened job continues without network; V1 does not promise first launch while offline.

- [ ] **Step 8: Run worker, privacy, and boundary checks**

Run:

```bash
npm run test:browser -- tests/browser/worker.test.ts
npm run test:e2e -- tests/e2e/privacy.spec.ts tests/e2e/large-files.spec.ts
npm run lint
npm run build
```

Expected: all PASS with no external or write network request during processing.

- [ ] **Step 9: Commit local-only processing**

```bash
git add datafixer/src/worker datafixer/src/app/App.tsx datafixer/index.html datafixer/vite.config.ts datafixer/tests
git commit -m "feat: isolate processing in a privacy-preserving worker"
```

---

### Task 9: Guided Examples, Full Acceptance Suite, and Release Evidence

**Files:**
- Create: `datafixer/public/examples/clean-orders.csv`
- Create: `datafixer/public/examples/merge-north.csv`
- Create: `datafixer/public/examples/merge-south.csv`
- Create: `datafixer/public/examples/validate-contacts.csv`
- Create: `datafixer/tests/e2e/clean.spec.ts`
- Create: `datafixer/tests/e2e/merge.spec.ts`
- Create: `datafixer/tests/e2e/validate.spec.ts`
- Create: `datafixer/docs/user-guide-ko.md`
- Create: `datafixer/docs/user-guide-en.md`
- Create: `datafixer/docs/release-checklist.md`
- Modify: `datafixer/README.md`

**Interfaces:**
- Consumes: the complete application and all stable public contracts.
- Produces: release-ready static build, complete evidence bundle, bilingual user guides, and browser acceptance matrix.

- [ ] **Step 1: Add safe guided example files**

Use invented names, emails at `example.com`, and amounts with no real customer or LEENO data. Each example must contain at least one unchanged row, changed row, removed row, and rejected row where the selected mode supports that status.

- [ ] **Step 2: Write end-to-end Clean acceptance test**

Test upload, rule creation, dry-run sample label, full run, summary reconciliation, all four downloads, and XLSX round-trip contents. Expected final counts must be literal numbers derived from `clean-orders.csv`.

- [ ] **Step 3: Write end-to-end Merge acceptance test**

Test two files with different headers, explicit mapping, source column, duplicate removal, stable output order, rejected type conflict, and evidence download.

- [ ] **Step 4: Write end-to-end Validate acceptance test**

Test required, type, unique, allowed, range, length, regex, and column comparison rules. Assert each rejected row shows every applicable failure reason in the UI and report.

- [ ] **Step 5: Run the full automated quality gate**

Run:

```bash
npm ci
npm run lint
npm run test:unit
npm run test:browser
npm run test:e2e
npm run build
```

Expected: all commands exit 0 and `dist/` contains only static assets.

- [ ] **Step 6: Inspect production network and artifact contents**

Run the production preview, process each example, inspect browser network logs, open every generated XLSX and HTML report, and record hashes and screenshots in `docs/release-checklist.md`. Do not mark privacy PASS if any customer-derived value appears in a request URL, body, header, console telemetry, or remote error report.

- [ ] **Step 7: Perform supported-browser release gates**

Automate Chromium and Firefox with Playwright. Run the same smoke checklist in current Chrome and Edge. If current Edge is not available in the execution environment, record `BLOCKED: current Edge runtime unavailable` and do not claim V1 completion until the checklist runs on Edge. Record Safari as `NOT_SUPPORTED` with observed behavior only.

- [ ] **Step 8: Write bilingual user guides**

Each guide must cover privacy, supported files, exact limits, Clean/Merge/Validate walkthroughs, status meanings, all downloads, common errors, and the statement that source files are never overwritten. Screenshots must use invented example data.

- [ ] **Step 9: Final spec-to-build audit**

Create a table in `docs/release-checklist.md` mapping every section of `docs/superpowers/specs/2026-09-01-datafixer-v1-design.md` to a test, manual check, or explicit V1 exclusion. Every row must be `PASS`, `FAIL`, `BLOCKED`, or `NOT_SUPPORTED`; blank statuses are forbidden.

- [ ] **Step 10: Commit release evidence**

```bash
git add datafixer
git commit -m "test: verify DataFixer V1 release criteria"
```

---

## Implementation Completion Command

From `datafixer/`, run:

```bash
npm ci && npm run lint && npm run test:unit && npm run test:browser && npm run test:e2e && npm run build
```

The implementation is complete only when the command exits 0, the spec-to-build audit has no `FAIL` or blank status, current Chrome/Edge/Firefox checks are `PASS`, and the network privacy inspection records no customer-data transmission.

## Official Technical References

- Vite static production build: https://vite.dev/guide/build
- Vite static deployment: https://vite.dev/guide/static-deploy
- Vitest Browser Mode: https://vitest.dev/guide/browser/
- Playwright tests: https://playwright.dev/docs/test-intro
- SheetJS browser scripts and version 0.20.3: https://docs.sheetjs.com/docs/getting-started/installation/standalone/
- SheetJS local file constraints: https://docs.sheetjs.com/docs/demos/local/file/
- SheetJS Web Worker file-writing constraint: https://docs.sheetjs.com/docs/demos/bigdata/worker
