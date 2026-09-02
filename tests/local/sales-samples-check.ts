import { readFileSync } from 'node:fs';
import { parseJobSettings } from '../../src/export/job-settings';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const read = (path: string) => readFileSync(path, 'utf8');
const clean = parseJobSettings(read('public/sales-samples/clean/settings.json'));
const merge = parseJobSettings(read('public/sales-samples/merge/settings.json'));
const validate = parseJobSettings(read('public/sales-samples/validate/settings.json'));

assert(clean.mode === 'clean', 'clean sample settings mode');
assert(merge.mode === 'merge', 'merge sample settings mode');
assert(validate.mode === 'validate', 'validate sample settings mode');
assert(read('public/sales-samples/clean/result-preview.csv').trim().split('\n').length === 3, 'clean result has header + two output rows');
assert(read('public/sales-samples/merge/result-preview.csv').includes('S-2001,200,merge-south.csv'), 'merge result preview');
assert(read('public/sales-samples/validate/rejected-preview.csv').includes('dup@example.com,17,UNKNOWN,BAD,5,2,X,6'), 'validate rejected preview');
assert(!/\b(?!valid@|dup@)[A-Za-z0-9._%+-]+@(?!example\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(read('public/sales-samples/validate/before.csv')), 'no non-example email data');
console.log('PASS sales-samples-check');
