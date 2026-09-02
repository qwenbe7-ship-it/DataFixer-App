import { describe, expect, it } from 'vitest';
import { sha256Bytes, sha256Canonical } from '../../src/evidence/hash';

describe('deterministic hashes', () => {
  it('matches a known SHA-256 byte vector', async () => {
    const bytes = new TextEncoder().encode('abc');
    await expect(sha256Bytes(bytes.buffer)).resolves.toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('canonicalizes object key order but preserves array order', async () => {
    await expect(sha256Canonical({ b: 2, a: 1, nested: { z: true, y: 'x' } }))
      .resolves.toBe(await sha256Canonical({ nested: { y: 'x', z: true }, a: 1, b: 2 }));
    await expect(sha256Canonical([{ id: 'trim' }, { id: 'lower' }]))
      .resolves.not.toBe(await sha256Canonical([{ id: 'lower' }, { id: 'trim' }]));
  });
});
