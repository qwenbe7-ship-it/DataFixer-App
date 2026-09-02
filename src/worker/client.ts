import { DataFixerError } from '../domain/errors';
import type { WorkerProgress, WorkerRequest, WorkerResponse, WorkerSuccess } from './protocol';

export interface WorkerLike {
  postMessage(message: WorkerRequest, options?: StructuredSerializeOptions): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void;
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void;
  removeEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
}

export function runWorkerRequest(
  worker: WorkerLike,
  request: WorkerRequest,
  onProgress: (event: WorkerProgress) => void = () => {},
): Promise<WorkerSuccess> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    };
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.jobId !== request.jobId) return;
      if (response.type === 'progress') {
        onProgress(response);
        return;
      }
      cleanup();
      if (response.type === 'error') {
        reject(new DataFixerError(response.code, response.details));
        return;
      }
      resolve(response);
    };
    const onError = (event: ErrorEvent) => {
      cleanup();
      reject(new DataFixerError('PARSE_FAILED', { issue: 'worker-crash', message: event.message || 'worker error' }));
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage(request, { transfer: request.files.map((file) => file.bytes) });
  });
}
