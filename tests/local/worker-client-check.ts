import { DataFixerError } from '../../src/domain/errors';
import { runWorkerRequest, type WorkerLike } from '../../src/worker/client';
import type { WorkerRequest, WorkerResponse } from '../../src/worker/protocol';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

class FakeWorker implements WorkerLike {
  posted: { message: WorkerRequest; transfer: Transferable[] } | null = null;
  private messageListeners = new Set<(event: MessageEvent<WorkerResponse>) => void>();
  private errorListeners = new Set<(event: ErrorEvent) => void>();
  postMessage(message: WorkerRequest, options?: StructuredSerializeOptions): void {
    this.posted = { message, transfer: options?.transfer ? [...options.transfer] : [] };
  }
  addEventListener(type: 'message' | 'error', listener: ((event: MessageEvent<WorkerResponse>) => void) | ((event: ErrorEvent) => void)): void {
    if (type === 'message') this.messageListeners.add(listener as (event: MessageEvent<WorkerResponse>) => void);
    else this.errorListeners.add(listener as (event: ErrorEvent) => void);
  }
  removeEventListener(type: 'message' | 'error', listener: ((event: MessageEvent<WorkerResponse>) => void) | ((event: ErrorEvent) => void)): void {
    if (type === 'message') this.messageListeners.delete(listener as (event: MessageEvent<WorkerResponse>) => void);
    else this.errorListeners.delete(listener as (event: ErrorEvent) => void);
  }
  emit(response: WorkerResponse): void { for (const listener of this.messageListeners) listener({ data: response } as MessageEvent<WorkerResponse>); }
}

const bytes = new Uint8Array([1,2,3]).buffer;
const request: WorkerRequest = { jobId: 'j1', mode: 'clean', files: [{ name: 'a.csv', bytes, sheetName: 'Sheet1' }], rules: [], locale: 'ko' };

async function main(): Promise<void> {
  const worker = new FakeWorker();
  const progress: string[] = [];
  const promise = runWorkerRequest(worker, request, (event) => progress.push(`${event.phase}:${event.completed}`));
  assert(worker.posted?.transfer.length === 1, 'client transfers file buffers');
  worker.emit({ jobId: 'other', type: 'progress', phase: 'parse', completed: 1, total: 1 });
  worker.emit({ jobId: 'j1', type: 'progress', phase: 'parse', completed: 1, total: 1 });
  worker.emit({ jobId: 'j1', type: 'success', result: {} as never, resultXlsx: new Uint8Array([1]), rejectedXlsx: new Uint8Array([2]), reportHtml: 'x', settingsJson: '{}' });
  const success = await promise;
  assert(success.jobId === 'j1', 'client resolves matching success');
  assert(progress.join(',') === 'parse:1', 'client ignores other job messages');

  const worker2 = new FakeWorker();
  const failed = runWorkerRequest(worker2, { ...request, jobId: 'j2', files: [] });
  worker2.emit({ jobId: 'j2', type: 'error', code: 'PARSE_FAILED', details: { file: 'bad.xlsx' } });
  let structured = false;
  try { await failed; } catch (error) { structured = error instanceof DataFixerError && error.code === 'PARSE_FAILED'; }
  assert(structured, 'client converts worker errors to DataFixerError');
  console.log('PASS worker-client-check');
}
main().catch((error) => { console.error(error); throw error; });
