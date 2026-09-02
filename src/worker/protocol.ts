import type { DataFixerErrorCode } from '../domain/errors';
import type { LookupSettings, MergeSettings, ProcessingResult, RuleSpec } from '../domain/types';

export type WorkerPhase = 'parse' | 'process' | 'export';

export interface WorkerRequest {
  jobId: string;
  mode: 'clean' | 'merge' | 'lookup' | 'validate';
  files: Array<{ name: string; bytes: ArrayBuffer; sheetName: string }>;
  rules: RuleSpec[];
  mergeSettings?: MergeSettings;
  lookupSettings?: LookupSettings;
  locale: 'ko' | 'en';
}

export interface WorkerProgress {
  jobId: string;
  type: 'progress';
  phase: WorkerPhase;
  completed: number;
  total: number;
}

export interface WorkerSuccess {
  jobId: string;
  type: 'success';
  result: ProcessingResult;
  resultXlsx: Uint8Array;
  rejectedXlsx: Uint8Array;
  reportHtml: string;
  settingsJson: string;
}

export interface WorkerError {
  jobId: string;
  type: 'error';
  code: DataFixerErrorCode;
  details: Record<string, string | number>;
}

export type WorkerResponse = WorkerProgress | WorkerSuccess | WorkerError;
