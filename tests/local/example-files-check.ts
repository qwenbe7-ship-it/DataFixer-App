import { readFileSync } from 'node:fs';
import { readWorksheet } from '../../src/file-io/workbook-reader';
import { parseJobSettings } from '../../src/export/job-settings';
import { processDatasets } from '../../src/app/process-job';
import { buildHtmlReport } from '../../src/export/html-report';
import { buildRejectedWorkbookModel, buildResultWorkbookModel } from '../../src/export/workbook-model';
import type { Dataset } from '../../src/domain/types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function fileFrom(path: string, name: string): File {
  return new File([readFileSync(path, 'utf8')], name, { type: 'text/csv' });
}

async function dataset(path: string, name: string): Promise<Dataset> {
  return readWorksheet(fileFrom(path, name), 'Sheet1');
}

async function cleanExample() {
  const input = await dataset('public/examples/clean-orders.csv', 'clean-orders.csv');
  const settings = parseJobSettings(readFileSync('public/sales-samples/clean/settings.json', 'utf8'));
  const result = await processDatasets({
    mode: settings.mode,
    datasets: [input],
    rules: settings.rules,
    mergeSettings: settings.mergeSettings,
    lookupSettings: settings.lookupSettings,
    sourceHash: 'example-clean',
  });
  assert(input.rows.length === 4, 'clean actual file row count');
  assert(result.summary.reconciled, 'clean reconciles');
  assert(result.summary.inputRows === 4, 'clean input count');
  assert(result.summary.changedRows === 1 && result.summary.removedRows === 1 && result.summary.rejectedRows === 1 && result.summary.unchangedRows === 1, 'clean status split');
  assert(result.output.rows.some((row) => row.rowId === 'clean-orders.csv:2' && row.values.customer === 'Alice'), 'clean trims actual CSV value');
  assert(result.rejected.rows[0]?.rowId === 'clean-orders.csv:5', 'clean invalid amount keeps original source row');
  assert(buildHtmlReport(result, 'en').includes('Rejected because the value is not a valid number.'), 'clean report explains actual error');
  return result;
}

async function mergeExample() {
  const north = await dataset('public/examples/merge-north.csv', 'merge-north.csv');
  const south = await dataset('public/examples/merge-south.csv', 'merge-south.csv');
  const settings = parseJobSettings(readFileSync('public/sales-samples/merge/settings.json', 'utf8'));
  const result = await processDatasets({
    mode: settings.mode,
    datasets: [north, south],
    rules: settings.rules,
    mergeSettings: settings.mergeSettings,
    lookupSettings: settings.lookupSettings,
    sourceHash: 'example-merge',
  });
  assert(result.summary.reconciled, 'merge reconciles');
  assert(result.summary.inputRows === 5, 'merge actual input count');
  assert(result.output.rows.map((row) => row.values.id).join(',') === 'N-1001,DUP-1,S-2001', 'merge actual output order');
  assert(result.summary.changedRows === 3 && result.summary.removedRows === 1 && result.summary.rejectedRows === 1, 'merge status split');
  assert(result.rejected.rows[0]?.rowId === 'merge-south.csv:4', 'merge bad type preserves actual source row');
  return result;
}

async function lookupExample() {
  const left = await dataset('public/examples/lookup-orders.csv', 'lookup-orders.csv');
  const right = await dataset('public/examples/lookup-inventory.csv', 'lookup-inventory.csv');
  const settings = parseJobSettings(readFileSync('public/examples/lookup-settings.json', 'utf8'));
  const result = await processDatasets({
    mode: settings.mode,
    datasets: [left, right],
    rules: settings.rules,
    mergeSettings: settings.mergeSettings,
    lookupSettings: settings.lookupSettings,
    sourceHash: 'example-lookup',
  });
  assert(result.summary.reconciled, 'lookup reconciles');
  assert(result.summary.inputRows === 3, 'lookup counts base rows only');
  assert(result.summary.changedRows === 1 && result.summary.rejectedRows === 2, 'lookup status split');
  assert(result.output.rows[0]?.values.inventory_stock === '10' || result.output.rows[0]?.values.inventory_stock === 10, 'lookup copies stock from actual file');
  assert(result.rejected.rows.some((row) => row.rowId === 'lookup-orders.csv:3'), 'lookup duplicate key rejected');
  assert(result.rejected.rows.some((row) => row.rowId === 'lookup-orders.csv:4'), 'lookup missing key rejected');
  const provenance = result.evidence.find((entry) => entry.reasonKey === 'lookup.valueAdded');
  assert(provenance?.reasonParams.referenceRowId === 'lookup-inventory.csv:2', 'lookup evidence points to actual reference row');
  return result;
}

async function validateExample() {
  const input = await dataset('public/examples/validate-contacts.csv', 'validate-contacts.csv');
  const settings = parseJobSettings(readFileSync('public/sales-samples/validate/settings.json', 'utf8'));
  const result = await processDatasets({
    mode: settings.mode,
    datasets: [input],
    rules: settings.rules,
    mergeSettings: settings.mergeSettings,
    lookupSettings: settings.lookupSettings,
    sourceHash: 'example-validate',
  });
  assert(result.summary.reconciled, 'validate reconciles');
  assert(result.summary.inputRows === 3, 'validate actual input count');
  assert(result.summary.unchangedRows === 1 && result.summary.rejectedRows === 2, 'validate status split');
  const row3Reasons = result.evidence.filter((entry) => entry.rowId === 'validate-contacts.csv:3');
  assert(row3Reasons.length >= 5, 'validate retains multiple actual error reasons');
  assert(row3Reasons.some((entry) => entry.ruleId === 'unique-email'), 'validate duplicate email reason');
  assert(row3Reasons.some((entry) => entry.ruleId === 'min-lte-max'), 'validate column comparison reason');
  return result;
}


async function patternNormalizeExample() {
  const input = await dataset('public/examples/pattern-normalize.csv', 'pattern-normalize.csv');
  const settings = parseJobSettings(readFileSync('public/examples/pattern-normalize-settings.json', 'utf8'));
  const result = await processDatasets({
    mode: settings.mode,
    datasets: [input],
    rules: settings.rules,
    mergeSettings: settings.mergeSettings,
    lookupSettings: settings.lookupSettings,
    sourceHash: 'example-pattern-normalize',
  });
  assert(result.summary.reconciled, 'pattern normalize reconciles');
  assert(result.summary.inputRows === 3 && result.summary.changedRows === 3 && result.summary.rejectedRows === 0, 'pattern normalize status split');
  assert(result.output.rows[0]?.values.phone === '01012345678', 'phone punctuation removed');
  assert(result.output.rows[0]?.values.sku === 'AB001', 'sku separators removed and uppercased');
  assert(result.output.rows[1]?.values.phone === '01098765432', 'dots removed from phone');
  assert(result.output.rows[2]?.values.sku === 'ZZ003', 'hyphen removed from sku');
  assert(result.evidence.some((entry) => entry.ruleId === 'phone-digits' && entry.reasonKey === 'clean.regexReplaced'), 'pattern normalize evidence recorded');
  assert(buildHtmlReport(result, 'ko').includes('정규식 패턴과 일치한 문자열을 바꿨습니다.'), 'pattern normalize report reason');
  return result;
}


async function fillCoalesceExample() {
  const input = await dataset('public/examples/fill-coalesce.csv', 'fill-coalesce.csv');
  const settings = parseJobSettings(readFileSync('public/examples/fill-coalesce-settings.json', 'utf8'));
  const result = await processDatasets({
    mode: settings.mode,
    datasets: [input],
    rules: settings.rules,
    mergeSettings: settings.mergeSettings,
    lookupSettings: settings.lookupSettings,
    sourceHash: 'example-fill-coalesce',
  });
  assert(result.summary.reconciled, 'fill/coalesce reconciles');
  assert(result.summary.inputRows === 4 && result.summary.changedRows === 3 && result.summary.unchangedRows === 1, 'fill/coalesce status split');
  assert(result.output.rows[0]?.values.country === 'US', 'default fills empty country');
  assert(result.output.rows[0]?.values.phone === '01012345678', 'mobile fills empty phone');
  assert(result.output.rows[1]?.values.country === 'KR', 'existing country is preserved');
  assert(result.output.rows[1]?.values.phone === '021234567', 'existing phone is preserved');
  assert(result.output.rows[2]?.values.phone === '07012345678', 'backup can fill when phone and mobile are empty');
  assert(result.output.rows[3]?.values.country === 'JP' && result.output.rows[3]?.values.phone === '0311112222', 'fully populated row stays unchanged');
  assert(result.evidence.some((entry) => entry.ruleId === 'phone-fallback' && entry.reasonParams.sourceColumn === 'mobile'), 'fallback source is recorded');
  assert(buildHtmlReport(result, 'en').includes('Filled an empty value with the configured default.'), 'fill/coalesce report contains default reason');
  const resultBook = buildResultWorkbookModel(result);
  const resultSheet = resultBook.sheets.find((sheet) => sheet.name === 'Result');
  assert(resultSheet?.rows[1]?.[1] === 'US' && resultSheet?.rows[1]?.[2] === '01012345678', 'result workbook contains filled values');
  const rejectedBook = buildRejectedWorkbookModel(result);
  assert(rejectedBook.sheets[0]?.rows.length === 1, 'no rejected rows leaves header-only rejected sheet');
  return result;
}

async function main() {
  const results = [await cleanExample(), await mergeExample(), await lookupExample(), await validateExample(), await patternNormalizeExample(), await fillCoalesceExample()];
  for (const result of results) {
    assert(buildResultWorkbookModel(result).sheets.length === 3, 'result workbook model has 3 sheets');
    assert(buildRejectedWorkbookModel(result).sheets.length === 2, 'rejected workbook model has 2 sheets');
    assert(result.summary.inputRows === result.summary.unchangedRows + result.summary.changedRows + result.summary.removedRows + result.summary.rejectedRows, 'row invariant');
  }
  console.log('PASS example-files-check');
}

main().catch((error) => { console.error(error); throw error; });
