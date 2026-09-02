import { expect, test } from '@playwright/test';

test('Pattern Normalize cleans phone and SKU formats from a real CSV example', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Clean' }).click();
  await page.locator('input[type="file"]').first().setInputFiles('public/examples/pattern-normalize.csv');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('label.settings-load input[type="file"]').setInputFiles('public/examples/pattern-normalize-settings.json');
  await page.getByRole('button', { name: 'Run preview' }).click();
  await expect(page.getByRole('cell', { name: '01012345678', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'AB001', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Process all rows' }).click();
  await expect(page.getByText('Row reconciliation passed')).toBeVisible();
  const values = page.locator('.summary-grid strong');
  await expect(values.nth(0)).toHaveText('3');
  await expect(values.nth(1)).toHaveText('0');
  await expect(values.nth(2)).toHaveText('3');
  await expect(values.nth(3)).toHaveText('0');
  await expect(values.nth(4)).toHaveText('0');
  await expect(page.locator('.download-grid button')).toHaveCount(4);
});
