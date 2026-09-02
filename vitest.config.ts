import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/{domain,file-io,rules,evidence,export}/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'browser',
          include: ['tests/browser/**/*.test.ts', 'tests/browser/**/*.test.tsx'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
