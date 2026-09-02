import { DataFixerError } from '../domain/errors';
import type { Dataset } from '../domain/types';
import { sha256Bytes, sha256Canonical } from '../evidence/hash';
import { buildHtmlReport } from '../export/html-report';
import { serializeJobSettings } from '../export/job-settings';
import { buildRejectedWorkbook, buildResultWorkbook } from '../export/xlsx-export';
import { assertJobLimits } from '../file-io/limits';
import { readWorksheet } from '../file-io/workbook-reader';
import { processDatasets } from '../app/process-job';
import type { WorkerError, WorkerProgress, WorkerRequest, WorkerResponse, WorkerSuccess } from './protocol';
import { buildSourceIdentityDescriptor } from './source-identity';
import type { SourceIdentityPart } from './source-identity';

export type ProgressSink = (event: WorkerProgress) => void;

function emitProgress(request: WorkerRequest, sink: ProgressSink, phase: WorkerProgress['phase'], completed: number, total: number): void {
  sink({ jobId: request.jobId, type: 'progress', phase, completed, total });
}

async function sourceHash(request: WorkerRequest): Promise<string> {
  const parts: SourceIdentityPart[] = [];
  for (const file of request.files) {
    parts.push({
      name: file.name,
      bytes: file.bytes.byteLength,
      hash: await sha256Bytes(file.bytes),
      sheetName: file.sheetName,
    });
  }
  return sha256Canonical(buildSourceIdentityDescriptor(parts));
}

function requestFiles(request: WorkerRequest): File[] {
  return request.files.map((item) => new File([item.bytes], item.name));
}

async function parseDatasets(request: WorkerRequest, sink: ProgressSink): Promise<Dataset[]> {
  const files = requestFiles(request);
  assertJobLimits(files);
  emitProgress(request, sink, 'parse', 0, files.length);
  const datasets: Dataset[] = [];
  for (let index = 0; index < files.length; index += 1) {
    datasets.push(await readWorksheet(files[index], request.files[index].sheetName));
    emitProgress(request, sink, 'parse', index + 1, files.length);
  }
  return datasets;
}

export async function runWorkerJob(request: WorkerRequest, sink: ProgressSink = () => {}): Promise<WorkerSuccess> {
  const datasets = await parseDatasets(request, sink);
  const hash = await sourceHash(request);
  emitProgress(request, sink, 'process', 0, 1);
  const result = await processDatasets({
    mode: request.mode,
    datasets,
    rules: request.rules,
    mergeSettings: request.mergeSettings ?? null,
    lookupSettings: request.lookupSettings ?? null,
    sourceHash: hash,
  });
  emitProgress(request, sink, 'process', 1, 1);

  emitProgress(request, sink, 'export', 0, 4);
  const resultXlsx = buildResultWorkbook(result);
  emitProgress(request, sink, 'export', 1, 4);
  const rejectedXlsx = buildRejectedWorkbook(result);
  emitProgress(request, sink, 'export', 2, 4);
  const reportHtml = buildHtmlReport(result, request.locale);
  emitProgress(request, sink, 'export', 3, 4);
  const settingsJson = serializeJobSettings({
    version: 1,
    mode: request.mode,
    rules: request.mode === 'merge' || request.mode === 'lookup' ? [] : request.rules,
    mergeSettings: request.mode === 'merge' ? request.mergeSettings ?? null : null,
    ...(request.mode === 'lookup' ? { lookupSettings: request.lookupSettings ?? null } : {}),
  });
  emitProgress(request, sink, 'export', 4, 4);

  return { jobId: request.jobId, type: 'success', result, resultXlsx, rejectedXlsx, reportHtml, settingsJson };
}

function asWorkerError(request: WorkerRequest, error: unknown): WorkerError {
  if (error instanceof DataFixerError) {
    return { jobId: request.jobId, type: 'error', code: error.code, details: { ...error.details } };
  }
  return {
    jobId: request.jobId,
    type: 'error',
    code: 'PARSE_FAILED',
    details: { message: error instanceof Error ? error.message : String(error) },
  };
}

export async function runWorkerJobSafe(request: WorkerRequest, sink: ProgressSink = () => {}): Promise<WorkerSuccess | WorkerError> {
  try {
    return await runWorkerJob(request, sink);
  } catch (error) {
    return asWorkerError(request, error);
  }
}

function postResponse(response: WorkerResponse): void {
  if (typeof globalThis.postMessage !== 'function') return;
  if (response.type === 'success') {
    globalThis.postMessage(response, { transfer: [response.resultXlsx.buffer as ArrayBuffer, response.rejectedXlsx.buffer as ArrayBuffer] });
    return;
  }
  globalThis.postMessage(response);
}

if (typeof globalThis.addEventListener === 'function' && typeof globalThis.postMessage === 'function') {
  globalThis.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
    const request = event.data;
    void runWorkerJobSafe(request, postResponse).then(postResponse);
  });
}
