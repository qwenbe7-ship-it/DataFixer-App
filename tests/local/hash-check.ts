import { sha256Bytes, sha256Canonical } from '../../src/evidence/hash';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const abc = new TextEncoder().encode('abc');
  const byteHash = await sha256Bytes(abc.buffer);
  assert(byteHash === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'known SHA-256 vector');

  const first = { b: 2, a: 1, nested: { z: true, y: 'x' } };
  const second = { nested: { y: 'x', z: true }, a: 1, b: 2 };
  assert(await sha256Canonical(first) === await sha256Canonical(second), 'object key insertion order does not change hash');

  const rules1 = [{ id: 'trim' }, { id: 'lower' }];
  const rules2 = [{ id: 'lower' }, { id: 'trim' }];
  assert(await sha256Canonical(rules1) !== await sha256Canonical(rules2), 'array/rule order changes hash');

  console.log('PASS hash-check');
}

void main();
