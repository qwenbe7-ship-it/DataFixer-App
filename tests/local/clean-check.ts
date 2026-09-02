import { makeRow } from '../../src/domain/factories';
import { applyCleanRule } from '../../src/rules/clean';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const row = makeRow('people.csv', 2, { name: '  Alice  ' });
const result = applyCleanRule(row, { id: 'trim-name', kind: 'trim', column: 'name' });
assert(result.row.values.name === 'Alice', 'trim did not change value');
assert(result.evidence.length === 1, 'trim evidence missing');
assert(result.evidence[0].reasonKey === 'clean.trimmed', 'wrong reason key');
const unchanged = applyCleanRule(makeRow('people.csv', 3, { name: 'Alice' }), { id: 'trim-name', kind: 'trim', column: 'name' });
assert(unchanged.evidence.length === 0, 'unchanged trim emitted evidence');
console.log('PASS clean-check');
