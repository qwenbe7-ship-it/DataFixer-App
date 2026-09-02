import { DataFixerError } from '../../src/domain/errors';
import { buildWorkerRequest } from '../../src/worker/request';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

async function main(): Promise<void> {
  const files = [new File(['a'], 'a.csv'), new File(['b'], 'b.csv')];
  const request = await buildWorkerRequest({
    jobId: 'job', mode: 'merge', files,
    selectedSheets: { 'a.csv': 'Sheet1', 'b.csv': 'Sheet2' },
    rules: [], mergeSettings: { columnMapBySource: {}, outputColumns: ['id'], dedupeColumns: [] }, locale: 'ko',
  });
  assert(request.files.map((file) => file.name).join(',') === 'a.csv,b.csv', 'request preserves file order');
  assert(request.files[1].sheetName === 'Sheet2', 'request preserves selected sheets');
  assert(request.files[0].bytes.byteLength === 1, 'request includes file bytes');



  const lookupRequest = await buildWorkerRequest({
    jobId: 'lookup-job', mode: 'lookup', files,
    selectedSheets: { 'a.csv': 'Sheet1', 'b.csv': 'Sheet2' },
    rules: [], mergeSettings: null,
    lookupSettings: { leftKeyColumns: ['id'], rightKeyColumns: ['id'], rightValueMap: { stock: 'inventory_stock' } },
    locale: 'en',
  });
  assert(lookupRequest.mode === 'lookup' && lookupRequest.lookupSettings?.rightValueMap.stock === 'inventory_stock', 'request carries lookup settings');

  let missingSheet = false;
  try {
    await buildWorkerRequest({ jobId: 'bad', mode: 'clean', files: [files[0]], selectedSheets: {}, rules: [], mergeSettings: null, locale: 'en' });
  } catch (error) { missingSheet = error instanceof DataFixerError && error.code === 'PARSE_FAILED'; }
  assert(missingSheet, 'request rejects missing sheet selection');
  console.log('PASS worker-request-check');
}
main().catch((error) => { console.error(error); throw error; });
