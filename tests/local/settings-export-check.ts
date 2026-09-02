import type { RuleSpec } from '../../src/domain/types';
import { parseSettings, serializeSettings } from '../../src/export/settings-export';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function expectInvalid(json: string, label: string) {
  let failed = false;
  try { parseSettings(json); } catch (error) {
    failed = error instanceof Error && error.message === 'INVALID_RULE';
  }
  assert(failed, label);
}

const rules: RuleSpec[] = [
  { id: 'trim-name', kind: 'trim', column: 'name' },
  { id: 'phone-normalize', kind: 'regexReplace', column: 'phone', pattern: '[^0-9]+', replacement: '', replaceAll: true, caseInsensitive: false },
  { id: 'email-shape', kind: 'regex', column: 'email', pattern: '^[^@]+@[^@]+$' },
  { id: 'amount-range', kind: 'numberRange', column: 'amount', min: 0, max: 1000 },
  { id: 'country-default', kind: 'fillDefault', column: 'country', value: 'US' },
  { id: 'enabled-default', kind: 'fillDefault', column: 'enabled', value: false },
  { id: 'phone-fallback', kind: 'coalesce', column: 'phone', sourceColumns: ['phone', 'mobile', 'backup'] },
];

const text = serializeSettings(rules);
assert(text.endsWith('\n'), 'serialized settings end with newline');
assert(text.includes('\n  {\n    "column": "name",\n    "id": "trim-name",\n    "kind": "trim"\n  }'), 'canonical object key order and two spaces');
assert(JSON.stringify(parseSettings(text)) === JSON.stringify(rules), 'round trip preserves rule order and values');

expectInvalid('{', 'malformed JSON rejected');
expectInvalid(JSON.stringify({ rules }), 'non-array root rejected');
expectInvalid(JSON.stringify([{ id: 'x', kind: 'unknown', column: 'a' }]), 'unknown kind rejected');
expectInvalid(JSON.stringify([{ id: 'same', kind: 'trim', column: 'a' }, { id: 'same', kind: 'trim', column: 'b' }]), 'duplicate ids rejected');
expectInvalid(JSON.stringify([{ id: 'x', kind: 'trim', column: '' }]), 'blank column rejected');
expectInvalid(JSON.stringify([{ id: 'x', kind: 'regex', column: 'email', pattern: '[' }]), 'invalid regex rejected');
expectInvalid(JSON.stringify([{ id: 'x', kind: 'trim', column: 'a', script: 'alert(1)' }]), 'script field rejected');
expectInvalid(JSON.stringify([{ id: 'x', kind: 'trim', column: 'a', url: 'https://example.com' }]), 'url field rejected');
expectInvalid(JSON.stringify([{ id: 'x', kind: 'trim', column: 'a', callback: 'run' }]), 'callback field rejected');
expectInvalid(JSON.stringify([{ id: 'x', kind: 'changeCase', column: 'a', mode: 'camel' }]), 'invalid enum rejected');
expectInvalid(JSON.stringify([{ id: 'x', kind: 'numberRange', column: 'a', min: 10, max: 1 }]), 'invalid range rejected');

console.log('PASS settings-export-check');
expectInvalid(JSON.stringify([{ id: 'allowed-empty', kind: 'allowed', column: 'status', values: [] }]), 'empty allowed list rejected');

expectInvalid(JSON.stringify([{ id: 'regex-replace-bad', kind: 'regexReplace', column: 'phone', pattern: '[', replacement: '', replaceAll: true, caseInsensitive: false }]), 'invalid regexReplace pattern rejected');
expectInvalid(JSON.stringify([{ id: 'regex-replace-empty', kind: 'regexReplace', column: 'phone', pattern: '', replacement: '', replaceAll: true, caseInsensitive: false }]), 'empty regexReplace pattern rejected');
expectInvalid(JSON.stringify([{ id: 'regex-replace-flags', kind: 'regexReplace', column: 'phone', pattern: 'x', replacement: '', replaceAll: 'yes', caseInsensitive: false }]), 'regexReplace booleans required');

expectInvalid(JSON.stringify([{ id: 'fill-null', kind: 'fillDefault', column: 'country', value: null }]), 'null fill default rejected');
expectInvalid(JSON.stringify([{ id: 'coalesce-empty', kind: 'coalesce', column: 'phone', sourceColumns: [] }]), 'empty coalesce sources rejected');
expectInvalid(JSON.stringify([{ id: 'coalesce-dup', kind: 'coalesce', column: 'phone', sourceColumns: ['mobile', 'mobile'] }]), 'duplicate coalesce sources rejected');

expectInvalid(JSON.stringify([{ id: 'fill-empty', kind: 'fillDefault', column: 'country', value: '' }]), 'empty string fill default rejected');

expectInvalid(JSON.stringify([{ id: 'unsafe-regex-replace', kind: 'regexReplace', column: 'code', pattern: '(a+)+$', replacement: '', replaceAll: true, caseInsensitive: false }]), 'unsafe regexReplace rejected');
expectInvalid(JSON.stringify([{ id: 'unsafe-regex', kind: 'regex', column: 'code', pattern: '(a+)+$' }]), 'unsafe validation regex rejected');
