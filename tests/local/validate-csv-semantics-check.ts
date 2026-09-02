import { makeDataset, makeRow } from '../../src/domain/factories';
import { validateDataset } from '../../src/rules/validate';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// CSV is read with raw:true to preserve identifiers, so numeric-looking cells arrive as strings.
// Numeric validation rules must interpret strict numeric strings without mutating the source value.
const input = makeDataset(
  ['age'],
  [
    makeRow('contacts.csv', 2, { age: '30' }),
    makeRow('contacts.csv', 3, { age: '17' }),
    makeRow('contacts.csv', 4, { age: '30x' }),
  ],
  ['contacts.csv'],
);
const snapshot = JSON.stringify(input);
const result = validateDataset(input, [
  { id: 'age-type', kind: 'type', column: 'age', expected: 'number' },
  { id: 'age-range', kind: 'numberRange', column: 'age', min: 18, max: 65 },
]);

assert(result.dataset.rows.length === 1, 'strict numeric CSV text should satisfy number rules');
assert(result.dataset.rows[0]?.rowId === 'contacts.csv:2', '30 should pass type and range');
assert(result.dataset.rows[0]?.values.age === '30', 'validation must preserve original CSV text');
assert(result.rejectedRows.some((row) => row.rowId === 'contacts.csv:3'), '17 should fail range');
assert(result.rejectedRows.some((row) => row.rowId === 'contacts.csv:4'), '30x should fail numeric type');
assert(JSON.stringify(input) === snapshot, 'numeric interpretation must not mutate input');

console.log('PASS validate-csv-semantics-check');
