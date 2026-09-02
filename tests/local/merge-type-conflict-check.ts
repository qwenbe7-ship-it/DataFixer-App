import { makeDataset, makeRow } from '../../src/domain/factories';
import { mergeDatasets } from '../../src/rules/merge';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const a = makeDataset(['id', 'amount'], [makeRow('a.csv', 2, { id: 'A', amount: 100 })], ['a.csv']);
const b = makeDataset(['id', 'amount'], [makeRow('b.csv', 2, { id: 'B', amount: '200' })], ['b.csv']);
const result = mergeDatasets([a, b], {
  columnMapBySource: {
    'a.csv': { id: 'id', amount: 'amount' },
    'b.csv': { id: 'id', amount: 'amount' },
  },
  outputColumns: ['id', 'amount'],
  dedupeColumns: [],
});
assert(result.dataset.rows.length === 1, 'type-conflicting row must not enter output');
assert(result.rejectedRows.length === 1, 'type-conflicting row must be rejected once');
assert(result.rejectedRows[0]?.values.amount === '200', 'rejected row must preserve original values');
const evidence = result.evidence.find((entry) => entry.rowId === 'b.csv:2');
assert(evidence?.status === 'REJECTED', 'type conflict evidence status');
assert(evidence?.reasonKey === 'merge.typeConflict', 'type conflict reason');
assert(evidence?.column === 'amount', 'type conflict column');
console.log('PASS merge-type-conflict-check');
