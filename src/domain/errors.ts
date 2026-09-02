export type DataFixerErrorCode =
  | 'EMPTY_FILE'
  | 'UNSUPPORTED_FILE'
  | 'FILE_TOO_LARGE'
  | 'JOB_TOO_LARGE'
  | 'TOO_MANY_FILES'
  | 'DUPLICATE_SOURCE_NAME'
  | 'MISSING_COLUMN'
  | 'INVALID_RULE'
  | 'PARSE_FAILED'
  | 'EXPORT_FAILED'
  | 'RECONCILIATION_FAILED';

export class DataFixerError extends Error {
  constructor(
    public readonly code: DataFixerErrorCode,
    public readonly details: Record<string, string | number> = {},
  ) {
    super(code);
    this.name = 'DataFixerError';
  }
}
