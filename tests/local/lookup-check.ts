import { DataFixerError } from '../../src/domain/errors';
import { makeDataset, makeRow } from '../../src/domain/factories';
import { lookupDatasets } from '../../src/rules/lookup';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const base = makeDataset(
  ['sku', 'name'],
  [
    makeRow('orders.csv', 2, { sku: 'A-1', name: 'Alpha' }),
    makeRow('orders.csv', 3, { sku: 'B-2', name: 'Beta' }),
    makeRow('orders.csv', 4, { sku: 'C-3', name: 'Gamma' }),
  ],
  ['orders.csv'],
);
const reference = makeDataset(
  ['product_sku', 'stock', 'supplier'],
  [
    makeRow('inventory.csv', 2, { product_sku: 'A-1', stock: 10, supplier: 'North' }),
    makeRow('inventory.csv', 3, { product_sku: 'B-2', stock: 20, supplier: 'South' }),
    makeRow('inventory.csv', 4, { product_sku: 'B-2', stock: 25, supplier: 'Backup' }),
  ],
  ['inventory.csv'],
);

const result = lookupDatasets([base, reference], {
  leftKeyColumns: ['sku'],
  rightKeyColumns: ['product_sku'],
  rightValueMap: { stock: 'inventory_stock', supplier: 'inventory_supplier' },
});
assert(result.dataset.columns.join('|') === 'sku|name|inventory_stock|inventory_supplier', 'lookup appends mapped result columns');
assert(result.dataset.rows.length === 1, 'only one-to-one matches are emitted');
assert(result.dataset.rows[0].values.inventory_stock === 10, 'matched lookup value is copied');
assert(result.rejectedRows.length === 2, 'not found and multiple matches reject base rows');
assert(result.evidence.some((entry) => entry.rowId === 'orders.csv:2' && entry.status === 'CHANGED' && entry.reasonKey === 'lookup.valueAdded' && entry.reasonParams.referenceRowId === 'inventory.csv:2' && entry.reasonParams.referenceRowNumber === 2), 'matched row records changed evidence and reference row provenance');
assert(result.evidence.some((entry) => entry.rowId === 'orders.csv:3' && entry.status === 'REJECTED' && entry.reasonKey === 'lookup.multipleMatches' && entry.reasonParams.matches === 2), 'multiple matches are explicit');
assert(result.evidence.some((entry) => entry.rowId === 'orders.csv:4' && entry.status === 'REJECTED' && entry.reasonKey === 'lookup.notFound'), 'not found is explicit');
assert(base.rows[0].values.inventory_stock === undefined, 'base input remains immutable');



const reversedMapping = lookupDatasets([base, reference], {
  leftKeyColumns: ['sku'], rightKeyColumns: ['product_sku'],
  rightValueMap: { supplier: 'inventory_supplier', stock: 'inventory_stock' },
});
assert(reversedMapping.dataset.columns.join('|') === 'sku|name|inventory_stock|inventory_supplier', 'lookup output order follows reference columns, not object key insertion order');

const typedBase = makeDataset(['id'], [makeRow('typed-base.csv', 2, { id: 1 })], ['typed-base.csv']);
const typedRef = makeDataset(['id', 'value'], [makeRow('typed-ref.csv', 2, { id: '1', value: 'wrong-type' })], ['typed-ref.csv']);
const typed = lookupDatasets([typedBase, typedRef], { leftKeyColumns: ['id'], rightKeyColumns: ['id'], rightValueMap: { value: 'value_from_ref' } });
assert(typed.dataset.rows.length === 0 && typed.rejectedRows.length === 1, 'exact lookup keeps number 1 distinct from string 1');

function expectInvalid(settings: Parameters<typeof lookupDatasets>[1], message: string): void {
  try { lookupDatasets([base, reference], settings); throw new Error(`expected invalid: ${message}`); }
  catch (error) {
    if (!(error instanceof DataFixerError) || (error.code !== 'INVALID_RULE' && error.code !== 'MISSING_COLUMN')) throw error;
  }
}
expectInvalid({ leftKeyColumns: [], rightKeyColumns: [], rightValueMap: { stock: 'inventory_stock' } }, 'empty keys');
expectInvalid({ leftKeyColumns: ['sku'], rightKeyColumns: ['product_sku', 'supplier'], rightValueMap: { stock: 'inventory_stock' } }, 'different key widths');
expectInvalid({ leftKeyColumns: ['sku'], rightKeyColumns: ['product_sku'], rightValueMap: {} }, 'no output values');
expectInvalid({ leftKeyColumns: ['sku'], rightKeyColumns: ['product_sku'], rightValueMap: { stock: 'name' } }, 'target collision');

console.log('PASS lookup-check');
