import { DataFixerError } from '../../src/domain/errors';
import { runWorkerJob, runWorkerJobSafe } from '../../src/worker/data.worker';
import type { WorkerProgress, WorkerRequest } from '../../src/worker/protocol';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const csv = new TextEncoder().encode('name\n Alice \nBob\n');
const request: WorkerRequest = {
  jobId: 'job-1',
  mode: 'clean',
  files: [{ name: 'people.csv', bytes: csv.buffer.slice(0), sheetName: 'Sheet1' }],
  rules: [{ id: 'trim-name', kind: 'trim', column: 'name' }],
  locale: 'en',
};

async function main(): Promise<void> {
  const progress: WorkerProgress[] = [];
  const success = await runWorkerJob(request, (event) => progress.push(event));
  assert(success.type === 'success', 'worker returns success');
  assert(success.result.summary.reconciled, 'worker result reconciles');
  assert(success.result.output.rows[0].values.name === 'Alice', 'worker processes clean rule');
  assert(success.resultXlsx.byteLength > 0 && success.rejectedXlsx.byteLength > 0, 'worker builds xlsx bytes');
  assert(success.reportHtml.includes('DataFixer'), 'worker builds html report');
  assert(success.settingsJson.includes('trim-name'), 'worker builds reusable settings');
  assert(!success.settingsJson.includes('lookupSettings'), 'existing clean settings JSON stays stable after lookup mode is added');
  assert(progress.map((event) => event.phase).join(',').startsWith('parse,parse,process,process,export'), 'worker progress is ordered');



  const lookupLeft = new TextEncoder().encode('sku,name\nA,Alpha\nB,Beta\n');
  const lookupRight = new TextEncoder().encode('sku,stock\nA,10\n');
  const lookupRequest: WorkerRequest = {
    jobId: 'lookup-job',
    mode: 'lookup',
    files: [
      { name: 'orders.csv', bytes: lookupLeft.buffer.slice(0), sheetName: 'Sheet1' },
      { name: 'inventory.csv', bytes: lookupRight.buffer.slice(0), sheetName: 'Sheet1' },
    ],
    rules: [],
    lookupSettings: { leftKeyColumns: ['sku'], rightKeyColumns: ['sku'], rightValueMap: { stock: 'inventory_stock' } },
    locale: 'en',
  };
  const lookupSuccess = await runWorkerJob(lookupRequest);
  assert(lookupSuccess.result.summary.inputRows === 2 && lookupSuccess.result.summary.changedRows === 1 && lookupSuccess.result.summary.rejectedRows === 1, 'worker runs lookup mode');
  assert(lookupSuccess.settingsJson.includes('lookupSettings') && lookupSuccess.settingsJson.includes('inventory_stock'), 'worker exports lookup settings');

  const badRequest: WorkerRequest = {
    ...request,
    jobId: 'job-bad',
    files: [{ name: 'bad.xlsx', bytes: new Uint8Array([1, 2, 3]).buffer, sheetName: 'Sheet1' }],
  };
  const error = await runWorkerJobSafe(badRequest);
  assert(error.type === 'error', 'malformed workbook becomes structured error');
  assert(error.code === 'PARSE_FAILED', 'malformed workbook reports PARSE_FAILED');
  assert(error.jobId === 'job-bad', 'error preserves job id');

  let wrongModeRejected = false;
  try {
    await runWorkerJob({ ...request, rules: [{ id: 'required-name', kind: 'required', column: 'name' }] });
  } catch (error) {
    wrongModeRejected = error instanceof DataFixerError && error.code === 'INVALID_RULE';
  }
  assert(wrongModeRejected, 'worker rejects wrong-mode rules');

  console.log('PASS worker-check');
}

main().catch((error) => { console.error(error); throw error; });
