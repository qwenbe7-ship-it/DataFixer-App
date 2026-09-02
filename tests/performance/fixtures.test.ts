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

  it('keeps the complete benchmark fixture fingerprint stable', async () => {
    const sample = {
      clean: generateCleanDataset(100, 101).rows,
      merge: generateMergeDatasets(100, 201).map((dataset) => dataset.rows),
      validate: generateValidateDataset(100, 301).rows,
    };
    await expect(sha256Canonical(sample)).resolves.toBe('2b82f7dd0f9ecd58e9d20fdbc31f0a1a855f7bf9ebbae89f7213060255db2810');
  });

  it('generates deterministic merge and validation datasets', () => {
    expect(generateMergeDatasets(30, 201)).toEqual(generateMergeDatasets(30, 201));
    expect(generateValidateDataset(30, 301)).toEqual(generateValidateDataset(30, 301));
  });

  it('keeps merge fixtures representative with both overlap and misses', () => {
    const [left, right] = generateMergeDatasets(100, 201);
    const leftKeys = new Set(left.rows.map((item) => item.values.id));
    const rightKeys = right.rows.map((item) => item.values.id);

    expect(rightKeys.some((key) => leftKeys.has(key))).toBe(true);
    expect(rightKeys.some((key) => !leftKeys.has(key))).toBe(true);
    expect(new Set([...left.rows.map((item) => item.values.id), ...rightKeys]).size)
      .toBeLessThan(left.rows.length + right.rows.length);
  });
});
