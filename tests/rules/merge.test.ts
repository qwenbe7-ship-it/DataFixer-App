import { describe, expect, it } from 'vitest';
import { makeDataset, makeRow } from '../../src/domain/factories';
import { mergeDatasets } from '../../src/rules/merge';

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

describe('mergeDatasets', () => {
  it('maps source schemas into a stable output order with a source column', () => {
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
    expect(result.dataset.rows.map((row) => row.values)).toEqual([
      { id: 'N-1', amount: 100, source: 'north.csv' },
      { id: 'S-1', amount: 200, source: 'south.csv' },
    ]);
  });
});

it('fills missing targets with null and preserves input order without mutation', () => {
  const first = makeDataset(['id', 'amount'], [makeRow('first.csv', 2, { id: 'A', amount: 10 })], ['first.csv']);
  const second = makeDataset(['order_id'], [makeRow('second.csv', 2, { order_id: 'B' })], ['second.csv']);
  const snapshot = JSON.stringify([first, second]);
  const result = mergeDatasets([first, second], {
    columnMapBySource: {
      'first.csv': { id: 'id', amount: 'amount' },
      'second.csv': { order_id: 'id' },
    },
    outputColumns: ['id', 'amount'],
    dedupeColumns: [],
  });
  expect(result.dataset.rows.map((row) => row.values)).toEqual([
    { id: 'A', amount: 10 },
    { id: 'B', amount: null },
  ]);
  expect(JSON.stringify([first, second])).toBe(snapshot);
});

it('removes later duplicates while keeping the first row', () => {
  const first = makeDataset(['id'], [makeRow('first.csv', 2, { id: 'A' })], ['first.csv']);
  const second = makeDataset(['id'], [makeRow('second.csv', 2, { id: 'A' })], ['second.csv']);
  const result = mergeDatasets([first, second], {
    columnMapBySource: { 'first.csv': { id: 'id' }, 'second.csv': { id: 'id' } },
    outputColumns: ['id'],
    dedupeColumns: ['id'],
  });
  expect(result.dataset.rows.map((row) => row.rowId)).toEqual(['first.csv:2']);
  expect(result.removedRows.map((row) => row.rowId)).toEqual(['second.csv:2']);
  expect(result.evidence).toEqual([expect.objectContaining({ rowId: 'second.csv:2', status: 'REMOVED', reasonKey: 'merge.duplicateRemoved' })]);
});

it('rejects type conflicts once while preserving all original values and reasons', () => {
  const first = makeDataset(['id', 'amount'], [makeRow('first.csv', 2, { id: 'A', amount: 10 })], ['first.csv']);
  const second = makeDataset(['id', 'amount'], [makeRow('second.csv', 2, { id: 99, amount: 'bad' })], ['second.csv']);
  const result = mergeDatasets([first, second], {
    columnMapBySource: { 'first.csv': { id: 'id', amount: 'amount' }, 'second.csv': { id: 'id', amount: 'amount' } },
    outputColumns: ['id', 'amount'],
    dedupeColumns: [],
  });
  expect(result.rejectedRows).toHaveLength(1);
  expect(result.rejectedRows[0].values).toEqual({ id: 99, amount: 'bad' });
  expect(result.evidence.filter((entry) => entry.rowId === 'second.csv:2')).toHaveLength(2);
});
