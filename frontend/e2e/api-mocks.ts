/**
 * Network-level API mocks for E2E tests.
 * Intercepts worker API calls so tests run offline without the worker.
 * Uses [VALID CODE] per CONVENTIONS.md to bypass real shader compilation.
 */
import type { Page } from "@playwright/test";

const VALID_FRAGMENT = "[VALID CODE]";

export const mockGenerateFromPrompt = {
  fragmentSource: VALID_FRAGMENT,
  tokensUsed: 100,
};

export const mockSuggestResponse = (tier: string) => ({
  suggestion: `E2E mock suggestion for ${tier}`,
});

export const mockApplyDirective = {
  fragmentSource: VALID_FRAGMENT,
  tokensUsed: 150,
};

/**
 * Setup Playwright route handlers for all worker API endpoints.
 * Call from test.beforeEach so tests run offline without the worker.
 */
export async function setupApiMocks(page: Page): Promise<void> {
  await page.route("**/generate-from-prompt", async (req) => {
    if (req.request().method() === "POST") {
      await req.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockGenerateFromPrompt),
      });
    } else {
      await req.continue();
    }
  });

  await page.route("**/suggest", async (req) => {
    if (req.request().method() === "POST") {
      const body = req.request().postDataJSON() as { adventurousness?: string } | undefined;
      const tier = body?.adventurousness ?? "conservative";
      await req.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSuggestResponse(tier)),
      });
    } else {
      await req.continue();
    }
  });

  await page.route("**/apply-directive", async (req) => {
    if (req.request().method() === "POST") {
      await req.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockApplyDirective),
      });
    } else {
      await req.continue();
    }
  });
}
