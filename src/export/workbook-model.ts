import type { CellValue, EvidenceEntry, ProcessingResult } from '../domain/types';

export type WorkbookCell = CellValue | string;

export interface WorkbookSheetModel {
  name: string;
  rows: WorkbookCell[][];
}

export interface WorkbookModel {
  sheets: WorkbookSheetModel[];
}

const EVIDENCE_COLUMNS = [
  'rowId',
  'ruleId',
  'status',
  'column',
  'before',
  'after',
  'reasonKey',
  'reasonParams',
] as const;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`;
}

function datasetRows(columns: string[], rows: ProcessingResult['output']['rows']): WorkbookCell[][] {
  return [
    [...columns],
    ...rows.map((row) => columns.map((column) => row.values[column] ?? null)),
  ];
}

function evidenceRows(evidence: EvidenceEntry[]): WorkbookCell[][] {
  return [
    [...EVIDENCE_COLUMNS],
    ...evidence.map((entry) => [
      entry.rowId,
      entry.ruleId,
      entry.status,
      entry.column ?? null,
      entry.before ?? null,
      entry.after ?? null,
      entry.reasonKey,
      canonicalJson(entry.reasonParams),
    ]),
  ];
}

function summaryRows(result: ProcessingResult): WorkbookCell[][] {
  const { summary } = result;
  return [
    ['metric', 'value'],
    ['inputRows', summary.inputRows],
    ['unchangedRows', summary.unchangedRows],
    ['changedRows', summary.changedRows],
    ['removedRows', summary.removedRows],
    ['rejectedRows', summary.rejectedRows],
    ['reconciled', summary.reconciled],
    ['sourceHash', result.sourceHash],
    ['settingsHash', result.settingsHash],
  ];
}

export function buildResultWorkbookModel(result: ProcessingResult): WorkbookModel {
  return {
    sheets: [
      { name: 'Result', rows: datasetRows(result.output.columns, result.output.rows) },
      { name: 'Evidence', rows: evidenceRows(result.evidence) },
      { name: 'Summary', rows: summaryRows(result) },
    ],
  };
}

export function buildRejectedWorkbookModel(result: ProcessingResult): WorkbookModel {
  const rejectedIds = new Set(result.rejected.rows.map((row) => row.rowId));
  return {
    sheets: [
      { name: 'Rejected', rows: datasetRows(result.rejected.columns, result.rejected.rows) },
      { name: 'Evidence', rows: evidenceRows(result.evidence.filter((entry) => rejectedIds.has(entry.rowId))) },
    ],
  };
}
