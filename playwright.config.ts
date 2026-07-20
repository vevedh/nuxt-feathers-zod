import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.NFZ_PLAYWRIGHT_PORT || 3300)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './test/playwright',
  outputDir: './test-results/playwright',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    launchOptions: process.env.NFZ_PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.NFZ_PLAYWRIGHT_EXECUTABLE_PATH }
      : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.NFZ_PLAYWRIGHT_DISABLE_VIDEO === '1' ? 'off' : 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/run-playwright-server.mjs',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 960 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
})
