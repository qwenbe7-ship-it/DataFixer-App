import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { makeDataset, makeRow } from '../../src/domain/factories';
import type { ProcessingResult } from '../../src/domain/types';
import { buildRejectedWorkbook, buildResultWorkbook } from '../../src/export/xlsx-export';

function fixture(): ProcessingResult {
  return {
    output: makeDataset(['id','amount'], [makeRow('orders.csv', 2, { id: 'A', amount: 100 })], ['orders.csv']),
    rejected: makeDataset(['id','amount'], [makeRow('orders.csv', 3, { id: 'B', amount: 'bad' })], ['orders.csv']),
    evidence: [
      { rowId: 'orders.csv:3', ruleId: 'trim-id', status: 'CHANGED', column: 'id', before: ' B ', after: 'B', reasonKey: 'clean.trimmed', reasonParams: {} },
      { rowId: 'orders.csv:3', ruleId: 'amount-type', status: 'REJECTED', column: 'amount', before: 'bad', reasonKey: 'validate.type', reasonParams: { expected: 'number' } },
    ],
    summary: { inputRows: 2, unchangedRows: 1, changedRows: 0, removedRows: 0, rejectedRows: 1, reconciled: true },
    sourceHash: 'source',
    settingsHash: 'settings',
  };
}

describe('xlsx export', () => {
  it('exports stable result and rejected sheet structures', () => {
    const result = fixture();
    const normal = XLSX.read(buildResultWorkbook(result), { type: 'array', dense: true, raw: true });
    const rejected = XLSX.read(buildRejectedWorkbook(result), { type: 'array', dense: true, raw: true });
    expect(normal.SheetNames).toEqual(['Result','Evidence','Summary']);
    expect(rejected.SheetNames).toEqual(['Rejected','Evidence']);
    expect(XLSX.utils.sheet_to_json(normal.Sheets.Result, { header: 1, raw: true })).toEqual([
      ['id','amount'], ['A',100],
    ]);
    const rejectedEvidence = XLSX.utils.sheet_to_json(rejected.Sheets.Evidence, { header: 1, raw: true }) as unknown[][];
    expect(rejectedEvidence).toHaveLength(3);
  });

  it('keeps header-only rejected sheets when there are no rejected rows', () => {
    const result = fixture();
    result.rejected = makeDataset(['id','amount'], [], ['orders.csv']);
    result.evidence = [];
    result.summary = { ...result.summary, inputRows: 1, rejectedRows: 0 };
    const rejected = XLSX.read(buildRejectedWorkbook(result), { type: 'array', dense: true, raw: true });
    expect(XLSX.utils.sheet_to_json(rejected.Sheets.Rejected, { header: 1, raw: true })).toEqual([['id','amount']]);
    expect(XLSX.utils.sheet_to_json(rejected.Sheets.Evidence, { header: 1, raw: true })).toEqual([
      ['rowId','ruleId','status','column','before','after','reasonKey','reasonParams'],
    ]);
  });

  it('refuses unreconciled results', () => {
    const result = fixture();
    result.summary.reconciled = false;
    expect(() => buildResultWorkbook(result)).toThrowError('EXPORT_FAILED');
  });
});
