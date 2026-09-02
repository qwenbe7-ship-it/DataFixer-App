import type { Page } from '@playwright/test';

export async function completeCleanFlow(page: Page, name = 'people.csv'): Promise<void> {
  await page.getByRole('button', { name: 'Clean' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: 'text/csv',
    buffer: Buffer.from('name\n Alice \nBob\n'),
  });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('.rule-add-row select').selectOption('trim');
  await page.getByRole('button', { name: 'Run preview' }).click();
  await page.getByRole('button', { name: 'Process all rows' }).click();
  await page.getByText('Row reconciliation passed').waitFor();
}
