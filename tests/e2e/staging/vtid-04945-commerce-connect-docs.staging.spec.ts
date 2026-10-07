// VTID-04945 — the public Commerce connector docs and privacy notice.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write,
// and this spec never signs in. A signed-out visitor (or an Anthropic
// reviewer) opens /commerce/connect, sees the connection address ending in
// /mcp and every tool the gateway serves, and reaches the privacy notice. Checked by
// structure and route, not by text, so it holds in every UI language.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

const noHorizontalOverflow = async (page: import('@playwright/test').Page) => {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
};

for (const viewport of [{ width: 1400, height: 900 }, { width: 390, height: 844 }]) {
  test(`docs page at ${viewport.width}px: address, nine tools, links, no overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/commerce/connect', { waitUntil: 'domcontentloaded' });

    // Public: not bounced to a sign-in screen.
    await expect(page.getByTestId('commerce-connect-docs')).toBeVisible({ timeout: 30_000 });
    expect(new URL(page.url()).pathname).toMatch(/\/commerce\/connect\/?$/);
    await expect(page.locator('h1')).toBeVisible();

    await expect(page.getByTestId('connect-address')).toContainText('/mcp');
    await expect(page.getByTestId('connect-tools').locator('dt')).toHaveCount(9);

    // The privacy notice is one click away.
    await expect(page.locator('a[href="/commerce/connect/privacy"]')).toBeVisible();
    await noHorizontalOverflow(page);
  });
}

test('the privacy notice is public and names a way to reach us', async ({ page }) => {
  await page.goto('/commerce/connect/privacy', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('commerce-connect-privacy')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(1);
  await expect(page.locator('a[href="/privacy"]')).toBeVisible();
  await noHorizontalOverflow(page);
});
