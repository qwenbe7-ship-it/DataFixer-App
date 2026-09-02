import { expect, test } from '@playwright/test';
import { completeCleanFlow } from './helpers';

const customerSecrets = ['Alice', 'Bob', 'people.csv'];

test('processing never transmits or logs customer data', async ({ page, context }) => {
  const violations: string[] = [];
  const consoleLeaks: string[] = [];
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== 'string') throw new Error('Playwright baseURL is required for the privacy gate');
  const appOrigin = new URL(baseURL).origin;

  context.on('request', (request) => {
    const requestOrigin = new URL(request.url()).origin;
    if (request.method() !== 'GET' || requestOrigin !== appOrigin) {
      violations.push(`${request.method()} ${request.url()}`);
    }

    const requestMaterial = [
      request.url(),
      request.postData() ?? '',
      JSON.stringify(request.headers()),
    ].join('\n');
    for (const secret of customerSecrets) {
      if (requestMaterial.includes(secret) || requestMaterial.includes(encodeURIComponent(secret))) {
        violations.push(`customer data leaked in request metadata: ${secret}`);
      }
    }
  });

  page.on('console', (message) => {
    const text = message.text();
    for (const secret of customerSecrets) {
      if (text.includes(secret)) consoleLeaks.push(`customer data leaked to console: ${secret}`);
    }
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await completeCleanFlow(page);
  expect(violations).toEqual([]);
  expect(consoleLeaks).toEqual([]);
});

test('production preview sends frame-ancestors protection as an HTTP header', async ({ page }) => {
  const response = await page.goto('/');
  expect(response).not.toBeNull();
  expect(response!.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
});

test('an already opened page completes processing while offline', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);
  try {
    await completeCleanFlow(page, 'offline.csv');
    for (const name of [
      'Download result XLSX',
      'Download rejected XLSX',
      'Download HTML report',
      'Download settings JSON',
    ]) {
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/^datafixer-/);
    }
  } finally {
    await context.setOffline(false);
  }
});
