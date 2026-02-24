import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for Tiles. Run with dev server + worker:
 *   npm run dev (or npm run dev -w frontend + wrangler dev -w worker)
 *   npm run test:e2e -w frontend
 *
 * If frontend uses a non-default port, set PLAYWRIGHT_BASE_URL.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
    video: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  timeout: 60_000,
});
