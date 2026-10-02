// VTID-04832 — Commerce OAuth returns to the host it started on, and a failed
// or expired round-trip lands on the Commerce join screen with a retry
// message, never on the MAXINA intro.
//
// Read-only and signed out: './staging-guard' (copied in by the runner) aborts
// every write, and the OAuth request is aborted in the browser before it
// reaches Supabase, so no flow state is created and no provider is contacted.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

test('Continue with Google asks Supabase to return to this staging host, not production', async ({ page, baseURL }) => {
  let authorize = '';
  await page.route('**/auth/v1/authorize**', (route) => {
    authorize = route.request().url();
    return route.abort('blockedbyclient');
  });
  await page.goto('/commerce/join', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('join-option-google').click();
  await expect.poll(() => authorize, { timeout: 15_000 }).not.toBe('');
  const redirectTo = new URL(authorize).searchParams.get('redirect_to');
  expect(redirectTo).toBe(`${new URL(baseURL!).origin}/commerce`);
});

test('an expired Commerce sign-in comes back to the join screen with a retry message, not the MAXINA intro', async ({ page }) => {
  // The marker the join screen leaves when a Commerce sign-in starts.
  await page.addInitScript(() => {
    localStorage.setItem('vitana.oauth.pending', JSON.stringify({ portal: 'commerce', at: Date.now() }));
  });
  await page.goto('/_intro/maxina?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+has+expired', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page).toHaveURL(/\/commerce\/join\?oauth_error=expired$/, { timeout: 30_000 });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('join-option-google')).toBeVisible();
});
