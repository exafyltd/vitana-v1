// VTID-05133 — "Connect your AI": Settings → Connected AI and the consent
// screen (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Phone viewport (390x844). The member's
// connected assistants, their privacy row and the gateway's Community MCP
// metadata are answered inside the browser (page.route) with demo data, so the
// screen is proven independent of migration/deploy order (the gateway serves
// the real metadata — exafyltd/vitana-platform VTID-05133 staging-tests.json).
// No switch is flipped and nothing is disconnected: those writes are proven in
// CI (src/components/ai-connect/ai-connect.vtid-05133.test.tsx; gateway:
// test/vtid-05133-community-mcp-*.test.ts).
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04912
    // spec) plus every ORB call.
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/|gateway\.vitanaland\.com\/api\/v1\/diag\/notif-tap)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

async function signIn(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(entry)).text();
  const key = [...bundle.matchAll(/eyJ[A-Za-z0-9_-]+\.(eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)].find((m) => {
    try {
      const p = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
      return p.role === 'anon' && p.ref === 'inmkhvwdcuyhnxkgfvsb';
    } catch {
      return false;
    }
  })?.[0];
  expect(key, 'no Supabase publishable key in the bundle').toBeTruthy();
  const session = await (
    await request.post(`${SUPABASE}/auth/v1/token?grant_type=password`, { headers: { apikey: key!, 'Content-Type': 'application/json' }, data: { email, password } })
  ).json();
  expect(session.access_token, 'sign-in failed').toBeTruthy();
  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);
}

const DEMO_GRANT = [
  { client_id: '00000000-0000-4000-8000-000000000001', client_name: 'Demo Assistant', redirect_host: 'chatgpt.com',
    categories: ['profile', 'people'], created_at: '2026-10-13T10:00:00Z', revoked_at: null },
];

test('VTID-05133: Connected AI shows the connect steps, the demo assistant and the find-me switch (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);

  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**/.well-known/oauth-protected-resource/mcp/community', (r) =>
    r.fulfill({ json: { resource: 'https://preview-aws-gateway.vitanaland.com/mcp/community', authorization_servers: ['https://inmkhvwdcuyhnxkgfvsb.supabase.co/auth/v1'] } }),
  );
  await page.route('**/rest/v1/ai_connection_grants**', (r) => r.fulfill({ json: DEMO_GRANT }));
  await page.route('**/rest/v1/profile_privacy_settings**', (r) => r.fulfill({ json: { ai_discoverable: false } }));

  await page.goto('/connectors', { waitUntil: 'domcontentloaded' });
  const section = page.getByTestId('connected-ai-section');
  await expect(section).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('ai-connection-00000000-0000-4000-8000-000000000001')).toBeVisible();
  await expect(page.getByTestId('ai-discoverable-switch')).toHaveAttribute('aria-checked', 'false');

  await page.getByTestId('connect-chatgpt').click();
  await expect(page.getByTestId('ai-connect-url')).toHaveText(/\/mcp\/community\/chatgpt$/);
  await page.screenshot({ path: 'test-results/vtid-05133-connected-ai-phone.png', fullPage: false });
});

test('VTID-05133: the consent screen answers a stale authorization with the invalid state (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/commerce/connect/authorize?authorization_id=vtid-05133-not-a-real-authorization', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('connect-invalid')).toBeVisible({ timeout: 30_000 });
});
