import { describe, expect, it } from 'vitest';
import { makeDataset, makeRow } from '../../src/domain/factories';

describe('domain factories', () => {
  it('creates deterministic row IDs from source and source row number', () => {
    const row = makeRow('orders.csv', 2, { order_id: 'A-1', amount: 10 });
    expect(row).toEqual({
      rowId: 'orders.csv:2',
      sourceId: 'orders.csv',
      sourceRowNumber: 2,
      values: { order_id: 'A-1', amount: 10 },
    });
  });

  it('preserves declared column and source order', () => {
    const row = makeRow('orders.csv', 2, { order_id: 'A-1' });
    expect(makeDataset(['order_id'], [row], ['orders.csv'])).toEqual({
      columns: ['order_id'],
      rows: [row],
      sourceIds: ['orders.csv'],
    });
  });
});
