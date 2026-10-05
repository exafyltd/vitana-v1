// VTID-04898 — on the pre-login Commerce page the Vitana orb never sits on the
// landing's content at desktop widths.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write,
// and this spec never signs in. The page has no sidebar, so the orb docks in a
// reserved corner gutter: its box must lie entirely left of the hero heading
// and of the landing, which means no scroll position can put it over text,
// and it must not touch the "one-step" heading at first paint.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

for (const [width, height] of [
  [1024, 768],
  [1280, 800],
  [1400, 900],
  [1920, 1080],
] as const) {
  test(`${width}x${height}: the orb stays in its gutter, off the landing`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/commerce', { waitUntil: 'domcontentloaded' });
    const landing = page.getByTestId('commerce-guest-landing');
    await expect(landing.getByTestId('guest-one-step')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('body')).toHaveClass(/\bcommerce-guest-page\b/);

    const orb = page.locator('.vtorb-fab').first();
    await expect(orb).toBeVisible({ timeout: 30_000 });
    // Let the widget finish placing itself.
    await expect.poll(async () => (await orb.boundingBox())?.x ?? -1, { timeout: 10_000 }).toBeLessThan(40);

    const o = (await orb.boundingBox())!;
    const l = (await landing.boundingBox())!;
    const h1 = (await page.locator('main h1').first().boundingBox())!;
    const heading = (await landing.getByTestId('guest-one-step').locator('h2').first().boundingBox())!;

    expect(o.x).toBeGreaterThanOrEqual(0);
    expect(o.x + o.width).toBeLessThanOrEqual(Math.min(l.x, h1.x));
    const overlaps = !(o.x + o.width <= heading.x || heading.x + heading.width <= o.x || o.y + o.height <= heading.y || heading.y + heading.height <= o.y);
    expect(overlaps).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  });
}
