/**
 * Quick debug: what does the page actually show?
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SUPABASE_URL = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const SUPABASE_STORAGE_KEY = 'sb-inmkhvwdcuyhnxkgfvsb-auth-token';
const MOCK_SESSION = {
  access_token: 'eyMock.eyJzdWIiOiJhMWIyYzNkNCIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6OTk5OTk5OTk5OX0.mock',
  token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh',
  user: {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    aud: 'authenticated', role: 'authenticated',
    email: 'test@vitana.dev',
    email_confirmed_at: '2026-04-01T00:00:00.000Z',
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'Test User' },
    identities: [],
  },
};

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Seed auth into localStorage before any page loads
  await ctx.addInitScript(({ key, session }) => {
    try { localStorage.setItem(key, JSON.stringify(session)); } catch {}
  }, { key: SUPABASE_STORAGE_KEY, session: MOCK_SESSION });

  const page = await ctx.newPage();

  // Collect console messages
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE_ERROR] ${err.message}`));

  // Intercept Supabase auth
  await page.route(`${SUPABASE_URL}/auth/v1/**`, async (route) => {
    const url = route.request().url();
    console.log('  [intercept-auth]', url.replace(SUPABASE_URL, ''));
    if (url.includes('/token')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SESSION) });
    } else if (url.includes('/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SESSION.user) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });

  // Intercept REST
  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
    const url = route.request().url();
    console.log('  [intercept-rest]', url.replace(SUPABASE_URL, '').slice(0, 80));
    if (url.includes('profiles')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ user_id: MOCK_SESSION.user.id, full_name: 'Test User', active_role: 'community' }]) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
  });

  // Intercept realtime
  await page.route(`${SUPABASE_URL}/realtime/**`, route => route.abort());

  // Block fonts
  await page.route('**/*.woff2', route => route.abort());
  await page.route('**/fonts.googleapis.com/**', route => route.abort());

  console.log('Navigating to /autopilot...');
  await page.goto('http://localhost:8080/autopilot', { timeout: 15000, waitUntil: 'commit' }).catch(e => console.log('Nav error:', e.message));

  // Wait for things to settle
  await page.waitForTimeout(8000);

  // Check what URL we ended up at
  const currentUrl = page.url();
  console.log('\nFinal URL:', currentUrl);

  // Get visible text
  const text = await page.evaluate(() => document.body?.innerText?.slice(0, 2000) || '(empty body)');
  console.log('\nVisible text (first 2000 chars):');
  console.log(text);

  // Get HTML size
  const htmlSize = await page.evaluate(() => document.documentElement.outerHTML.length);
  console.log('\nHTML size:', htmlSize, 'chars');

  // Check localStorage
  const authKey = await page.evaluate((key) => {
    try { return localStorage.getItem(key)?.slice(0, 100) || '(not set)'; } catch { return '(error)'; }
  }, SUPABASE_STORAGE_KEY);
  console.log('Auth in localStorage:', authKey);

  // Print relevant console logs
  console.log('\nConsole logs (last 30):');
  logs.slice(-30).forEach(l => console.log('  ', l));

  // Take a regular viewport screenshot for debugging (no CDP)
  const ssPath = path.join(__dirname, 'screenshots', 'debug.png');
  if (!fs.existsSync(path.dirname(ssPath))) fs.mkdirSync(path.dirname(ssPath), { recursive: true });
  // Use basic page screenshot with a short timeout
  try {
    await page.evaluate(() => {
      // Force fonts loaded
      const s = document.createElement('style');
      s.textContent = '* { font-family: system-ui, sans-serif !important; }';
      document.head.appendChild(s);
    });
    const buf = await page.screenshot({ timeout: 5000 }).catch(() => null);
    if (buf) {
      fs.writeFileSync(ssPath, buf);
      console.log('\nSaved debug screenshot:', ssPath);
    }
  } catch {}

  await browser.close();
}

main().catch(console.error);
