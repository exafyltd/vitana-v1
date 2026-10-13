// VTID-05151 — tenant registry + generic community portal.
//
// /maxina is untouched (MaxinaPortal, no generic portal, no tenant switch)
// and the public registry RPC answers anonymously over GET with whitelisted
// fields only. (The generic portal's checks join this spec with the portal.)
//
// Read-only and signed out: './staging-guard' (copied in by the runner) aborts
// every write. Only GET page loads and GET RPC calls; no sign-in, no join, no
// form is submitted.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites: / https:\/\/preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const BRAND_KEYS = ['accent', 'bg', 'fg', 'logo_path', 'favicon_path', 'og_image_path'];
const LANDING_KEYS = ['tagline', 'intro', 'auto_switch_on_visit', 'post_login_path', 'oauth'];
const ROW_KEYS = ['brand', 'display_name', 'landing', 'locales', 'name', 'open_signup', 'slug', 'tenant_id'];

/** The anon key the staging build itself uses (read from its own bundle request headers). */
async function anonKey(page: import('@playwright/test').Page): Promise<string> {
  let key = '';
  page.on('request', (req) => {
    const k = req.headers()['apikey'];
    if (!key && k && req.url().startsWith(SUPABASE)) key = k;
  });
  await page.goto('/maxina', { waitUntil: 'networkidle' });
  expect(key, 'the staging build sends its Supabase anon key').not.toBe('');
  return key;
}

test('/maxina still renders MaxinaPortal, not the generic portal, and switches no tenant', async ({ page }) => {
  const switches: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/rpc/switch_to_tenant_by_slug')) switches.push(req.url());
  });
  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-maxina-app]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  await expect(page.locator('[data-screen="tenant-portal"]')).toHaveCount(0);
  expect(switches).toEqual([]);
  await page.goto('/_intro/maxina', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('video[poster]')).toHaveCount(1, { timeout: 30_000 });
});

test('the public registry answers anonymously over GET with whitelisted fields only', async ({ page, request }) => {
  const key = await anonKey(page);
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const list = await request.get(`${SUPABASE}/rest/v1/rpc/list_public_tenants`, { headers });
  expect(list.status()).toBe(200);
  const rows = (await list.json()) as Array<Record<string, unknown>>;
  const slugs = rows.map((r) => r.slug);
  expect(slugs).toEqual(expect.arrayContaining(['maxina', 'alkalma']));
  for (const r of rows) {
    expect(Object.keys(r).sort()).toEqual(ROW_KEYS);
    for (const k of Object.keys((r.brand ?? {}) as object)) expect(BRAND_KEYS).toContain(k);
    for (const k of Object.keys((r.landing ?? {}) as object)) expect(LANDING_KEYS).toContain(k);
  }
  const unknown = await request.get(`${SUPABASE}/rest/v1/rpc/resolve_tenant?p_slug=zz-unknown`, { headers });
  expect(unknown.status()).toBe(200);
  expect(await unknown.json()).toEqual([]);
});
