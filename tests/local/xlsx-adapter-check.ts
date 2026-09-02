import { makeDataset, makeRow } from '../../src/domain/factories';
import type { ProcessingResult } from '../../src/domain/types';
import { buildRejectedWorkbook, buildResultWorkbook } from '../../src/export/xlsx-export';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const result: ProcessingResult = {
  output: makeDataset(['id'], [makeRow('a.csv', 2, { id: 'A' })], ['a.csv']),
  rejected: makeDataset(['id'], [makeRow('a.csv', 3, { id: 'B' })], ['a.csv']),
  evidence: [{ rowId: 'a.csv:3', ruleId: 'required', status: 'REJECTED', column: 'id', before: null, reasonKey: 'validate.required', reasonParams: {} }],
  summary: { inputRows: 2, unchangedRows: 1, changedRows: 0, removedRows: 0, rejectedRows: 1, reconciled: true },
  sourceHash: 'source',
  settingsHash: 'settings',
};

const normal = JSON.parse(new TextDecoder().decode(buildResultWorkbook(result)));
assert(normal.sheetNames.join(',') === 'Result,Evidence,Summary', 'result workbook order');
assert(normal.options.type === 'array' && normal.options.bookType === 'xlsx', 'xlsx array write options');
assert(!('CreatedDate' in normal.props), 'no creation timestamp');
assert(normal.sheets.Result[0][0] === 'id', 'result rows reach SheetJS adapter');

const rejected = JSON.parse(new TextDecoder().decode(buildRejectedWorkbook(result)));
assert(rejected.sheetNames.join(',') === 'Rejected,Evidence', 'rejected workbook order');
assert(rejected.sheets.Rejected[1][0] === 'B', 'rejected data reaches adapter');

let blocked = false;
try { buildResultWorkbook({ ...result, summary: { ...result.summary, reconciled: false } }); }
catch (error) { blocked = error instanceof Error && error.message === 'EXPORT_FAILED'; }
assert(blocked, 'unreconciled result cannot be exported');

console.log('PASS xlsx-adapter-check');
