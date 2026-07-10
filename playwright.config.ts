import { defineConfig } from '@playwright/test'

// The demo walkthrough is evidence, not a load test: one browser, no
// parallelism, deterministic clock driven from the spec itself.
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://localhost:5199' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run demo -- --port 5199 --strictPort',
    url: 'http://localhost:5199/index.html',
    reuseExistingServer: false,
  },
})
