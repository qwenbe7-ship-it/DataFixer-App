import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { describe, expect, it } from 'vitest';
import App from '../../src/app/App';

describe('DataFixer guided flow', () => {
  it('completes the Clean flow through reconciled results', async () => {
    await render(<App />);
    await userEvent.click(page.getByRole('button', { name: 'Clean' }));

    const file = new File(['name\n  Alice  \nBob\n'], 'people.csv', { type: 'text/csv' });
    await page.getByLabelText('Choose files').upload(file);
    await userEvent.click(page.getByRole('button', { name: 'Continue' }));

    await page.getByLabelText('Add rule').selectOptions('trim');
    await userEvent.click(page.getByRole('button', { name: 'Run preview' }));
    await expect.element(page.getByText(/estimate based on up to the first 200 data rows/i)).toBeVisible();

    await userEvent.click(page.getByRole('button', { name: 'Process all rows' }));
    await expect.element(page.getByText('Row reconciliation passed')).toBeVisible();
    expect(page.getByRole('button', { name: /Download/ }).elements()).toHaveLength(4);
  });
});
