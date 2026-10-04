import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5188',
    trace: 'on-first-retry',
    viewport: { width: 375, height: 812 }, // standard iPhone X size for mobile-first UI
  },
  projects: [
    {
      name: 'chromium',
      // Chromium engine, but a phone-shaped screen: the device preset would
      // otherwise override the viewport above with a 1280×720 desktop window.
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5188',
    url: 'http://localhost:5188',
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
