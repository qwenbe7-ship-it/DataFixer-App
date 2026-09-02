import { makeDataset, makeRow } from '../../src/domain/factories';
import { applyRules } from '../../src/rules/engine';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const input = makeDataset(
  ['country', 'status', 'phone', 'mobile', 'backup', 'score', 'enabled'],
  [
    makeRow('contacts.csv', 2, { country: null, status: 'ACTIVE', phone: null, mobile: '01012345678', backup: null, score: 0, enabled: false }),
    makeRow('contacts.csv', 3, { country: 'KR', status: null, phone: '021234567', mobile: '01099998888', backup: null, score: null, enabled: null }),
    makeRow('contacts.csv', 4, { country: null, status: null, phone: null, mobile: null, backup: '07012345678', score: null, enabled: null }),
  ],
  ['contacts.csv'],
);

const result = applyRules(input, [
  { id: 'country-default', kind: 'fillDefault', column: 'country', value: 'US' },
  { id: 'status-default', kind: 'fillDefault', column: 'status', value: 'PENDING' },
  { id: 'phone-fallback', kind: 'coalesce', column: 'phone', sourceColumns: ['phone', 'mobile', 'backup'] },
  { id: 'score-default', kind: 'fillDefault', column: 'score', value: 99 },
  { id: 'enabled-default', kind: 'fillDefault', column: 'enabled', value: true },
]);

assert(result.dataset.rows.length === 3, 'fill/coalesce must preserve row count');
assert(result.dataset.rows[0]?.values.country === 'US', 'fillDefault fills null');
assert(result.dataset.rows[1]?.values.country === 'KR', 'fillDefault must not overwrite existing value');
assert(result.dataset.rows[0]?.values.phone === '01012345678', 'coalesce uses first non-null fallback');
assert(result.dataset.rows[1]?.values.phone === '021234567', 'coalesce must preserve existing target');
assert(result.dataset.rows[2]?.values.phone === '07012345678', 'coalesce can use later fallback');
assert(result.dataset.rows[0]?.values.score === 0, 'zero is present and must not be overwritten');
assert(result.dataset.rows[0]?.values.enabled === false, 'false is present and must not be overwritten');
assert(result.dataset.rows[1]?.values.score === 99, 'numeric default fills null');
assert(result.dataset.rows[1]?.values.enabled === true, 'boolean default fills null');
assert(result.evidence.some((entry) => entry.ruleId === 'phone-fallback' && entry.reasonKey === 'clean.coalesced' && entry.reasonParams.sourceColumn === 'mobile'), 'coalesce evidence records chosen source');
assert(result.evidence.some((entry) => entry.ruleId === 'country-default' && entry.reasonKey === 'clean.defaultFilled'), 'fillDefault evidence reason');

let emptySourcesRejected = false;
try {
  applyRules(input, [{ id: 'bad-coalesce', kind: 'coalesce', column: 'phone', sourceColumns: [] }]);
} catch (error) {
  emptySourcesRejected = error instanceof Error && (error as { code?: string }).code === 'INVALID_RULE';
}
assert(emptySourcesRejected, 'coalesce requires at least one source column');

let duplicateSourcesRejected = false;
try {
  applyRules(input, [{ id: 'bad-coalesce', kind: 'coalesce', column: 'phone', sourceColumns: ['mobile', 'mobile'] }]);
} catch (error) {
  duplicateSourcesRejected = error instanceof Error && (error as { code?: string }).code === 'INVALID_RULE';
}
assert(duplicateSourcesRejected, 'coalesce source columns must be unique');

let missingSourceRejected = false;
try {
  applyRules(input, [{ id: 'bad-coalesce', kind: 'coalesce', column: 'phone', sourceColumns: ['missing'] }]);
} catch (error) {
  missingSourceRejected = error instanceof Error && (error as { code?: string }).code === 'MISSING_COLUMN';
}
assert(missingSourceRejected, 'coalesce source columns must exist');

let nullDefaultRejected = false;
try {
  applyRules(input, [{ id: 'bad-default', kind: 'fillDefault', column: 'country', value: null } as unknown as import('../../src/domain/types').CleanRule]);
} catch (error) {
  nullDefaultRejected = error instanceof Error && (error as { code?: string }).code === 'INVALID_RULE';
}
assert(nullDefaultRejected, 'null default must be rejected as a no-op');


let emptyDefaultRejected = false;
try {
  applyRules(input, [{ id: 'empty-default', kind: 'fillDefault', column: 'country', value: '' }]);
} catch (error) {
  emptyDefaultRejected = error instanceof Error && (error as { code?: string }).code === 'INVALID_RULE';
}
assert(emptyDefaultRejected, 'empty string default must be rejected until the user enters an intentional value');

console.log('PASS fill-coalesce-check');
