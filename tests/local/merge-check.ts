import { makeDataset, makeRow } from '../../src/domain/factories';
import { mergeDatasets } from '../../src/rules/merge';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const north = makeDataset(
  ['order_id', 'total'],
  [makeRow('north.csv', 2, { order_id: 'N-1', total: 100 })],
  ['north.csv'],
);
const south = makeDataset(
  ['id', 'amount_krw'],
  [makeRow('south.csv', 2, { id: 'S-1', amount_krw: 200 })],
  ['south.csv'],
);
const result = mergeDatasets([north, south], {
  columnMapBySource: {
    'north.csv': { order_id: 'id', total: 'amount' },
    'south.csv': { id: 'id', amount_krw: 'amount' },
  },
  outputColumns: ['id', 'amount', 'source'],
  sourceColumn: 'source',
  dedupeColumns: ['id'],
});
assert(JSON.stringify(result.dataset.columns) === JSON.stringify(['id', 'amount', 'source']), 'output column order');
assert(result.dataset.rows[0]?.values.id === 'N-1', 'north row first');
assert(result.dataset.rows[1]?.values.id === 'S-1', 'south row second');
console.log('PASS merge-check');
