import { makeDataset, makeRow } from '../../src/domain/factories';
import type { LookupSettings, MergeSettings, RuleSpec } from '../../src/domain/types';
import { processDatasets } from '../../src/app/process-job';
import { buildHtmlReport } from '../../src/export/html-report';
import { buildRejectedWorkbookModel, buildResultWorkbookModel } from '../../src/export/workbook-model';
import { parseJobSettings, serializeJobSettings } from '../../src/export/job-settings';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function cleanScenario() {
  const input = makeDataset(['order_id','customer','amount','date'], [
    makeRow('clean-orders.csv', 2, { order_id: 'A-1001', customer: ' Alice ', amount: null, date: '2026-09-01' }),
    makeRow('clean-orders.csv', 3, { order_id: 'A-1002', customer: 'Bob', amount: null, date: '2026-09-02' }),
    makeRow('clean-orders.csv', 4, { order_id: 'A-1002', customer: 'Bob', amount: null, date: '2026-09-02' }),
    makeRow('clean-orders.csv', 5, { order_id: 'A-1003', customer: 'Carol', amount: 'invalid', date: '2026-09-03' }),
  ], ['clean-orders.csv']);
  const rules: RuleSpec[] = [
    { id: 'trim-customer', kind: 'trim', column: 'customer' },
    { id: 'parse-amount', kind: 'parseNumber', column: 'amount', removeThousandsSeparator: true },
    { id: 'dedupe-order', kind: 'dedupe', columns: ['order_id'] },
  ];
  const result = await processDatasets({ mode: 'clean', datasets: [input], rules, mergeSettings: null, sourceHash: 'clean-source' });
  assert(JSON.stringify(result.summary) === JSON.stringify({ inputRows:4, unchangedRows:1, changedRows:1, removedRows:1, rejectedRows:1, reconciled:true }), 'clean summary');
  assert(buildResultWorkbookModel(result).sheets.map((s) => s.name).join(',') === 'Result,Evidence,Summary', 'clean result workbook model');
  assert(buildRejectedWorkbookModel(result).sheets.map((s) => s.name).join(',') === 'Rejected,Evidence', 'clean rejected workbook model');
  assert(buildHtmlReport(result, 'ko').includes('유효한 숫자로 해석할 수 없어 보류했습니다.'), 'clean Korean reason');
  return result;
}

async function mergeScenario() {
  const north = makeDataset(['order_id','total'], [
    makeRow('merge-north.csv', 2, { order_id: 'N-1001', total: 100 }),
    makeRow('merge-north.csv', 3, { order_id: 'DUP-1', total: 50 }),
  ], ['merge-north.csv']);
  const south = makeDataset(['id','amount_krw'], [
    makeRow('merge-south.csv', 2, { id: 'S-2001', amount_krw: 200 }),
    makeRow('merge-south.csv', 3, { id: 'DUP-1', amount_krw: 50 }),
    makeRow('merge-south.csv', 4, { id: 'BAD-1', amount_krw: 'oops' }),
  ], ['merge-south.csv']);
  const mergeSettings: MergeSettings = {
    columnMapBySource: {
      'merge-north.csv': { order_id: 'id', total: 'amount' },
      'merge-south.csv': { id: 'id', amount_krw: 'amount' },
    },
    outputColumns: ['id','amount','source'],
    sourceColumn: 'source',
    dedupeColumns: ['id'],
  };
  const result = await processDatasets({ mode:'merge', datasets:[north,south], rules:[], mergeSettings, sourceHash:'merge-source' });
  assert(JSON.stringify(result.summary) === JSON.stringify({ inputRows:5, unchangedRows:0, changedRows:3, removedRows:1, rejectedRows:1, reconciled:true }), 'merge summary');
  assert(result.evidence.filter((e) => e.reasonKey === 'merge.mapped').length === 4, 'merge mapping evidence includes accepted and later removed rows');
  assert(result.output.rows.map((r) => r.values.id).join(',') === 'N-1001,DUP-1,S-2001', 'merge stable order');
  assert(result.rejected.rows[0]?.values.amount_krw === 'oops', 'merge rejected preserves original row');
  return { result, mergeSettings };
}



async function lookupScenario() {
  const base = makeDataset(['sku','name'], [
    makeRow('lookup-orders.csv', 2, { sku:'A-1', name:'Alpha' }),
    makeRow('lookup-orders.csv', 3, { sku:'B-2', name:'Beta' }),
    makeRow('lookup-orders.csv', 4, { sku:'C-3', name:'Gamma' }),
  ], ['lookup-orders.csv']);
  const reference = makeDataset(['product_sku','stock','supplier'], [
    makeRow('lookup-inventory.csv', 2, { product_sku:'A-1', stock:10, supplier:'North' }),
    makeRow('lookup-inventory.csv', 3, { product_sku:'B-2', stock:20, supplier:'South' }),
    makeRow('lookup-inventory.csv', 4, { product_sku:'B-2', stock:25, supplier:'Backup' }),
  ], ['lookup-inventory.csv']);
  const lookupSettings: LookupSettings = {
    leftKeyColumns:['sku'], rightKeyColumns:['product_sku'],
    rightValueMap:{ stock:'inventory_stock', supplier:'inventory_supplier' },
  };
  const result = await processDatasets({ mode:'lookup', datasets:[base,reference], rules:[], mergeSettings:null, lookupSettings, sourceHash:'lookup-source' });
  assert(JSON.stringify(result.summary) === JSON.stringify({ inputRows:3, unchangedRows:0, changedRows:1, removedRows:0, rejectedRows:2, reconciled:true }), 'lookup summary');
  assert(result.output.rows[0]?.values.inventory_stock === 10, 'lookup copies exact matched value');
  assert(result.evidence.some((e) => e.reasonKey === 'lookup.multipleMatches'), 'lookup records ambiguous reference match');
  assert(result.evidence.some((e) => e.reasonKey === 'lookup.notFound'), 'lookup records missing reference match');
  assert(buildHtmlReport(result, 'en').includes('single exact reference match'), 'lookup report human reason');
  return { result, lookupSettings };
}

async function validateScenario() {
  const input = makeDataset(['email','age','status','code','min_value','max_value','name'], [
    makeRow('validate-contacts.csv', 2, { email:'valid@example.com', age:30, status:'ACTIVE', code:'AB-001', min_value:1, max_value:2, name:'Alice' }),
    makeRow('validate-contacts.csv', 3, { email:'dup@example.com', age:17, status:'UNKNOWN', code:'BAD', min_value:5, max_value:2, name:'X' }),
    makeRow('validate-contacts.csv', 4, { email:'dup@example.com', age:30, status:'ACTIVE', code:'AB-004', min_value:1, max_value:2, name:'Bob' }),
  ], ['validate-contacts.csv']);
  const rules: RuleSpec[] = [
    { id:'required-email', kind:'required', column:'email' },
    { id:'age-type', kind:'type', column:'age', expected:'number' },
    { id:'unique-email', kind:'unique', columns:['email'] },
    { id:'status-allowed', kind:'allowed', column:'status', values:['ACTIVE','INACTIVE'] },
    { id:'age-range', kind:'numberRange', column:'age', min:18, max:65 },
    { id:'name-length', kind:'length', column:'name', min:2, max:20 },
    { id:'code-shape', kind:'regex', column:'code', pattern:'^AB-\\d{3}$' },
    { id:'min-lte-max', kind:'columnCompare', left:'min_value', operator:'lte', right:'max_value' },
  ];
  const result = await processDatasets({ mode:'validate', datasets:[input], rules, mergeSettings:null, sourceHash:'validate-source' });
  assert(JSON.stringify(result.summary) === JSON.stringify({ inputRows:3, unchangedRows:1, changedRows:0, removedRows:0, rejectedRows:2, reconciled:true }), 'validate summary');
  const row3Reasons = result.evidence.filter((e) => e.rowId === 'validate-contacts.csv:3').map((e) => e.ruleId);
  assert(row3Reasons.length === 6, 'validate retains all applicable reasons on one row');
  assert(row3Reasons.includes('unique-email') && row3Reasons.includes('min-lte-max'), 'validate decisive reasons');
  return { result, rules };
}

async function main() {
  await cleanScenario();
  const { mergeSettings } = await mergeScenario();
  const { rules } = await validateScenario();
  const { lookupSettings } = await lookupScenario();
  const json = serializeJobSettings({ version:1, mode:'validate', rules, mergeSettings:null });
  assert(parseJobSettings(json).rules.length === 8, 'release settings round trip');
  const mergeJson = serializeJobSettings({ version:1, mode:'merge', rules:[], mergeSettings });
  assert(parseJobSettings(mergeJson).mergeSettings?.outputColumns.join(',') === 'id,amount,source', 'merge settings round trip');
  const lookupJson = serializeJobSettings({ version:1, mode:'lookup', rules:[], mergeSettings:null, lookupSettings });
  assert(parseJobSettings(lookupJson).lookupSettings?.rightValueMap.stock === 'inventory_stock', 'lookup settings round trip');
  console.log('PASS release-scenarios-check');
}

main().catch((error) => { console.error(error); throw error; });
