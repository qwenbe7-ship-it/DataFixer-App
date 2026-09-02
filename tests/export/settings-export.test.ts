import { describe, expect, it } from 'vitest';
import type { RuleSpec } from '../../src/domain/types';
import { parseSettings, serializeSettings } from '../../src/export/settings-export';

const rules: RuleSpec[] = [
  { id: 'trim', kind: 'trim', column: 'name' },
  { id: 'phone', kind: 'regexReplace', column: 'phone', pattern: '[^0-9]+', replacement: '', replaceAll: true, caseInsensitive: false },
  { id: 'shape', kind: 'regex', column: 'email', pattern: '^[^@]+@[^@]+$' },
];

describe('settings JSON', () => {
  it('round trips deterministically', () => {
    const json = serializeSettings(rules);
    expect(parseSettings(json)).toEqual(rules);
    expect(serializeSettings(parseSettings(json))).toBe(json);
  });

  it.each([
    [[{ id: 'x', kind: 'unknown', column: 'a' }]],
    [[{ id: 'same', kind: 'trim', column: 'a' }, { id: 'same', kind: 'trim', column: 'b' }]],
    [[{ id: 'x', kind: 'regex', column: 'a', pattern: '[' }]],
    [[{ id: 'x', kind: 'regexReplace', column: 'a', pattern: '[', replacement: '', replaceAll: true, caseInsensitive: false }]],
    [[{ id: 'x', kind: 'trim', column: 'a', script: 'run()' }]],
    [[{ id: 'x', kind: 'trim', column: 'a', url: 'https://example.com' }]],
    [[{ id: 'x', kind: 'trim', column: 'a', callback: 'run' }]],
  ])('rejects invalid or executable settings %#', (bad) => {
    expect(() => parseSettings(JSON.stringify(bad))).toThrowError('INVALID_RULE');
  });
});
