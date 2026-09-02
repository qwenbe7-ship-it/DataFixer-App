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

// Multiple failures on one row must retain every reason but reject the row once.
{
  const input = makeDataset(
    ['email'],
    [makeRow('contacts.csv', 2, { email: '' })],
    ['contacts.csv'],
  );
  const result = validateDataset(input, [
    { id: 'required-email', kind: 'required', column: 'email' },
    { id: 'email-shape', kind: 'regex', column: 'email', pattern: '^[^@]+@[^@]+$' },
  ]);
  assert(result.rejectedRows.length === 1, 'row rejected exactly once');
  assert(result.dataset.rows.length === 0, 'failing row excluded from passing dataset');
  assert(JSON.stringify(result.evidence.map((entry) => entry.ruleId)) === JSON.stringify(['required-email', 'email-shape']), 'all reasons retained in rule order');
  assert(result.evidence.every((entry) => entry.status === 'REJECTED'), 'all validation evidence rejected');
}

// Required treats null, empty, and whitespace-only strings as missing; zero and false are present.
{
  const input = makeDataset(
    ['value'],
    [
      makeRow('required.csv', 2, { value: null }),
      makeRow('required.csv', 3, { value: '' }),
      makeRow('required.csv', 4, { value: '   ' }),
      makeRow('required.csv', 5, { value: 0 }),
      makeRow('required.csv', 6, { value: false }),
    ],
    ['required.csv'],
  );
  const result = validateDataset(input, [{ id: 'required', kind: 'required', column: 'value' }]);
  assert(result.rejectedRows.length === 3, 'required rejects null/empty/whitespace');
  assert(result.dataset.rows.length === 2, 'required accepts zero and false');
}

// Type validation accepts strict numeric CSV text for numeric expectations; date means a real YYYY-MM-DD calendar date.
{
  const input = makeDataset(
    ['text', 'integer', 'number', 'date'],
    [
      makeRow('types.csv', 2, { text: 'ok', integer: 3, number: 3.5, date: '2026-09-01' }),
      makeRow('types.csv', 3, { text: 3, integer: 3.5, number: '3.5', date: '2026-02-30' }),
    ],
    ['types.csv'],
  );
  const result = validateDataset(input, [
    { id: 'text-type', kind: 'type', column: 'text', expected: 'string' },
    { id: 'integer-type', kind: 'type', column: 'integer', expected: 'integer' },
    { id: 'number-type', kind: 'type', column: 'number', expected: 'number' },
    { id: 'date-type', kind: 'type', column: 'date', expected: 'date' },
  ]);
  assert(result.dataset.rows.length === 1, 'valid typed row passes');
  assert(result.rejectedRows.length === 1, 'invalid typed row rejected once');
  const typeFailures = result.evidence.filter((entry) => entry.rowId === 'types.csv:3');
  assert(typeFailures.length === 3, 'only genuinely invalid type failures retained');
  assert(!typeFailures.some((entry) => entry.ruleId === 'number-type'), 'strict numeric CSV text satisfies number type without mutation');
}

// Unique validation marks every member of a duplicated key group, not just later rows.
{
  const input = makeDataset(
    ['id', 'region'],
    [
      makeRow('unique.csv', 2, { id: 'A', region: 'KR' }),
      makeRow('unique.csv', 3, { id: 'A', region: 'KR' }),
      makeRow('unique.csv', 4, { id: 'B', region: 'KR' }),
    ],
    ['unique.csv'],
  );
  const result = validateDataset(input, [{ id: 'unique-id-region', kind: 'unique', columns: ['id', 'region'] }]);
  assert(JSON.stringify(result.rejectedRows.map((row) => row.rowId)) === JSON.stringify(['unique.csv:2', 'unique.csv:3']), 'all duplicate members rejected');
  assert(JSON.stringify(result.dataset.rows.map((row) => row.rowId)) === JSON.stringify(['unique.csv:4']), 'unique row passes in input order');
}

// Allowed, number range, and length rules use inclusive bounds.
{
  const input = makeDataset(
    ['status', 'amount', 'code'],
    [
      makeRow('bounds.csv', 2, { status: 'OPEN', amount: 10, code: 'ABC' }),
      makeRow('bounds.csv', 3, { status: 'BAD', amount: 9, code: 'AB' }),
      makeRow('bounds.csv', 4, { status: 'CLOSED', amount: 20, code: 'ABCDE' }),
      makeRow('bounds.csv', 5, { status: 'OPEN', amount: 21, code: 'ABCDEF' }),
    ],
    ['bounds.csv'],
  );
  const result = validateDataset(input, [
    { id: 'allowed-status', kind: 'allowed', column: 'status', values: ['OPEN', 'CLOSED'] },
    { id: 'amount-range', kind: 'numberRange', column: 'amount', min: 10, max: 20 },
    { id: 'code-length', kind: 'length', column: 'code', min: 3, max: 5 },
  ]);
  assert(JSON.stringify(result.dataset.rows.map((row) => row.rowId)) === JSON.stringify(['bounds.csv:2', 'bounds.csv:4']), 'inclusive bounds pass');
  assert(JSON.stringify(result.rejectedRows.map((row) => row.rowId)) === JSON.stringify(['bounds.csv:3', 'bounds.csv:5']), 'out of bounds rows rejected');
}

// Regex and column comparisons are strict; order comparisons do not coerce mismatched types.
{
  const input = makeDataset(
    ['sku', 'min', 'max'],
    [
      makeRow('compare.csv', 2, { sku: 'AB-123', min: 10, max: 10 }),
      makeRow('compare.csv', 3, { sku: 'bad', min: 11, max: 10 }),
      makeRow('compare.csv', 4, { sku: 'CD-456', min: '9', max: 10 }),
    ],
    ['compare.csv'],
  );
  const result = validateDataset(input, [
    { id: 'sku-shape', kind: 'regex', column: 'sku', pattern: '^[A-Z]{2}-\\d{3}$' },
    { id: 'min-lte-max', kind: 'columnCompare', left: 'min', operator: 'lte', right: 'max' },
  ]);
  assert(result.dataset.rows.length === 1 && result.dataset.rows[0]?.rowId === 'compare.csv:2', 'regex and comparison valid row passes');
  assert(result.rejectedRows.length === 2, 'bad shape/value and mismatched comparison rejected');
}

// Preflight must reject invalid rules before processing.
{
  const input = makeDataset(['email', 'amount'], [makeRow('preflight.csv', 2, { email: 'a@example.com', amount: 10 })], ['preflight.csv']);
  expectError(() => validateDataset(input, [{ id: 'bad-regex', kind: 'regex', column: 'email', pattern: '[' }]), 'INVALID_RULE');
  expectError(() => validateDataset(input, [{ id: 'missing', kind: 'required', column: 'missing' }]), 'MISSING_COLUMN');
  expectError(() => validateDataset(input, [{ id: 'bad-range', kind: 'numberRange', column: 'amount', min: 20, max: 10 }]), 'INVALID_RULE');
  expectError(() => validateDataset(input, [{ id: 'bad-unique', kind: 'unique', columns: [] }]), 'INVALID_RULE');
}

// Validation must not mutate the input dataset or values.
{
  const input = makeDataset(['email'], [makeRow('immutable.csv', 2, { email: '' })], ['immutable.csv']);
  const snapshot = JSON.stringify(input);
  validateDataset(input, [{ id: 'required', kind: 'required', column: 'email' }]);
  assert(JSON.stringify(input) === snapshot, 'validation input immutable');
}

console.log('PASS validate-all-check');
