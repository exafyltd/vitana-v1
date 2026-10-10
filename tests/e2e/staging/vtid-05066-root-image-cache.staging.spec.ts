// VTID-05066 — unhashed root images may be cached for a day (nginx.conf), so
// the ORB icon is not downloaded again every time News remounts. Read-only:
// two GETs, no sign-in.
import { test, expect } from './staging-guard';

test('root images are served with a one-day cache; the app shell is still never cached', async ({ request }) => {
  const icon = await request.get('/vitana-orb-clean.svg');
  expect(icon.status()).toBe(200);
  expect(icon.headers()['content-type'] ?? '').toContain('image/svg+xml');
  expect(icon.headers()['cache-control']).toBe('public, max-age=86400');

  const shell = await request.get('/home');
  expect(shell.status()).toBe(200);
  expect(shell.headers()['cache-control'] ?? '').toContain('no-store');
});
