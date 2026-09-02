import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const MiB = 1024 * 1024;
function csvWithExactBytes(bytes: number): Buffer {
  const header = Buffer.from('value\n');
  if (bytes <= header.length) throw new Error('size too small');
  return Buffer.concat([header, Buffer.alloc(bytes - header.length, 0x61)]);
}

test('20 MiB is accepted and 20 MiB plus one byte is rejected', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Clean' }).click();
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({ name: 'edge.csv', mimeType: 'text/csv', buffer: csvWithExactBytes(20 * MiB) });
  await expect(page.getByText('edge.csv')).toBeVisible({ timeout: 60_000 });

  await input.setInputFiles({ name: 'too-large.csv', mimeType: 'text/csv', buffer: csvWithExactBytes(20 * MiB + 1) });
  await expect(page.getByText(/exceeds the allowed size/i)).toBeVisible();
});

test('50 MiB across ten files is accepted and 50 MiB plus one byte is rejected', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Merge' }).click();
  const input = page.locator('input[type="file"]');
  const filesDir = testInfo.outputPath('large-inputs');
  await mkdir(filesDir, { recursive: true });

  const paths: string[] = [];
  for (let index = 0; index < 10; index += 1) {
    const path = join(filesDir, `part-${index}.csv`);
    await writeFile(path, csvWithExactBytes(5 * MiB));
    paths.push(path);
  }

  await input.setInputFiles(paths);
  await expect(page.getByText('part-9.csv')).toBeVisible({ timeout: 120_000 });

  const oversizedPath = join(filesDir, 'part-9-over.csv');
  await writeFile(oversizedPath, csvWithExactBytes(5 * MiB + 1));
  await input.setInputFiles([...paths.slice(0, 9), oversizedPath]);
  await expect(page.getByRole('alert')).toContainText('The selected files exceed the total job size.');
});
