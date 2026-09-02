import { assertJobLimits, MAX_FILE_BYTES, MAX_JOB_BYTES, MAX_JOB_FILES } from '../../src/file-io/limits';

function equal(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}
function noThrow(fn: () => void, message: string): void {
  try { fn(); } catch (error) { throw new Error(`${message}: ${String(error)}`, { cause: error }); }
}
const file = (name: string, bytes: number) => new File([new Uint8Array(bytes)], name);
const code = (fn: () => void) => {
  try { fn(); return null; } catch (error) { return error instanceof Error ? error.message : String(error); }
};

equal(MAX_FILE_BYTES, 20 * 1024 * 1024, 'file byte limit');
equal(MAX_JOB_BYTES, 50 * 1024 * 1024, 'job byte limit');
equal(MAX_JOB_FILES, 10, 'file count limit');
equal(code(() => assertJobLimits([file('large.csv', MAX_FILE_BYTES + 1)])), 'FILE_TOO_LARGE', 'oversized file');
equal(code(() => assertJobLimits([
  file('a.csv', MAX_FILE_BYTES), file('b.csv', MAX_FILE_BYTES), file('c.csv', 10 * 1024 * 1024 + 1),
])), 'JOB_TOO_LARGE', 'oversized job');
equal(code(() => assertJobLimits(Array.from({ length: 11 }, (_, i) => file(`${i}.csv`, 1)))), 'TOO_MANY_FILES', 'too many files');
equal(code(() => assertJobLimits([file('orders.csv', 1), file('orders.csv', 1)])), 'DUPLICATE_SOURCE_NAME', 'duplicate names');
noThrow(() => assertJobLimits([file('edge.csv', MAX_FILE_BYTES)]), 'exact 20MiB should pass');
noThrow(() => assertJobLimits(Array.from({ length: 10 }, (_, i) => file(`edge-${i}.csv`, 5 * 1024 * 1024))), 'exact 50MiB across 10 files should pass');
console.log('PASS limits-check');
