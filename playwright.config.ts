import { defineConfig, devices } from '@playwright/test';

const localBaseURL = 'http://127.0.0.1:4173';
const liveBaseURL = process.env.DATAFIXER_BASE_URL?.replace(/\/$/, '');

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: liveBaseURL ?? localBaseURL,
    trace: 'retain-on-failure',
  },
  ...(liveBaseURL
    ? {}
    : {
        webServer: {
          command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
          url: localBaseURL,
          reuseExistingServer: !process.env.CI,
        },
      }),
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
