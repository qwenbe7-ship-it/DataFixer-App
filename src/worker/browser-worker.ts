export function createDataWorker(): Worker {
  return new Worker(new URL('./data.worker.ts', import.meta.url), { type: 'module' });
}
