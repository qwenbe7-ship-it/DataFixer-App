import { makeDataset, makeRow } from '../../src/domain/factories';
import { mergeDatasets } from '../../src/rules/merge';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const north = makeDataset(
  ['id', 'amount'],
  [
    makeRow('north.csv', 2, { id: '001', amount: '100' }),
    makeRow('north.csv', 3, { id: '002', amount: '50' }),
  ],
  ['north.csv'],
);
const south = makeDataset(
  ['id', 'amount'],
  [
    makeRow('south.csv', 2, { id: '003', amount: '200' }),
    makeRow('south.csv', 3, { id: '004', amount: 'oops' }),
  ],
  ['south.csv'],
);

const result = mergeDatasets([north, south], {
  columnMapBySource: {
    'north.csv': { id: 'id', amount: 'amount' },
    'south.csv': { id: 'id', amount: 'amount' },
  },
  outputColumns: ['id', 'amount'],
  outputTypes: { id: 'string', amount: 'number' },
  dedupeColumns: [],
});

assert(result.dataset.rows.length === 3, 'three coercible CSV rows should merge');
assert(result.dataset.rows[0]?.values.id === '001', 'string identifier must retain leading zero');
assert(result.dataset.rows[0]?.values.amount === 100, 'numeric CSV text should be normalized to number when target type says number');
assert(result.rejectedRows.length === 1 && result.rejectedRows[0]?.rowId === 'south.csv:3', 'invalid numeric text must be rejected');
const evidence = result.evidence.find((entry) => entry.rowId === 'south.csv:3' && entry.reasonKey === 'merge.typeConflict');
assert(evidence?.reasonParams.expectedType === 'number', 'rejection reports explicit expected type');
assert(evidence?.reasonParams.actualType === 'string', 'rejection reports original CSV type');

console.log('PASS merge-explicit-types-check');
