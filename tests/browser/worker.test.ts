import { expect, test } from 'vitest';
import { createDataWorker } from '../../src/worker/browser-worker';
import { runWorkerRequest } from '../../src/worker/client';
import { buildWorkerRequest } from '../../src/worker/request';
import { MAX_FILE_BYTES, MAX_JOB_BYTES, assertJobLimits } from '../../src/file-io/limits';

test('worker completes a clean job with ordered progress and four artifacts', async () => {
  const worker = createDataWorker();
  try {
    const request = await buildWorkerRequest({
      jobId: crypto.randomUUID(),
      mode: 'clean',
      files: [new File(['name\n Alice \nBob\n'], 'people.csv', { type: 'text/csv' })],
      selectedSheets: { 'people.csv': 'Sheet1' },
      rules: [{ id: 'trim-name', kind: 'trim', column: 'name' }],
      mergeSettings: null,
      locale: 'en',
    });
    const phases: string[] = [];
    const success = await runWorkerRequest(worker, request, (event) => phases.push(event.phase));
    expect(success.result.summary.reconciled).toBe(true);
    expect(success.result.output.rows[0].values.name).toBe('Alice');
    expect(success.resultXlsx.byteLength).toBeGreaterThan(0);
    expect(success.rejectedXlsx.byteLength).toBeGreaterThan(0);
    expect(success.reportHtml).toContain('DataFixer');
    expect(success.settingsJson).toContain('trim-name');
    expect(phases[0]).toBe('parse');
    expect(phases.at(-1)).toBe('export');
  } finally {
    worker.terminate();
  }
});

test('exact file and job byte boundaries are accepted', () => {
  expect(() => assertJobLimits([new File([new Uint8Array(MAX_FILE_BYTES)], 'edge.csv')])).not.toThrow();
  const tenFiles = Array.from({ length: 10 }, (_, index) =>
    new File([new Uint8Array(MAX_JOB_BYTES / 10)], `edge-${index}.csv`),
  );
  expect(() => assertJobLimits(tenFiles)).not.toThrow();
  expect(() => assertJobLimits([new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'too-big.csv')])).toThrowError('FILE_TOO_LARGE');
});
