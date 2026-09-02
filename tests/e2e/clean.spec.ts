import { expect, test } from '@playwright/test';

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

test('Clean guided example reconciles all four row states and exposes four downloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Clean' }).click();
  await page.locator('input[type="file"]').first().setInputFiles('public/examples/clean-orders.csv');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('label.settings-load input[type="file"]').setInputFiles({
    name: 'clean-settings.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(cleanSettings)),
  });
  await page.getByRole('button', { name: 'Run preview' }).click();
  await expect(page.getByText(/estimate based on up to the first 200 data rows/i)).toBeVisible();
  await page.getByRole('button', { name: 'Process all rows' }).click();
  await expect(page.getByText('Row reconciliation passed')).toBeVisible();
  const values = page.locator('.summary-grid strong');
  await expect(values.nth(0)).toHaveText('4');
  await expect(values.nth(1)).toHaveText('1');
  await expect(values.nth(2)).toHaveText('1');
  await expect(values.nth(3)).toHaveText('1');
  await expect(values.nth(4)).toHaveText('1');
  await expect(page.locator('.download-grid button')).toHaveCount(4);
});
