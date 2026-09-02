import { makeDataset, makeRow } from '../../src/domain/factories';
import { mergeDatasets } from '../../src/rules/merge';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const a = makeDataset(['id', 'amount'], [makeRow('a.csv', 2, { id: 'X', amount: 10 })], ['a.csv']);
const b = makeDataset(['id', 'amount'], [makeRow('b.csv', 2, { id: 'X', amount: 20 })], ['b.csv']);
const result = mergeDatasets([a, b], {
  columnMapBySource: {
    'a.csv': { id: 'id', amount: 'amount' },
    'b.csv': { id: 'id', amount: 'amount' },
  },
  outputColumns: ['id', 'amount'],
  dedupeColumns: ['id'],
});
assert(result.dataset.rows.length === 1, 'first duplicate should survive only once');
assert(result.dataset.rows[0]?.values.amount === 10, 'first duplicate should win');
assert(result.removedRows.length === 1, 'later duplicate should be removed');
assert(result.removedRows[0]?.sourceId === 'b.csv', 'removed row should come from later source');
assert(result.evidence.some((entry) => entry.rowId === 'b.csv:2' && entry.status === 'REMOVED'), 'removed evidence');
console.log('PASS merge-dedupe-check');
