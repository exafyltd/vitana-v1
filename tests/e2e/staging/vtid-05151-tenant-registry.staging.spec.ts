// VTID-05151 — tenant registry + generic community portal.
//
// /maxina is untouched (MaxinaPortal, no generic portal, no tenant switch),
// an unknown or malformed slug is NotFound (a malformed one without any
// registry call), /alkalma is the generic portal with its own name and the
// sign-up tab, the public registry RPC answers anonymously over GET with
// whitelisted fields only, and no live tenant slug collides with a reserved
// route.
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

test('an unknown slug is NotFound; a malformed slug is NotFound without a registry call', async ({ page }) => {
  const resolves: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/rpc/resolve_tenant')) resolves.push(req.url());
  });
  const unknown = `zz-unknown-${Date.now().toString(36)}`;
  await page.goto(`/${unknown}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('404')).toBeVisible({ timeout: 30_000 });
  expect(resolves.some((u) => u.includes(`p_slug=${unknown}`))).toBe(true);

  resolves.length = 0;
  // An underscore never appears in a tenant slug: rejected before any call.
  await page.goto('/bad_slug', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('404')).toBeVisible({ timeout: 30_000 });
  expect(resolves).toEqual([]);
});

test('/alkalma is the generic portal with its name and the sign-up tab', async ({ page }) => {
  await page.goto('/alkalma', { waitUntil: 'domcontentloaded' });
  const portal = page.locator('[data-screen="tenant-portal"]');
  await expect(portal).toBeVisible({ timeout: 30_000 });
  await expect(portal.locator('[data-tenant-name]')).toHaveText('AlKalma');
  await expect(page.getByRole('tab')).toHaveCount(2);
  await page.getByRole('tab').nth(1).click();
  await expect(page.locator('#tenant-signup-email')).toBeVisible();
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

test('no live tenant slug is a reserved route', async ({ page, request }) => {
  const key = await anonKey(page);
  const reserved = await request.get('/reserved-tenant-slugs.json');
  expect(reserved.status()).toBe(200);
  const { reserved: list, legacy_tenant_routes: legacy } = (await reserved.json()) as { reserved: string[]; legacy_tenant_routes: string[] };
  expect(list).toEqual(expect.arrayContaining(['home', 'commerce', 'api']));
  const rows = (await (
    await request.get(`${SUPABASE}/rest/v1/rpc/list_public_tenants`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  ).json()) as Array<{ slug: string }>;
  const clash = rows.map((r) => r.slug).filter((s) => !legacy.includes(s) && list.includes(s));
  expect(clash).toEqual([]);
});
