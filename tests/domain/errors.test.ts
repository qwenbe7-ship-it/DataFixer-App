import { describe, expect, it } from 'vitest';
import { DataFixerError } from '../../src/domain/errors';

describe('DataFixerError', () => {
  it('preserves a stable error code and structured details', () => {
    const error = new DataFixerError('FILE_TOO_LARGE', { file: 'large.csv', bytes: 42 });
    expect(error.name).toBe('DataFixerError');
    expect(error.message).toBe('FILE_TOO_LARGE');
    expect(error.code).toBe('FILE_TOO_LARGE');
    expect(error.details).toEqual({ file: 'large.csv', bytes: 42 });
  });
});
