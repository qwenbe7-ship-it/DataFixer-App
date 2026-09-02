import { DataFixerError } from '../domain/errors';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_JOB_BYTES = 50 * 1024 * 1024;
export const MAX_JOB_FILES = 10;

export function assertJobLimits(files: File[]): void {
  if (files.length > MAX_JOB_FILES) {
    throw new DataFixerError('TOO_MANY_FILES', { count: files.length });
  }

  const seen = new Set<string>();
  for (const file of files) {
    if (seen.has(file.name)) {
      throw new DataFixerError('DUPLICATE_SOURCE_NAME', { file: file.name });
    }
    seen.add(file.name);
  }

  const oversized = files.find((file) => file.size > MAX_FILE_BYTES);
  if (oversized) {
    throw new DataFixerError('FILE_TOO_LARGE', { file: oversized.name, bytes: oversized.size });
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_JOB_BYTES) {
    throw new DataFixerError('JOB_TOO_LARGE', { bytes: totalBytes });
  }
}
