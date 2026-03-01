import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for Tiles. API is mocked at network level — worker not required.
 *   npm run test:e2e -w frontend
 *
 * In CI, webServer starts the Vite dev server automatically.
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
  webServer: process.env.CI
    ? {
        command: "npm run dev -w frontend",
        url: "http://localhost:5173",
        reuseExistingServer: true,
        timeout: 30_000,
      }
    : undefined,
});
