import { DataFixerError } from '../../src/domain/errors';
import { makeDataset, makeRow } from '../../src/domain/factories';
import { applyRules } from '../../src/rules/engine';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function eq(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const input = makeDataset(['email'], [makeRow('a.csv', 2, { email: ' A@EXAMPLE.COM ' })], ['a.csv']);
let result = applyRules(input, [
  { id: 'trim', kind: 'trim', column: 'email' },
  { id: 'lower', kind: 'changeCase', column: 'email', mode: 'lower' },
]);
assert(result.dataset.rows[0].values.email === 'a@example.com', 'rule order');
assert(input.rows[0].values.email === ' A@EXAMPLE.COM ', 'input mutation');
eq(result.evidence.map((e) => e.ruleId), ['trim', 'lower'], 'evidence order');

const dupes = makeDataset(['email'], [
  makeRow('a.csv', 2, { email: 'a@example.com' }),
  makeRow('a.csv', 3, { email: 'a@example.com' }),
  makeRow('a.csv', 4, { email: 'b@example.com' }),
], ['a.csv']);
result = applyRules(dupes, [{ id: 'dedupe', kind: 'dedupe', columns: ['email'] }]);
eq(result.dataset.rows.map((row) => row.rowId), ['a.csv:2', 'a.csv:4'], 'dedupe survivors');
eq(result.removedRows.map((row) => row.rowId), ['a.csv:3'], 'dedupe removed');
assert(result.evidence[0]?.status === 'REMOVED', 'dedupe evidence status');

let missingThrown = false;
try {
  applyRules(input, [
    { id: 'trim', kind: 'trim', column: 'email' },
    { id: 'bad', kind: 'trim', column: 'missing' },
  ]);
} catch (error) {
  missingThrown = error instanceof DataFixerError && error.code === 'MISSING_COLUMN';
}
assert(missingThrown, 'missing column must throw before processing');
assert(input.rows[0].values.email === ' A@EXAMPLE.COM ', 'preflight mutated input');

const rejectedInput = makeDataset(['amount'], [
  makeRow('a.csv', 2, { amount: '12abc' }),
  makeRow('a.csv', 3, { amount: '1,200' }),
], ['a.csv']);
result = applyRules(rejectedInput, [{ id: 'number', kind: 'parseNumber', column: 'amount', removeThousandsSeparator: true }]);
eq(result.dataset.rows.map((row) => row.rowId), ['a.csv:3'], 'rejected row excluded from output');
eq(result.rejectedRows.map((row) => row.rowId), ['a.csv:2'], 'rejected row collection');

const renamedInput = makeDataset(['old_name', 'age'], [makeRow('a.csv', 2, { old_name: ' Alice ', age: 30 })], ['a.csv']);
result = applyRules(renamedInput, [
  { id: 'rename', kind: 'renameColumn', from: 'old_name', to: 'name' },
  { id: 'trim', kind: 'trim', column: 'name' },
  { id: 'keep', kind: 'keepColumns', columns: ['name'] },
]);
eq(result.dataset.columns, ['name'], 'schema rule order');
eq(result.dataset.rows[0].values, { name: 'Alice' }, 'schema row values');



const fullRowDupes = makeDataset(['id', 'amount'], [
  makeRow('a.csv', 10, { id: 'A', amount: 100 }),
  makeRow('a.csv', 11, { id: 'A', amount: 100 }),
  makeRow('a.csv', 12, { id: 'A', amount: 200 }),
], ['a.csv']);
result = applyRules(fullRowDupes, [{ id: 'dedupe-full', kind: 'dedupe', columns: [] }]);
eq(result.dataset.rows.map((row) => row.rowId), ['a.csv:10', 'a.csv:12'], 'empty dedupe columns means full-row dedupe');
eq(result.removedRows.map((row) => row.rowId), ['a.csv:11'], 'full-row duplicate removed');

let collisionThrown = false;
try {
  const collisionInput = makeDataset(['old_name', 'name'], [makeRow('a.csv', 2, { old_name: 'Alice', name: 'Bob' })], ['a.csv']);
  applyRules(collisionInput, [{ id: 'rename-collision', kind: 'renameColumn', from: 'old_name', to: 'name' }]);
} catch (error) {
  collisionThrown = error instanceof DataFixerError && error.code === 'INVALID_RULE';
}
assert(collisionThrown, 'rename destination collision must throw INVALID_RULE');

console.log('PASS engine-check');

let duplicateIdThrown = false;
try {
  applyRules(input, [
    { id: 'same', kind: 'trim', column: 'email' },
    { id: 'same', kind: 'changeCase', column: 'email', mode: 'lower' },
  ]);
} catch (error) {
  duplicateIdThrown = error instanceof DataFixerError && error.code === 'INVALID_RULE';
}
assert(duplicateIdThrown, 'duplicate clean rule IDs must throw INVALID_RULE');

let blankIdThrown = false;
try {
  applyRules(input, [{ id: '   ', kind: 'trim', column: 'email' }]);
} catch (error) {
  blankIdThrown = error instanceof DataFixerError && error.code === 'INVALID_RULE';
}
assert(blankIdThrown, 'blank clean rule ID must throw INVALID_RULE');

for (const badRules of [
  [{ id: 'keep-empty', kind: 'keepColumns' as const, columns: [] }],
  [{ id: 'keep-dup', kind: 'keepColumns' as const, columns: ['email', 'email'] }],
  [{ id: 'dedupe-dup', kind: 'dedupe' as const, columns: ['email', 'email'] }],
  [{ id: 'rename-blank', kind: 'renameColumn' as const, from: 'email', to: '   ' }],
]) {
  let invalid = false;
  try { applyRules(input, badRules); }
  catch (error) { invalid = error instanceof DataFixerError && error.code === 'INVALID_RULE'; }
  assert(invalid, `invalid clean schema rule must be rejected: ${badRules[0].id}`);
}
