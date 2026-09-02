import { makeDataset, makeRow } from '../../src/domain/factories';
import { mergeDatasets } from '../../src/rules/merge';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const first = makeDataset(
  ['id', 'amount', 'note'],
  [
    makeRow('first.csv', 2, { id: 'A', amount: 10, note: 'ok' }),
    makeRow('first.csv', 3, { id: 'B', amount: null, note: 'missing' }),
  ],
  ['first.csv'],
);
const second = makeDataset(
  ['order_id', 'total'],
  [
    makeRow('second.csv', 2, { order_id: 'C', total: 30 }),
    makeRow('second.csv', 3, { order_id: 99, total: 'bad' }),
  ],
  ['second.csv'],
);
const firstSnapshot = JSON.stringify(first);
const secondSnapshot = JSON.stringify(second);
const result = mergeDatasets([first, second], {
  columnMapBySource: {
    'first.csv': { id: 'id', amount: 'amount', note: 'note' },
    'second.csv': { order_id: 'id', total: 'amount' },
  },
  outputColumns: ['id', 'amount', 'note', 'source'],
  sourceColumn: 'source',
  dedupeColumns: [],
});

assert(result.dataset.rows.length === 3, 'three non-conflicting rows remain');
assert(result.dataset.rows[0]?.rowId === 'first.csv:2', 'first source first row');
assert(result.dataset.rows[2]?.rowId === 'second.csv:2', 'second source follows first source');
assert(result.dataset.rows[2]?.values.note === null, 'unmapped target must be null');
assert(result.dataset.rows[2]?.values.source === 'second.csv', 'source column populated');
const mappedEvidence = result.evidence.filter((entry) => entry.rowId === 'first.csv:2' && entry.status === 'CHANGED');
assert(mappedEvidence.some((entry) => entry.reasonKey === 'merge.mapped'), 'mapped output row records change evidence');
assert(result.rejectedRows.length === 1, 'conflicting row rejected once');
assert(result.rejectedRows[0]?.values.order_id === 99, 'rejected row preserves original id');
assert(result.rejectedRows[0]?.values.total === 'bad', 'rejected row preserves original total');
const conflictEvidence = result.evidence.filter((entry) => entry.rowId === 'second.csv:3');
assert(conflictEvidence.length === 2, 'all type conflict reasons retained');
assert(conflictEvidence.every((entry) => entry.status === 'REJECTED'), 'all conflict evidence rejected');
assert(JSON.stringify(first) === firstSnapshot, 'first input immutable');
assert(JSON.stringify(second) === secondSnapshot, 'second input immutable');
assert(JSON.stringify(result.dataset.sourceIds) === JSON.stringify(['first.csv', 'second.csv']), 'source ids stable');

console.log('PASS merge-complete-check');
