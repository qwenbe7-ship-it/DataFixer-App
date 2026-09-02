import { DataFixerError } from '../domain/errors';
import type { LookupSettings, MergeSettings, RuleSpec } from '../domain/types';
import type { AppMode, AppLocale } from '../app/app-reducer';
import type { WorkerRequest } from './protocol';

export interface BuildWorkerRequestInput {
  jobId: string;
  mode: AppMode;
  files: File[];
  selectedSheets: Record<string, string>;
  rules: RuleSpec[];
  mergeSettings: MergeSettings | null;
  lookupSettings?: LookupSettings | null;
  locale: AppLocale;
}

export async function buildWorkerRequest(input: BuildWorkerRequestInput): Promise<WorkerRequest> {
  const files: WorkerRequest['files'] = [];
  for (const file of input.files) {
    const sheetName = input.selectedSheets[file.name]?.trim();
    if (!sheetName) throw new DataFixerError('PARSE_FAILED', { file: file.name, issue: 'sheet-required' });
    files.push({ name: file.name, bytes: await file.arrayBuffer(), sheetName });
  }
  return {
    jobId: input.jobId,
    mode: input.mode,
    files,
    rules: [...input.rules],
    ...(input.mergeSettings ? { mergeSettings: input.mergeSettings } : {}),
    ...(input.lookupSettings ? { lookupSettings: input.lookupSettings } : {}),
    locale: input.locale,
  };
}
