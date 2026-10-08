// VTID-05000 — a failed lazy-chunk load recovers once through a cache-busted
// reload (`_vr`) instead of leaving the member on "App updated — please reload".
//
// Read-only: the failure is simulated client-side with page.route() (one
// aborted GET for a lazy JS chunk); nothing is sent to, or changed on, any
// server. The staging guard still aborts every non-GET.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites: / https:\/\/preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap)/,
});

test('a failed lazy chunk triggers one _vr recovery and the app renders', async ({ page }) => {
  let armed = false;
  let aborted: string | null = null;
  const recoveryNavigations: string[] = [];

  // Lazy route chunks are requested after the document is parsed; the entry
  // script and modulepreloaded files are requested before. Abort the first
  // post-parse hashed JS chunk that is not the entry bundle.
  page.on('domcontentloaded', () => {
    armed = true;
  });
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame() && new URL(frame.url()).searchParams.has('_vr')) {
      recoveryNavigations.push(frame.url());
    }
  });
  await page.route(/\/assets\/(?!index-)[^/]+\.js(\?.*)?$/, async (route) => {
    if (armed && !aborted && !route.request().url().includes('_vr')) {
      aborted = route.request().url();
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => aborted, { timeout: 30_000, message: 'no lazy chunk was requested to abort' }).not.toBeNull();
  await expect.poll(() => recoveryNavigations.length, { timeout: 30_000, message: 'no _vr recovery navigation' }).toBeGreaterThan(0);
  expect(recoveryNavigations.length, 'recovery must not loop').toBe(1);

  // The recovered page renders, shows no error screen, and drops _vr from the address bar.
  await expect.poll(() => page.evaluate(() => document.getElementById('root')?.innerText.trim().length ?? 0), { timeout: 30_000 }).toBeGreaterThan(0);
  await expect(page.getByText(/App updated|App aktualisiert/)).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.has('_vr'), { timeout: 10_000 }).toBe(false);
});
