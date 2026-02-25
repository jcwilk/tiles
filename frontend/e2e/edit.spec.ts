/**
 * E2E: Edit interface flow. Requires dev server + worker running.
 * Verifies: fullscreen -> Edit button -> edit view opens, suggestions load,
 * pencil toggles input, applying directive creates new shader.
 */
import { test, expect } from "@playwright/test";

test.describe("edit flow", () => {
  test("clicking suggestion applies directive and creates new shader", async ({
    page,
  }) => {
    test.skip(
      !!process.env.CI,
      "Requires real API; skips in CI to avoid rate limits"
    );
    await page.goto("/", { waitUntil: "networkidle" });

    const tiles = page.locator(".tile:not(.tile-add-new)");
    await expect(tiles).toHaveCount(6, { timeout: 15_000 });
    await tiles.first().click();

    await page.locator('[aria-label="Edit"]').click();

    const editView = page.locator(".edit-view");
    await expect(editView).toBeVisible({ timeout: 5_000 });

    const suggestion = editView.locator(".edit-suggestion:not(.loading)").first();
    await expect(suggestion).toBeVisible({ timeout: 60_000 });
    await suggestion.scrollIntoViewIfNeeded();
    await suggestion.click();

    await expect(page.locator(".edit-view")).not.toBeVisible({
      timeout: 90_000,
    });

    const gridTiles = page.locator(".tiles-grid .tile:not(.tile-add-new)");
    await expect(gridTiles).toHaveCount(7, { timeout: 10_000 });
  });

  test("fullscreen Edit button opens edit view with suggestion cards", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const tiles = page.locator(".tile:not(.tile-add-new)");
    await expect(tiles).toHaveCount(6, { timeout: 15_000 });

    await tiles.first().click();

    const fullscreen = page.locator(".fullscreen");
    await expect(fullscreen).toBeVisible({ timeout: 5_000 });

    const editBtn = page.locator('[aria-label="Edit"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const editView = page.locator(".edit-view");
    await expect(editView).toBeVisible({ timeout: 5_000 });

    await expect(editView.locator(".edit-view-shader")).toBeVisible();
    await expect(editView.locator(".edit-actions")).toBeVisible();
    await expect(editView.locator(".edit-context-grid")).toBeVisible();

    const suggestions = editView.locator(".edit-suggestion");
    await expect(suggestions).toHaveCount(3);
  });

  test("pencil button toggles directive input", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const tiles = page.locator(".tile:not(.tile-add-new)");
    await expect(tiles).toHaveCount(6, { timeout: 15_000 });
    await tiles.first().click();

    await page.locator('[aria-label="Edit"]').click();

    const editView = page.locator(".edit-view");
    await expect(editView).toBeVisible({ timeout: 5_000 });

    const input = editView.locator(".edit-directive-input");
    const pencilBtn = editView.locator('[aria-label="Custom directive"]');

    await expect(input).toBeHidden();
    await pencilBtn.click();
    await expect(input).toBeVisible();
    await pencilBtn.click();
    await expect(input).toBeHidden();
  });

  test("close button returns from edit view", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const tiles = page.locator(".tile:not(.tile-add-new)");
    await expect(tiles).toHaveCount(6, { timeout: 15_000 });
    await tiles.first().click();

    await page.locator('[aria-label="Edit"]').click();

    const editView = page.locator(".edit-view");
    await expect(editView).toBeVisible({ timeout: 5_000 });

    const closeBtn = editView.locator(".fullscreen-close");
    await closeBtn.click();

    await expect(editView).not.toBeVisible();
    await expect(page.locator(".fullscreen")).toBeVisible();
  });

});
