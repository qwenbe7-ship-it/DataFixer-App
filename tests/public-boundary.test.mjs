import test from 'node:test';
import assert from 'node:assert/strict';
import { findForbiddenContent, findForbiddenPaths } from '../scripts/verify-public-boundary.mjs';

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

test('rejects internal commercial language and high-confidence credentials in tracked text', () => {
  const channel = ['Fiv', 'err'].join('');
  const founding = ['Founding', 'customer'].join(' ');
  const githubToken = ['github_', 'pat_', '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop'].join('');
  const privateKey = ['-----BEGIN ', 'PRIVATE KEY-----', '\nredacted\n', '-----END PRIVATE KEY-----'].join('');
  const findings = findForbiddenContent([
    { path: 'docs/notes.md', content: `Primary channel: ${channel}. ${founding} price is $${29}.` },
    { path: 'src/config.ts', content: `const token = '${githubToken}';` },
    { path: 'docs/key.txt', content: privateKey },
  ]);

  assert.deepEqual(findings.map(({ path, rule }) => ({ path, rule })), [
    { path: 'docs/key.txt', rule: 'private-key' },
    { path: 'docs/notes.md', rule: 'commercial-strategy' },
    { path: 'src/config.ts', rule: 'github-token' },
  ]);
});

test('policy definition files are exempt only from commercial self-matches', () => {
  const channel = ['Fiv', 'err'].join('');
  const githubToken = ['github_', 'pat_', '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop'].join('');
  const findings = findForbiddenContent([
    { path: 'scripts/verify-public-boundary.mjs', content: `blocked label ${channel}` },
    { path: 'tests/public-boundary.test.mjs', content: `fixture ${channel}; token ${githubToken}` },
  ]);

  assert.deepEqual(findings.map(({ path, rule }) => ({ path, rule })), [
    { path: 'tests/public-boundary.test.mjs', rule: 'github-token' },
  ]);
});

test('allows public product documentation and obvious examples', () => {
  assert.deepEqual(findForbiddenContent([
    { path: 'README.md', content: 'Internal commercial strategy is intentionally kept outside this repository.' },
    { path: 'public/examples/sample.csv', content: 'email\nvalid@example.com\n' },
    { path: 'docs/security.md', content: 'Never commit credentials or private keys.' },
  ]), []);
});
