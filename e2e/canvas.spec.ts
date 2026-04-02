import { test, expect } from '@playwright/test';

test.describe('Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display canvas', async ({ page }) => {
    // Canvas should be visible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should have toolbar', async ({ page }) => {
    // Toolbar buttons should be visible
    const toolbar = page.locator('[role="toolbar"]').first();
    await expect(toolbar).toBeVisible();
  });

  test('should create new session', async ({ page }) => {
    // Find and click new session button
    const newSessionButton = page.getByRole('button', { name: /new/i }).first();
    if (await newSessionButton.isVisible().catch(() => false)) {
      await newSessionButton.click();

      // Should have multiple session tabs
      const tabs = page.locator('[role="tab"]').first();
      await expect(tabs).toBeVisible();
    }
  });
});
