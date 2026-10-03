// VTID-04848 — the supplier approves their AI assistant on
// /commerce/connect/authorize (Supabase Auth's OAuth server sends them there
// with ?authorization_id=). A supplier who is not signed in must land on the
// Commerce join screen with the approval link kept as the return target — not
// on the MAXINA intro, and not lose the authorization id.
//
// Read-only and signed out: './staging-guard' (copied in by the runner) aborts
// every write; no authorization is looked up or decided.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

test('signed out, the approval link goes to the Commerce join screen and keeps the authorization id', async ({ page }) => {
  await page.goto('/commerce/connect/authorize?authorization_id=vtid-04848-probe', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/commerce\/join\?redirectTo=/, { timeout: 30_000 });
  const redirectTo = new URL(page.url()).searchParams.get('redirectTo');
  expect(redirectTo).toBe('/commerce/connect/authorize?authorization_id=vtid-04848-probe');
  await expect(page.getByTestId('join-option-google')).toBeVisible();
});
