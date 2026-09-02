import { buildDownloadFileName } from '../../src/export/download';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(buildDownloadFileName('result', 'xlsx') === 'datafixer-result.xlsx', 'standard result filename');
assert(buildDownloadFileName('rejected rows', 'xlsx') === 'datafixer-rejected_rows.xlsx', 'spaces sanitized');
assert(buildDownloadFileName('../evil<script>', 'html') === 'datafixer-.._evil_script_.html', 'unsafe filename characters sanitized');
assert(/^[A-Za-z0-9._-]+$/.test(buildDownloadFileName('보고서', 'html')), 'filename whitelist only');
assert(buildDownloadFileName('orders.csv', 'xlsx') !== 'orders.csv', 'never reuse source filename unchanged');

console.log('PASS download-check');
