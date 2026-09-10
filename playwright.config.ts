import { defineConfig, devices } from '@playwright/test';

const useSystemEdge = process.env.PLAYWRIGHT_USE_SYSTEM_EDGE === '1';
const browserOverrides = useSystemEdge ? { channel: 'msedge' as const } : {};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...browserOverrides } },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...browserOverrides } },
  ],
});
