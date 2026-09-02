import { makeDataset, makeRow } from '../../src/domain/factories';
import type { ProcessingResult } from '../../src/domain/types';
import { buildRejectedWorkbookModel, buildResultWorkbookModel } from '../../src/export/workbook-model';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const outputRows = [
  makeRow('orders.csv', 2, { id: 'A-1', amount: 100 }),
  makeRow('orders.csv', 3, { id: 'A-2', amount: 200 }),
];
const rejectedRows = [makeRow('orders.csv', 4, { id: 'A-3', amount: 'bad' })];
const result: ProcessingResult = {
  output: makeDataset(['id', 'amount'], outputRows, ['orders.csv']),
  rejected: makeDataset(['id', 'amount'], rejectedRows, ['orders.csv']),
  evidence: [
    { rowId: 'orders.csv:4', ruleId: 'trim-id-rejected', status: 'CHANGED', column: 'id', before: ' A-3 ', after: 'A-3', reasonKey: 'clean.trimmed', reasonParams: {} },
    { rowId: 'orders.csv:3', ruleId: 'trim-id', status: 'CHANGED', column: 'id', before: ' A-2 ', after: 'A-2', reasonKey: 'clean.trimmed', reasonParams: {} },
    { rowId: 'orders.csv:4', ruleId: 'amount-number', status: 'REJECTED', column: 'amount', before: 'bad', reasonKey: 'validate.type', reasonParams: { expected: 'number' } },
  ],
  summary: { inputRows: 3, unchangedRows: 1, changedRows: 1, removedRows: 0, rejectedRows: 1, reconciled: true },
  sourceHash: 'source-hash',
  settingsHash: 'settings-hash',
};

const normal = buildResultWorkbookModel(result);
assert(normal.sheets.map((s) => s.name).join(',') === 'Result,Evidence,Summary', 'result sheet order');
assert(JSON.stringify(normal.sheets[0].rows[0]) === JSON.stringify(['id', 'amount']), 'result header order');
assert(JSON.stringify(normal.sheets[0].rows[1]) === JSON.stringify(['A-1', 100]), 'result first row');
assert(normal.sheets[1].rows[0].join(',') === 'rowId,ruleId,status,column,before,after,reasonKey,reasonParams', 'evidence header order');
assert(normal.sheets[2].rows.some((row) => row[0] === 'sourceHash' && row[1] === 'source-hash'), 'summary source hash');
assert(normal.sheets[2].rows.some((row) => row[0] === 'reconciled' && row[1] === true), 'reconciled exported as boolean');

const rejected = buildRejectedWorkbookModel(result);
assert(rejected.sheets.map((s) => s.name).join(',') === 'Rejected,Evidence', 'rejected sheet order');
assert(rejected.sheets[0].rows.length === 2, 'rejected includes header and row');
assert(rejected.sheets[1].rows.length === 3, 'all evidence for rejected rows retained');
assert(rejected.sheets[1].rows.slice(1).every((row) => row[0] === 'orders.csv:4'), 'rejected evidence filtered by rejected row id');

const emptyRejected = buildRejectedWorkbookModel({ ...result, rejected: makeDataset(['id', 'amount'], [], ['orders.csv']), evidence: result.evidence.filter((entry) => entry.rowId !== 'orders.csv:4'), summary: { ...result.summary, rejectedRows: 0, inputRows: 2 } });
assert(emptyRejected.sheets[0].rows.length === 1, 'empty rejected still has header');
assert(emptyRejected.sheets[1].rows.length === 1, 'empty rejected evidence still has header');

console.log('PASS export-model-check');
