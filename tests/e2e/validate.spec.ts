import { expect, test } from '@playwright/test';
import * as XLSX from 'xlsx';

function workbookBuffer(): Buffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['email','age','status','code','min_value','max_value','name'],
    ['valid@example.com',30,'ACTIVE','AB-001',1,2,'Alice'],
    ['dup@example.com',17,'UNKNOWN','BAD',5,2,'X'],
    ['dup@example.com',30,'ACTIVE','AB-004',1,2,'Bob'],
  ]), 'Contacts');
  return Buffer.from(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
}

const settings = {
  version: 1,
  mode: 'validate',
  rules: [
    { id:'required-email', kind:'required', column:'email' },
    { id:'age-type', kind:'type', column:'age', expected:'number' },
    { id:'unique-email', kind:'unique', columns:['email'] },
    { id:'status-allowed', kind:'allowed', column:'status', values:['ACTIVE','INACTIVE'] },
    { id:'age-range', kind:'numberRange', column:'age', min:18, max:65 },
    { id:'name-length', kind:'length', column:'name', min:2, max:20 },
    { id:'code-shape', kind:'regex', column:'code', pattern:'^AB-\\d{3}$' },
    { id:'min-lte-max', kind:'columnCompare', left:'min_value', operator:'lte', right:'max_value' },
  ],
  mergeSettings: null,
};

test('Validate evaluates all V1 rule kinds and retains multiple failure reasons per rejected row', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Validate' }).click();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'contacts.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: workbookBuffer(),
  });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('label.settings-load input[type="file"]').setInputFiles({
    name: 'validate-settings.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(settings)),
  });
  await page.getByRole('button', { name: 'Run preview' }).click();
  await expect(page.getByRole('cell', { name: 'age-range', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'min-lte-max', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Process all rows' }).click();
  await expect(page.getByText('Row reconciliation passed')).toBeVisible();
  const values = page.locator('.summary-grid strong');
  await expect(values.nth(0)).toHaveText('3');
  await expect(values.nth(1)).toHaveText('1');
  await expect(values.nth(2)).toHaveText('0');
  await expect(values.nth(3)).toHaveText('0');
  await expect(values.nth(4)).toHaveText('2');
});
