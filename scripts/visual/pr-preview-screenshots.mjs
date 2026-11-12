// Visual check for a PR preview (read-only). Signs in as the test user the same way the
// staging specs do, then screenshots the desktop sidebar and the mobile view.
// Needs TEST_USER_EMAIL and TEST_USER_PASSWORD in the environment. Nothing is written
// except the sign-in session (the staging-guard rule: no writes as the test account).
//
// Usage: PREVIEW_URL=https://d2w0cqhh9jhjpj.cloudfront.net/pr-1667 \
//        SUPABASE_URL=https://inmkhvwdcuyhnxkgfvsb.supabase.co node scripts/visual/pr-preview-screenshots.mjs <outDir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const email = process.env.TEST_USER_EMAIL ?? '';
const password = process.env.TEST_USER_PASSWORD ?? '';
if (!email || !password) {
  console.error('MISSING: set TEST_USER_EMAIL and TEST_USER_PASSWORD in this environment, then re-run.');
  process.exit(2);
}
const preview = process.env.PREVIEW_URL ?? 'https://d2w0cqhh9jhjpj.cloudfront.net/pr-1667';
const supabase = process.env.SUPABASE_URL ?? 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const outDir = process.argv[2] ?? '/tmp/visual-check';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

// Read the publishable (anon) key out of the built bundle, as the staging specs do.
await page.goto(`${preview}/`, { waitUntil: 'domcontentloaded' });
const bundleUrl = await page.evaluate(() => [...document.scripts].map((s) => s.src).find((s) => s.includes('/assets/index-')) ?? '');
const bundle = await (await ctx.request.get(bundleUrl)).text();
const key = [...bundle.matchAll(/eyJ[A-Za-z0-9_-]+\.(eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)].find((m) => {
  try {
    const p = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
    return p.role === 'anon';
  } catch { return false; }
})?.[0];
if (!key) { console.error('No publishable key found in the bundle'); process.exit(3); }

const res = await ctx.request.post(`${supabase}/auth/v1/token?grant_type=password`, {
  headers: { apikey: key, 'Content-Type': 'application/json' },
  data: { email, password },
});
const session = await res.json();
if (!session.access_token) { console.error('Sign-in failed (check TEST_USER_EMAIL / TEST_USER_PASSWORD)'); process.exit(4); }

await page.evaluate((s) => {
  const ref = new URL(s.user?.aud ? location.href : location.href).hostname;
  localStorage.setItem('vitana.authToken', s.access_token);
  localStorage.setItem('vitana.viewRole', 'community');
  localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
}, session);

for (const [name, vp] of [['desktop-1400x900', { width: 1400, height: 900 }], ['mobile-390x844', { width: 390, height: 844 }]]) {
  await page.setViewportSize(vp);
  await page.goto(`${preview}/home`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: false });
  console.log('saved', join(outDir, `${name}.png`));
}
await browser.close();
