import { describe, expect, it } from 'vitest';
import { en, ko } from '../../src/i18n';

function params(template: string): string[] {
  return [...template.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

describe('bilingual dictionary contract', () => {
  it('keeps Korean and English keys and interpolation parameters identical', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ko).sort());
    for (const key of Object.keys(ko) as Array<keyof typeof ko>) {
      expect(params(en[key])).toEqual(params(ko[key]));
    }
  });
});
