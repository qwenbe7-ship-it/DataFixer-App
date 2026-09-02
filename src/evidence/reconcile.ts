import type { ProcessingSummary, RowStatus } from '../domain/types';

export type StatusCounts = Record<RowStatus, number>;

export function reconcile(inputRows: number, statuses: StatusCounts): ProcessingSummary {
  const unchangedRows = statuses.UNCHANGED;
  const changedRows = statuses.CHANGED;
  const removedRows = statuses.REMOVED;
  const rejectedRows = statuses.REJECTED;
  const total = unchangedRows + changedRows + removedRows + rejectedRows;

  return {
    inputRows,
    unchangedRows,
    changedRows,
    removedRows,
    rejectedRows,
    reconciled: total === inputRows,
  };
}
