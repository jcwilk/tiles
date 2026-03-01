/**
 * E2E tests for React Tiles app.
 * API is mocked at network level; tests run offline without the worker.
 * Covers: grid load, fullscreen, edit, suggestions, directive, add tile, delete,
 * back/forward nav, deep link, responsive layout.
 */
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "./api-mocks.js";

test.beforeEach(async ({ page }) => {
  await setupApiMocks(page);
});

const E2E_QUERY = "?e2e=1";

/** Wait for grid to load. Uses ?e2e=1 for in-memory storage (no IndexedDB). */
async function waitForGridReady(
  page: import("@playwright/test").Page,
  expectedTileCount = 6
): Promise<void> {
  await page.goto("/" + E2E_QUERY, { waitUntil: "load" });
  await expect(page.getByText("Loading…").first()).toBeHidden({ timeout: 20_000 });
  await expect(page.getByTestId("tile")).toHaveCount(expectedTileCount, { timeout: 10_000 });
}

test.describe("grid view", () => {
  test("loads with seed tiles", async ({ page }) => {
    await waitForGridReady(page);

    const grid = page.getByTestId("grid-view");
    await expect(grid).toBeVisible();
    await expect(page.getByTestId("add-tile-button")).toBeVisible();
  });
});

test.describe("fullscreen flow", () => {
  test("tap tile opens fullscreen view", async ({ page }) => {
    await waitForGridReady(page);

    const tiles = page.getByTestId("tile");
    await tiles.first().click();

    const fullscreen = page.getByTestId("fullscreen-view");
    await expect(fullscreen).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[aria-label="Close"]').first()).toBeVisible();
    await expect(page.locator('[aria-label="Edit"]').first()).toBeVisible();
  });

  test("fullscreen close returns to grid", async ({ page }) => {
    await waitForGridReady(page);

    const tiles = page.getByTestId("tile");
    await tiles.first().click();

    await expect(page.getByTestId("fullscreen-view")).toBeVisible({ timeout: 5_000 });

    await page.locator('[aria-label="Close"]').first().click();

    await expect(page.getByTestId("fullscreen-view")).not.toBeVisible();
    await expect(page.getByTestId("grid-view")).toBeVisible();
  });
});

test.describe("edit flow", () => {
  test("fullscreen Edit button opens edit view", async ({ page }) => {
    await waitForGridReady(page);

    const tiles = page.getByTestId("tile");
    await tiles.first().click();

    await page.locator('[aria-label="Edit"]').first().click();

    const editView = page.getByTestId("edit-view");
    await expect(editView).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("edit-view-shader")).toBeVisible();
  });

  test("edit view shows suggestions (mock API)", async ({ page }) => {
    await waitForGridReady(page);

    const tiles = page.getByTestId("tile");
    await tiles.first().click();
    await page.locator('[aria-label="Edit"]').first().click();

    const editView = page.getByTestId("edit-view");
    await expect(editView).toBeVisible({ timeout: 5_000 });

    // Suggestions load from mock API
    const conservativeSuggestion = page.getByTestId("suggestion-conservative");
    await expect(conservativeSuggestion).toBeVisible({ timeout: 15_000 });
    await expect(conservativeSuggestion).toContainText("E2E mock suggestion", { timeout: 5_000 });
  });

  test("custom directive submission (mock API)", async ({ page }) => {
    await waitForGridReady(page);

    const tiles = page.getByTestId("tile");
    await tiles.first().click();
    await page.locator('[aria-label="Edit"]').first().click();

    await expect(page.getByTestId("edit-view")).toBeVisible({ timeout: 5_000 });

    const directiveInput = page.getByTestId("directive-input");
    await expect(directiveInput).toBeHidden();

    await page.getByTestId("edit-view").getByRole("button", { name: "Custom directive" }).click();
    await expect(directiveInput).toBeVisible();

    await directiveInput.fill("make it blue");
    await directiveInput.press("Enter");

    // Mock apply-directive returns [VALID CODE]; new tile created and navigates to its fullscreen
    await expect(page.getByTestId("fullscreen-view")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("add tile", () => {
  test("add tile from prompt (mock API)", async ({ page }) => {
    await waitForGridReady(page);

    await page.getByTestId("add-tile-button").click();

    const dialog = page.getByRole("dialog", { name: /add new tile/i });
    await expect(dialog).toBeVisible();

    await page.getByTestId("add-tile-prompt-input").fill("blue gradient");
    await page.getByTestId("add-tile-submit").click();

    // Mock generate-from-prompt returns [VALID CODE]; closes dialog, navigates to new tile
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("fullscreen-view")).toBeVisible({ timeout: 10_000 });

    // Navigate back to grid (client-side, preserves in-memory storage)
    await page.getByTestId("fullscreen-view").locator('[aria-label="Close"]').click();
    await expect(page.getByTestId("grid-view")).toBeVisible();
    const tiles = page.getByTestId("tile");
    await expect(tiles).toHaveCount(7, { timeout: 5_000 });
  });
});

test.describe("delete tile", () => {
  test("delete a non-builtin tile", async ({ page }) => {
    await waitForGridReady(page);

    // Add a tile first
    await page.getByTestId("add-tile-button").click();
    await page.getByTestId("add-tile-prompt-input").fill("test delete tile");
    await page.getByTestId("add-tile-submit").click();

    await expect(page.getByTestId("fullscreen-view")).toBeVisible({ timeout: 15_000 });

    // Delete button visible for user-created tiles (use evaluate to avoid Close button overlay)
    const deleteBtn = page.getByTestId("fullscreen-view").locator('[aria-label="Delete tile"]');
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
    await deleteBtn.evaluate((el) => (el as HTMLElement).click());

    await expect(page.getByTestId("fullscreen-view")).not.toBeVisible();
    await expect(page.getByTestId("grid-view")).toBeVisible();

    const tiles = page.getByTestId("tile");
    await expect(tiles).toHaveCount(6, { timeout: 5_000 });
  });
});

test.describe("navigation", () => {
  test("browser back/forward between views", async ({ page }) => {
    await waitForGridReady(page);

    const tiles = page.getByTestId("tile");
    await tiles.first().click();

    await expect(page.getByTestId("fullscreen-view")).toBeVisible({ timeout: 5_000 });
    expect(page.url()).toContain("/tile/");

    await page.goBack();
    await expect(page.getByTestId("grid-view")).toBeVisible();
    expect(page.url()).not.toContain("/tile/");

    await page.goForward();
    await expect(page.getByTestId("fullscreen-view")).toBeVisible();
    expect(page.url()).toContain("/tile/");
  });

  test("deep link to fullscreen view", async ({ page }) => {
    await waitForGridReady(page);

    const firstTile = page.getByTestId("tile").first();
    const shaderId = await firstTile.getAttribute("data-shader-id");
    expect(shaderId).toBeTruthy();

    await firstTile.click();

    await expect(page.getByTestId("fullscreen-view")).toBeVisible({ timeout: 5_000 });
    expect(page.url()).toContain(`/tile/${shaderId}`);
  });
});

test.describe("responsive", () => {
  test("grid layout adapts to mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await waitForGridReady(page);

    const grid = page.getByTestId("tile-grid");
    await expect(grid).toBeVisible();
  });

  test("grid layout adapts to desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await waitForGridReady(page);

    const grid = page.getByTestId("tile-grid");
    await expect(grid).toBeVisible();
  });
});
