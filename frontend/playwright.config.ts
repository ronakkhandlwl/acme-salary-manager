import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 8020)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // tests share one seeded database
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'e2e',
      testIgnore: /demo\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // `npm run demo:record` — slowed-down, captioned walkthrough saved as video.
      name: 'demo',
      testMatch: /demo\.spec\.ts/,
      timeout: 180_000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        video: { mode: 'on', size: { width: 1440, height: 900 } },
        launchOptions: { slowMo: 250 },
      },
    },
  ],
  // Skip the local server when pointing at a deployed environment.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && bash ../scripts/e2e-server.sh',
        url: `${BASE_URL}/health`,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
        env: { E2E_PORT: String(PORT) },
      },
})
