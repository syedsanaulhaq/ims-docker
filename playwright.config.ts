import { defineConfig } from '@playwright/test';

const apiUrl = process.env.API_URL || 'http://localhost:5001';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: [
    {
      command: 'npm run switch:test && npm run backend',
      port: 5001,
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: 'npm run switch:test && npm run preview -- --host 127.0.0.1 --port 4173',
      port: 4173,
      reuseExistingServer: true,
      timeout: 120_000
    }
  ],
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ],
  metadata: {
    apiUrl
  }
});
