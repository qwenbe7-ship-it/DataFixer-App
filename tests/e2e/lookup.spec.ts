import { expect, test } from '@playwright/test';

test('Lookup joins two CSV files by an exact key and rejects missing matches', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Lookup' }).click();
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: 'orders.csv', mimeType: 'text/csv', buffer: Buffer.from('sku,name\nA-1,Alpha\nB-2,Beta\n') },
    { name: 'inventory.csv', mimeType: 'text/csv', buffer: Buffer.from('product_sku,stock,supplier\nA-1,10,North\n') },
  ]);
  await page.getByRole('button', { name: 'Continue' }).click();

  const settings = {
    version: 1,
    mode: 'lookup',
    rules: [],
    mergeSettings: null,
    lookupSettings: {
      leftKeyColumns: ['sku'],
      rightKeyColumns: ['product_sku'],
      rightValueMap: { stock: 'inventory_stock', supplier: 'inventory_supplier' },
    },
  };
  await page.locator('label.settings-load input[type="file"]').setInputFiles({
    name: 'lookup-settings.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(settings)),
  });

  await page.getByRole('button', { name: 'Run preview' }).click();
  await page.getByRole('button', { name: 'Process all rows' }).click();
  await expect(page.getByText('Row reconciliation passed')).toBeVisible();
  const values = page.locator('.summary-grid strong');
  await expect(values.nth(0)).toHaveText('2');
  await expect(values.nth(1)).toHaveText('0');
  await expect(values.nth(2)).toHaveText('1');
  await expect(values.nth(3)).toHaveText('0');
  await expect(values.nth(4)).toHaveText('1');
  await expect(page.getByRole('button', { name: /Download/ })).toHaveCount(4);
});
