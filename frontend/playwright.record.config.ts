import { defineConfig, devices } from "@playwright/test";

/**
 * Config for recording video of E2E tests.
 * Run: npx playwright test --config=playwright.record.config.ts e2e/app.spec.ts
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    trace: "on",
    video: { mode: "on", size: { width: 1280, height: 720 } },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  timeout: 60_000,
});
