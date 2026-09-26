// VTID-04613 — community-app STAGING-VERIFY smoke (browser part).
//
// Run by vitana-platform scripts/ci/staging-verify/run.mjs after every staging
// frontend deploy, against https://preview-aws.vitanaland.com. Read-only:
// './staging-guard' is copied in by the runner and aborts every write
// (staging writes reach production data — see CLAUDE.md). Unauthenticated
// on purpose: it proves the build boots against the staging gateway.
import { test, expect } from './staging-guard';

// The app sends a RUM performance beacon on every load. The guard aborts it
// (nothing is written); declaring it keeps the test honest about everything
// else. Any OTHER aborted write, or any request to a production host, fails.
test.use({ allowAbortedWrites: [/ https:\/\/preview-aws-gateway\.vitanaland\.com\/api\/v1\/rum\/beacon/] });

test('the pre-login landing renders with no uncaught errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  // React has mounted once #root renders any text (the loading screen counts).
  await expect.poll(() => page.evaluate(() => document.getElementById('root')?.innerText.trim().length ?? 0), { timeout: 30_000 }).toBeGreaterThan(0);
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
});

test('the served bundle talks to the staging gateway', async ({ page, request }) => {
  const html = await (await request.get('/')).text();
  const bundle = /src="(\/assets\/index-[^"]+\.js)"/.exec(html)?.[1];
  expect(bundle, 'no index bundle referenced by the app shell').toBeTruthy();
  const js = await (await request.get(bundle!)).text();
  expect(js).toContain('preview-aws-gateway.vitanaland.com');

  const gatewayCalls: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).host === 'preview-aws-gateway.vitanaland.com') gatewayCalls.push(r.url());
  });
  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  expect(gatewayCalls.length, 'the app made no request to the staging gateway').toBeGreaterThan(0);
});
