import { expect, test } from '@playwright/test';
import * as XLSX from 'xlsx';

const cleanSettings = {
  version: 1,
  mode: 'clean',
  rules: [
    { id: 'trim-customer', kind: 'trim', column: 'customer' },
    { id: 'parse-amount', kind: 'parseNumber', column: 'amount', removeThousandsSeparator: true },
    { id: 'dedupe-order', kind: 'dedupe', columns: ['order_id'] },
  ],
  mergeSettings: null,
};

test('live host accepts XLSX input and reconciles the clean flow', async ({ page }) => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['order_id', 'customer', 'amount'],
    ['A-1', ' Alice ', '1,200'],
    ['A-2', 'Bob', 30],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Orders');
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

  await page.goto('/');
  await page.getByRole('button', { name: 'Clean' }).click();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'book.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(bytes),
  });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('label.settings-load input[type="file"]').setInputFiles({
    name: 'clean-settings.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(cleanSettings)),
  });
  await page.getByRole('button', { name: 'Run preview' }).click();
  await page.getByRole('button', { name: 'Process all rows' }).click();
  await expect(page.getByText('Row reconciliation passed')).toBeVisible();
  await expect(page.locator('.download-grid button')).toHaveCount(4);
});
