// VTID-04616 — on a staging build the boot diagnostic beacon must go to the
// STAGING gateway, and nothing may go to production. Before the fix the
// beacon always went to https://gateway.vitanaland.com (the optional-chained
// import.meta read was never inlined by Vite).
//
// Read-only: the guard aborts the beacon POST itself — declared below — so
// nothing is written; the test only checks where the app tried to send it.
// Any request to a production host is aborted AND fails the test.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites: [
    / https:\/\/preview-aws-gateway\.vitanaland\.com\/api\/v1\/diag\/notif-tap/,
    / https:\/\/preview-aws-gateway\.vitanaland\.com\/api\/v1\/rum\/beacon/,
  ],
});

test('the boot beacon targets the staging gateway', async ({ page }) => {
  const beacons: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/v1/diag/notif-tap')) beacons.push(r.url());
  });
  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => beacons.length, { timeout: 20_000 }).toBeGreaterThan(0);
  expect(beacons).toEqual(beacons.map(() => 'https://preview-aws-gateway.vitanaland.com/api/v1/diag/notif-tap'));
});
