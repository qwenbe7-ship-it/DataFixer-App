import { expect, test } from '@playwright/test';
import * as XLSX from 'xlsx';

function workbookBuffer(rows: unknown[][]): Buffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
  return Buffer.from(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
}

test('Merge maps schemas, records mapping changes, removes duplicate, and rejects type conflict', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Merge' }).click();
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: 'north.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: workbookBuffer([['order_id','total'],['N-1001',100],['DUP-1',50]]) },
    { name: 'south.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: workbookBuffer([['id','amount_krw'],['S-2001',200],['DUP-1',50],['BAD-1','oops']]) },
  ]);
  await page.getByRole('button', { name: 'Continue' }).click();
  const mergeSettings = {
    version: 1,
    mode: 'merge',
    rules: [],
    mergeSettings: {
      columnMapBySource: {
        'north.xlsx': { order_id: 'id', total: 'amount' },
        'south.xlsx': { id: 'id', amount_krw: 'amount' },
      },
      outputColumns: ['id','amount','source'],
      sourceColumn: 'source',
      dedupeColumns: ['id'],
    },
  };
  await page.locator('label.settings-load input[type="file"]').setInputFiles({
    name: 'merge-settings.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(mergeSettings)),
  });
  await page.getByRole('button', { name: 'Run preview' }).click();
  await page.getByRole('button', { name: 'Process all rows' }).click();
  await expect(page.getByText('Row reconciliation passed')).toBeVisible();
  const values = page.locator('.summary-grid strong');
  await expect(values.nth(0)).toHaveText('5');
  await expect(values.nth(1)).toHaveText('0');
  await expect(values.nth(2)).toHaveText('3');
  await expect(values.nth(3)).toHaveText('1');
  await expect(values.nth(4)).toHaveText('1');
});
