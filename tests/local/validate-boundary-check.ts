import { DataFixerError } from '../../src/domain/errors';
import { makeDataset, makeRow } from '../../src/domain/factories';
import { validateDataset } from '../../src/rules/validate';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectError(fn: () => unknown, code: string): void {
  try {
    fn();
    throw new Error(`expected ${code}`);
  } catch (error) {
    if (!(error instanceof DataFixerError) || error.code !== code) throw error;
  }
}

// Duplicate rule IDs would make audit evidence ambiguous and must be rejected before processing.
{
  const input = makeDataset(['email'], [makeRow('rules.csv', 2, { email: '' })], ['rules.csv']);
  expectError(() => validateDataset(input, [
    { id: 'same-id', kind: 'required', column: 'email' },
    { id: 'same-id', kind: 'regex', column: 'email', pattern: '.+' },
  ]), 'INVALID_RULE');
}

// Unique evidence must carry the duplicated key values so a non-developer can see what collided.
{
  const input = makeDataset(
    ['id', 'region'],
    [
      makeRow('unique-evidence.csv', 2, { id: 'A', region: 'KR' }),
      makeRow('unique-evidence.csv', 3, { id: 'A', region: 'KR' }),
    ],
    ['unique-evidence.csv'],
  );
  const result = validateDataset(input, [{ id: 'u', kind: 'unique', columns: ['id', 'region'] }]);
  const first = result.evidence[0];
  assert(first?.reasonParams.columns === 'id,region', 'unique evidence lists key columns');
  assert(first?.reasonParams.values === '["A","KR"]', 'unique evidence lists collided values');
}

// Date validation must respect real calendar dates, including leap years.
{
  const input = makeDataset(
    ['date'],
    [
      makeRow('dates.csv', 2, { date: '2024-02-29' }),
      makeRow('dates.csv', 3, { date: '2026-02-29' }),
    ],
    ['dates.csv'],
  );
  const result = validateDataset(input, [{ id: 'date', kind: 'type', column: 'date', expected: 'date' }]);
  assert(result.dataset.rows.length === 1 && result.dataset.rows[0]?.rowId === 'dates.csv:2', 'real leap day passes');
  assert(result.rejectedRows.length === 1 && result.rejectedRows[0]?.rowId === 'dates.csv:3', 'impossible leap day fails');
}

// Excel date serials are valid when the user explicitly declares a date column; Excel's fictitious serial 60 is rejected.
{
  const input = makeDataset(
    ['date'],
    [
      makeRow('excel-dates.xlsx', 2, { date: 46266 }),
      makeRow('excel-dates.xlsx', 3, { date: 60 }),
    ],
    ['excel-dates.xlsx'],
  );
  const result = validateDataset(input, [{ id: 'excel-date', kind: 'type', column: 'date', expected: 'date' }]);
  assert(result.dataset.rows.length === 1 && result.dataset.rows[0]?.rowId === 'excel-dates.xlsx:2', 'real Excel date serial passes');
  assert(result.rejectedRows.length === 1 && result.rejectedRows[0]?.rowId === 'excel-dates.xlsx:3', 'Excel fictitious leap day serial fails');
}

// Length is counted in Unicode code points, not UTF-16 code units.
{
  const input = makeDataset(['value'], [makeRow('unicode.csv', 2, { value: '😀😀' })], ['unicode.csv']);
  const result = validateDataset(input, [{ id: 'len', kind: 'length', column: 'value', min: 2, max: 2 }]);
  assert(result.dataset.rows.length === 1, 'two emoji count as length two');
}

// No rules means no validation failures and input order is preserved.
{
  const input = makeDataset(
    ['id'],
    [makeRow('none.csv', 2, { id: 'A' }), makeRow('none.csv', 3, { id: 'B' })],
    ['none.csv'],
  );
  const result = validateDataset(input, []);
  assert(JSON.stringify(result.dataset.rows.map((row) => row.rowId)) === JSON.stringify(['none.csv:2', 'none.csv:3']), 'empty rule set preserves rows');
  assert(result.evidence.length === 0 && result.rejectedRows.length === 0, 'empty rule set has no failures');
}


let unsafeRegexRejected = false;
try {
  validateDataset(makeDataset(['email'], [makeRow('unsafe.csv', 2, { email: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!' })], ['unsafe.csv']), [{ id: 'unsafe-regex', kind: 'regex', column: 'email', pattern: '(a+)+$' }]);
} catch (error) {
  unsafeRegexRejected = error instanceof Error && (error as { code?: string }).code === 'INVALID_RULE';
}
assert(unsafeRegexRejected, 'catastrophic validation regex patterns must fail preflight');

console.log('PASS validate-boundary-check');

const emptyBoundsInput = makeDataset(['amount', 'name'], [makeRow('bounds.csv', 2, { amount: 10, name: 'A' })], ['bounds.csv']);
for (const rule of [
  { id: 'range-empty', kind: 'numberRange' as const, column: 'amount' },
  { id: 'length-empty', kind: 'length' as const, column: 'name' },
]) {
  let invalid = false;
  try { validateDataset(emptyBoundsInput, [rule]); }
  catch (error) { invalid = error instanceof DataFixerError && error.code === 'INVALID_RULE'; }
  assert(invalid, `${rule.kind} without min/max must be INVALID_RULE`);
}

// An allowed-value rule with an empty list would reject every row and is almost certainly a configuration error.
{
  const input = makeDataset(['status'], [makeRow('allowed.csv', 2, { status: 1 })], ['allowed.csv']);
  expectError(() => validateDataset(input, [
    { id: 'allowed-empty', kind: 'allowed', column: 'status', values: [] },
  ]), 'INVALID_RULE');
}
