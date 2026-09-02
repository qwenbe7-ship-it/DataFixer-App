import { describe, expect, it } from 'vitest';
import { assertJobLimits, MAX_FILE_BYTES, MAX_JOB_BYTES, MAX_JOB_FILES } from '../../src/file-io/limits';

const file = (name: string, bytes: number) => new File([new Uint8Array(bytes)], name);

describe('assertJobLimits', () => {
  it('uses the exact V1 limits', () => {
    expect(MAX_FILE_BYTES).toBe(20 * 1024 * 1024);
    expect(MAX_JOB_BYTES).toBe(50 * 1024 * 1024);
    expect(MAX_JOB_FILES).toBe(10);
  });

  it('rejects a file larger than 20 MiB', () => {
    expect(() => assertJobLimits([file('large.csv', MAX_FILE_BYTES + 1)])).toThrowError('FILE_TOO_LARGE');
  });

  it('accepts a file exactly 20 MiB', () => {
    expect(() => assertJobLimits([file('edge.csv', MAX_FILE_BYTES)])).not.toThrow();
  });

  it('rejects a job larger than 50 MiB', () => {
    expect(() => assertJobLimits([
      file('a.csv', MAX_FILE_BYTES),
      file('b.csv', MAX_FILE_BYTES),
      file('c.csv', 10 * 1024 * 1024 + 1),
    ])).toThrowError('JOB_TOO_LARGE');
  });

  it('rejects eleven files', () => {
    expect(() => assertJobLimits(Array.from({ length: 11 }, (_, index) => file(`${index}.csv`, 1))))
      .toThrowError('TOO_MANY_FILES');
  });

  it('rejects duplicate source names', () => {
    expect(() => assertJobLimits([file('orders.csv', 1), file('orders.csv', 1)]))
      .toThrowError('DUPLICATE_SOURCE_NAME');
  });
});
