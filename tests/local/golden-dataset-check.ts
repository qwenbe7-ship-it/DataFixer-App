import { readFileSync } from 'node:fs';
import { readWorksheet } from '../../src/file-io/workbook-reader';
import { parseJobSettings } from '../../src/export/job-settings';
import { processDatasets } from '../../src/app/process-job';
import { buildHtmlReport } from '../../src/export/html-report';
import type { ProcessingSummary } from '../../src/domain/types';

type GoldenInput = { path: string; name: string; sheet?: string };
type GoldenCase = {
  id: string;
  mode: 'clean' | 'merge' | 'lookup' | 'validate';
  inputs: GoldenInput[];
  settings: string;
  expectedSummary: Omit<ProcessingSummary, 'reconciled'> & { reconciled: true };
  requiredReasonKeys: string[];
};
type GoldenManifest = { version: 1; cases: GoldenCase[] };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function fileFrom(input: GoldenInput): File {
  return new File([readFileSync(input.path, 'utf8')], input.name, { type: 'text/csv' });
}

async function main() {
  const manifest = JSON.parse(readFileSync('tests/golden/manifest.json', 'utf8')) as GoldenManifest;
  assert(manifest.version === 1, 'golden manifest version');
  assert(manifest.cases.length > 0, 'golden manifest must contain cases');
  const ids = new Set<string>();

  for (const entry of manifest.cases) {
    assert(!ids.has(entry.id), `duplicate golden case id: ${entry.id}`);
    ids.add(entry.id);
    const settings = parseJobSettings(readFileSync(entry.settings, 'utf8'));
    assert(settings.mode === entry.mode, `${entry.id}: settings mode matches manifest`);
    const datasets = [];
    for (const input of entry.inputs) {
      datasets.push(await readWorksheet(fileFrom(input), input.sheet ?? 'Sheet1'));
    }
    const result = await processDatasets({
      mode: settings.mode,
      datasets,
      rules: settings.rules,
      mergeSettings: settings.mergeSettings,
      lookupSettings: settings.lookupSettings,
      sourceHash: `golden-${entry.id}`,
    });
    assert(JSON.stringify(result.summary) === JSON.stringify(entry.expectedSummary), `${entry.id}: expected summary`);
    const reasonKeys = new Set(result.evidence.map((item) => item.reasonKey));
    for (const reasonKey of entry.requiredReasonKeys) {
      assert(reasonKeys.has(reasonKey), `${entry.id}: missing evidence reason ${reasonKey}`);
    }
    assert(buildHtmlReport(result, 'en').includes('DataFixer'), `${entry.id}: HTML report builds`);
  }

  console.log(`PASS golden-dataset-check cases=${manifest.cases.length}`);
}

main().catch((error) => { console.error(error); throw error; });
