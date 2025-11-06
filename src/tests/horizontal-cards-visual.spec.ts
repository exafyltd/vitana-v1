/**
 * Visual Regression Tests - Playwright
 * 
 * Snapshots:
 * - reminder-standard-collapsed.png
 * - reminder-standard-expanded.png
 * - aifeed-visual-first-viewport.png
 * - aifeed-visual-scrolled.png
 * - aifeed-visual-dark.png
 * - aifeed-visual-rtl.png
 * 
 * Setup:
 * 1. Install Playwright: npm install -D @playwright/test
 * 2. Run tests: npx playwright test src/tests/horizontal-cards-visual.spec.ts
 * 3. Update snapshots: npx playwright test --update-snapshots
 * 
 * NOTE: This file is commented out until @playwright/test is installed.
 * Uncomment after running: npm install -D @playwright/test
 */

// import { test, expect } from '@playwright/test';

/*
test.describe('Horizontal Cards - Visual Regression', () => {
  
  test('reminder-standard-collapsed', async ({ page }) => {
    await page.goto('/inbox/reminder');
    
    // Wait for skeletons to disappear
    await page.waitForSelector('[data-testid="horizontal-card-skeleton"]', { state: 'detached', timeout: 5000 });
    
    // Wait for first card to be visible
    await page.waitForSelector('[data-testid="standard-horizontal-card"]', { state: 'visible' });
    
    // Take snapshot
    await expect(page).toHaveScreenshot('reminder-standard-collapsed.png', {
      fullPage: false,
      maxDiffPixels: 100 // Allow minor rendering differences
    });
    
    // Assert no CLS: check card heights are stable
    const firstCard = page.locator('[data-testid="standard-horizontal-card"]').first();
    const box = await firstCard.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(88); // min-h-[88px]
  });

  test('reminder-standard-expanded', async ({ page }) => {
    await page.goto('/inbox/reminder');
    await page.waitForSelector('[data-testid="horizontal-card-skeleton"]', { state: 'detached', timeout: 5000 });
    
    // Expand first card
    const firstCard = page.locator('[data-testid="standard-horizontal-card"]').first();
    await firstCard.locator('button[aria-expanded="false"]').click();
    
    // Wait for expansion animation (200ms ease-out)
    await page.waitForTimeout(300);
    
    // Verify aria-expanded
    const expandButton = firstCard.locator('button[aria-expanded]');
    await expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    
    // Take snapshot
    await expect(page).toHaveScreenshot('reminder-standard-expanded.png', {
      fullPage: false,
      maxDiffPixels: 100
    });
  });

  test('aifeed-visual-first-viewport', async ({ page }) => {
    await page.goto('/home/aifeed');
    await page.waitForSelector('[data-testid="horizontal-card-skeleton"]', { state: 'detached', timeout: 5000 });
    
    // Wait for first visual card
    await page.waitForSelector('[data-testid="visual-horizontal-card"]', { state: 'visible' });
    
    // Wait for images to load
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('[data-testid="visual-horizontal-card"] img'));
      return images.every(img => (img as HTMLImageElement).complete);
    }, { timeout: 10000 });
    
    // Take snapshot
    await expect(page).toHaveScreenshot('aifeed-visual-first-viewport.png', {
      fullPage: false,
      maxDiffPixels: 150
    });
    
    // Assert no CLS: check card heights
    const firstCard = page.locator('[data-testid="visual-horizontal-card"]').first();
    const box = await firstCard.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(160); // min-h-[160px]
  });

  test('aifeed-visual-scrolled', async ({ page }) => {
    await page.goto('/home/aifeed');
    await page.waitForSelector('[data-testid="horizontal-card-skeleton"]', { state: 'detached', timeout: 5000 });
    
    // Scroll down to trigger infinite scroll
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(500);
    
    // Take snapshot
    await expect(page).toHaveScreenshot('aifeed-visual-scrolled.png', {
      fullPage: false,
      maxDiffPixels: 150
    });
  });

  test('aifeed-visual-dark', async ({ page }) => {
    await page.goto('/home/aifeed');
    
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    
    await page.waitForSelector('[data-testid="horizontal-card-skeleton"]', { state: 'detached', timeout: 5000 });
    await page.waitForSelector('[data-testid="visual-horizontal-card"]', { state: 'visible' });
    
    // Wait for images
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('[data-testid="visual-horizontal-card"] img'));
      return images.every(img => (img as HTMLImageElement).complete);
    }, { timeout: 10000 });
    
    // Take snapshot
    await expect(page).toHaveScreenshot('aifeed-visual-dark.png', {
      fullPage: false,
      maxDiffPixels: 150
    });
  });

  test('aifeed-visual-rtl', async ({ page }) => {
    await page.goto('/home/aifeed');
    
    // Enable RTL mode
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
    });
    
    await page.waitForSelector('[data-testid="horizontal-card-skeleton"]', { state: 'detached', timeout: 5000 });
    await page.waitForSelector('[data-testid="visual-horizontal-card"]', { state: 'visible' });
    
    // Wait for images
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('[data-testid="visual-horizontal-card"] img'));
      return images.every(img => (img as HTMLImageElement).complete);
    }, { timeout: 10000 });
    
    // Take snapshot
    await expect(page).toHaveScreenshot('aifeed-visual-rtl.png', {
      fullPage: false,
      maxDiffPixels: 150
    });
    
    // Verify accent rail flips (visual inspection required)
    // In RTL mode, border-l-2 should become border-r-2
  });

  test('viewport-packing-1080p', async ({ page }) => {
    // Set viewport to 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/home/aifeed');
    await page.waitForSelector('[data-testid="horizontal-card-skeleton"]', { state: 'detached', timeout: 5000 });
    
    // Count visible cards in viewport
    const visibleCards = await page.locator('[data-testid="visual-horizontal-card"]').count();
    
    // Should show 6-7 cards in viewport (160px min-h + gap-3 = ~172px per card)
    // 1080px viewport / 172px ≈ 6.3 cards
    expect(visibleCards).toBeGreaterThanOrEqual(6);
    expect(visibleCards).toBeLessThanOrEqual(8);
  });

  test('keyboard-navigation-standard', async ({ page }) => {
    await page.goto('/inbox/reminder');
    await page.waitForSelector('[data-testid="horizontal-card-skeleton"]', { state: 'detached', timeout: 5000 });
    
    const firstCard = page.locator('[data-testid="standard-horizontal-card"]').first();
    
    // Focus on first card header button
    await firstCard.locator('button[aria-expanded]').focus();
    
    // Press Enter to expand
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Verify expanded
    await expect(firstCard.locator('button[aria-expanded]')).toHaveAttribute('aria-expanded', 'true');
    
    // Press Esc to collapse
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Verify collapsed
    await expect(firstCard.locator('button[aria-expanded]')).toHaveAttribute('aria-expanded', 'false');
    
    // Verify focus ring is visible
    const focusRingVisible = await page.evaluate(() => {
      const button = document.querySelector('[data-testid="standard-horizontal-card"] button[aria-expanded]') as HTMLElement;
      if (!button) return false;
      button.focus();
      const styles = window.getComputedStyle(button);
      // Check for ring-1 class presence
      return button.classList.contains('focus-visible:ring-1') || button.classList.contains('focus:ring-1');
    });
    
    expect(focusRingVisible).toBe(true);
  });
});
*/
