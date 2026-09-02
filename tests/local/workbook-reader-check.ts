import { readWorksheet } from '../../src/file-io/workbook-reader';

function equal(actual: unknown, expected: unknown, message: string): void {
  const a=JSON.stringify(actual), e=JSON.stringify(expected); if (a!==e) throw new Error(`${message}: expected ${e}, got ${a}`);
}

async function main() {
  const input = new File(['name\nAlice\n\nCarol\n'], 'people.csv', { type: 'text/csv' });
  const dataset = await readWorksheet(input, 'Sheet1');
  equal(dataset.rows.map((row) => row.rowId), ['people.csv:2', 'people.csv:4'], 'blank CSV row preserves source row number');
  console.log('PASS workbook-reader-check');
}
main().catch((error) => { console.error(error); throw error; });
