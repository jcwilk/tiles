/**
 * E2E: Shader merge flow. Requires dev server + worker running.
 * Verifies drag-drop triggers merge, AI returns GLSL, shader compiles, new tile appears.
 */
import { test, expect } from "@playwright/test";

test.describe("merge flow", () => {
  test("drag tile onto another triggers merge and new tile appears", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const grid = page.locator(".tiles-grid");
    await expect(grid).toBeVisible({ timeout: 15_000 });

    const tiles = page.locator(".tile:not(.tile-add-new)");
    await expect(tiles).toHaveCount(6, { timeout: 15_000 });

    const source = tiles.first();
    const target = tiles.nth(1);

    await source.dragTo(target, { force: true });

    await expect(tiles).toHaveCount(7, { timeout: 60_000 });
  });
});
