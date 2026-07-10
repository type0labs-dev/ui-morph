import { defineConfig } from '@playwright/test'
import fs from 'node:fs'

// hand-rolled .env load (one key, no dotenv dependency) — the live-llm
// project reads OPENROUTER_API_KEY from the local gitignored .env
try {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim())
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!
  }
} catch {
  /* no .env — live project will skip */
}

// Two demo frontends, one engine: the legacy MVP1 store (plain CSS) is the
// regression suite; the Carbon store is the primary demo. Evidence, not load
// tests: one browser, no parallelism, fake clock driven from the specs.
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: false,
  workers: 1,
  projects: [
    {
      name: 'mvp1',
      testMatch: /demo\.spec\.ts/,
      use: { browserName: 'chromium', baseURL: 'http://localhost:5199' },
    },
    {
      name: 'carbon',
      testMatch: /carbon\.spec\.ts/,
      use: { browserName: 'chromium', baseURL: 'http://localhost:5198' },
    },
    {
      // real model calls — opt-in only: npm run e2e:live (needs .env key)
      name: 'live',
      testMatch: /live-llm\.spec\.ts/,
      timeout: 120_000,
      use: { browserName: 'chromium', baseURL: 'http://localhost:5198' },
    },
  ],
  webServer: [
    {
      command: 'npm run demo -- --port 5199 --strictPort',
      url: 'http://localhost:5199/index.html',
      reuseExistingServer: false,
    },
    {
      command: 'npm run demo:carbon -- --port 5198 --strictPort',
      url: 'http://localhost:5198/index.html',
      reuseExistingServer: false,
    },
  ],
})
