// VTID-04841 — "Talk to Vitana" in the AI setup sheet: Vitana drafts the
// business by voice and her draft opens the same review card.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// No voice session is started: the orb's startCommerceSetup is replaced by a
// counter, and the events the gateway widget (VTID-04840) dispatches are
// delivered inside the browser. The test never taps "Create my business" —
// creating writes, and staging shares the production database. The owner runs
// the one real voice setup on staging (owner decision 2026-10-02).
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const DRAFT = {
  website: 'https://kraeuter.example/',
  business: { display_name: 'Kräuterhaus', category: 'supplements_nutrition', country: 'DE', description: null, currency: 'EUR' },
  products: [
    { title: 'Kamillentee', description: null, price_cents: 490, currency: null, url: null, image: null, kind: 'product' },
    { title: 'Beratung', description: null, price_cents: null, currency: null, url: null, image: null, kind: 'service' },
  ],
  source: 'website',
  notes: [],
};

test('Talk to Vitana starts the commerce setup; her draft opens the review card', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  // A first-time supplier (no business), with AI setup switched on.
  await page.route('**/api/v1/partner-orgs/mine', (r) => r.fulfill({ json: { ok: true, organizations: [] } }));
  await page.route('**/api/v1/commerce/ai-setup/status', (r) => r.fulfill({ json: { ok: true, enabled: true } }));
  await page.route('**/api/v1/commerce/ai-setup/draft', (r) => r.fulfill({ json: { ok: true, draft: DRAFT } }));

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const anon = await page.evaluate(() => {
    const s = [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-'));
    return s ?? '';
  });
  const bundle = await (await request.get(anon)).text();
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
    sessionStorage.removeItem('vitana.commerce.autoRegisterShown');
  }, session);

  // The orb widget may load before or after the page code: whichever object
  // it installs, its startCommerceSetup only counts taps here.
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    const stub = () => { w.__commerceSetupStarts = ((w.__commerceSetupStarts as number) || 0) + 1; };
    let orb: Record<string, unknown> = { startCommerceSetup: stub, show: () => {}, hide: () => {} };
    Object.defineProperty(window, 'VitanaOrb', {
      configurable: true,
      get: () => orb,
      set: (v) => {
        orb = v && typeof v === 'object' ? v : orb;
        orb.startCommerceSetup = stub;
      },
    });
  });

  await page.goto('/commerce', { waitUntil: 'domcontentloaded' });

  const sheet = page.getByTestId('ai-setup');
  await expect(sheet).toBeVisible({ timeout: 30_000 });
  const talk = page.getByTestId('ai-talk');
  await expect(talk).toBeVisible();
  await talk.click();
  expect(await page.evaluate(() => (window as unknown as Record<string, number>).__commerceSetupStarts)).toBe(1);

  // Vitana is reading the site: the sheet shows it.
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('vitana:commerce-setup-reading', { detail: { website: 'https://kraeuter.example/' } })),
  );
  await expect(page.getByTestId('ai-website')).toHaveValue('https://kraeuter.example/');
  await expect(page.getByTestId('ai-read')).toBeDisabled();

  // Her draft arrives: the same review card, waiting for the missing price.
  await page.evaluate((draft) => window.dispatchEvent(new CustomEvent('vitana:commerce-setup-draft', { detail: { draft } })), DRAFT);
  await expect(page.getByTestId('ai-name')).toHaveValue('Kräuterhaus', { timeout: 10_000 });
  await expect(page.getByTestId('ai-products').locator('li')).toHaveCount(2);
  const create = page.getByTestId('ai-create');
  await expect(create).toBeDisabled();
  await page.getByTestId('ai-products').locator('li').nth(1).locator('input[inputmode="decimal"]').fill('30');
  await expect(create).toBeEnabled();
  // Never tapped: creating writes, and staging shares the production database.
});
