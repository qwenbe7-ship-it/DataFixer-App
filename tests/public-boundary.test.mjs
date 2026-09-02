import test from 'node:test';
import assert from 'node:assert/strict';
import { findForbiddenPaths } from '../scripts/verify-public-boundary.mjs';

test('rejects internal commercial and secret-bearing paths', () => {
  const forbidden = findForbiddenPaths([
    'src/main.tsx',
    'docs/step-12-product-pricing.md',
    'public/strategy/target.html',
    '.env.production',
    'secrets/private.key',
  ]);
  assert.deepEqual(forbidden, [
    '.env.production',
    'docs/step-12-product-pricing.md',
    'public/strategy/target.html',
    'secrets/private.key',
  ]);
});

test('allows application, test, CI, and safe public example paths', () => {
  assert.deepEqual(findForbiddenPaths([
    '.github/workflows/production-gates.yml',
    'public/examples/clean-orders.csv',
    'scripts/verify.py',
    'src/main.tsx',
    'tests/rules/clean.test.ts',
  ]), []);
});
