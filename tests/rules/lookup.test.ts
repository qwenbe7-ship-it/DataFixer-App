import { describe, expect, it } from 'vitest';
import { makeDataset, makeRow } from '../../src/domain/factories';
import { lookupDatasets } from '../../src/rules/lookup';

describe('lookupDatasets', () => {
  it('adds values only for exact one-to-one matches and rejects ambiguous or missing matches', () => {
    const left = makeDataset(['sku'], [
      makeRow('left.csv', 2, { sku: 'A' }),
      makeRow('left.csv', 3, { sku: 'B' }),
      makeRow('left.csv', 4, { sku: 'C' }),
    ], ['left.csv']);
    const right = makeDataset(['sku', 'stock'], [
      makeRow('right.csv', 2, { sku: 'A', stock: 1 }),
      makeRow('right.csv', 3, { sku: 'B', stock: 2 }),
      makeRow('right.csv', 4, { sku: 'B', stock: 3 }),
    ], ['right.csv']);

    const result = lookupDatasets([left, right], {
      leftKeyColumns: ['sku'], rightKeyColumns: ['sku'], rightValueMap: { stock: 'stock_lookup' },
    });

    expect(result.dataset.rows.map((row) => row.values)).toEqual([{ sku: 'A', stock_lookup: 1 }]);
    expect(result.rejectedRows.map((row) => row.rowId)).toEqual(['left.csv:3', 'left.csv:4']);
    expect(result.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ rowId: 'left.csv:2', reasonKey: 'lookup.valueAdded', status: 'CHANGED' }),
      expect.objectContaining({ rowId: 'left.csv:3', reasonKey: 'lookup.multipleMatches', status: 'REJECTED' }),
      expect.objectContaining({ rowId: 'left.csv:4', reasonKey: 'lookup.notFound', status: 'REJECTED' }),
    ]));
  });
});
