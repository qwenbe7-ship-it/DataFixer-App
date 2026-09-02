import { describe, expect, it } from 'vitest';
import { sha256Canonical } from '../../src/evidence/hash';
import { generateCleanDataset, generateMergeDatasets, generateValidateDataset } from './fixtures';

describe('performance fixtures', () => {
  it('generates identical clean rows for the same seed', () => {
    expect(generateCleanDataset(25, 101)).toEqual(generateCleanDataset(25, 101));
  });

  it('keeps the canonical clean fixture stable', async () => {
    const sample = generateCleanDataset(100, 101).rows;
    await expect(sha256Canonical(sample)).resolves.toBe('a88734e177dc71d5693773f17cc2ee8edea66fcc2cb1d94be9055e533ba5217e');
  });

  it('generates deterministic merge and validation datasets', () => {
    expect(generateMergeDatasets(30, 201)).toEqual(generateMergeDatasets(30, 201));
    expect(generateValidateDataset(30, 301)).toEqual(generateValidateDataset(30, 301));
  });
});
