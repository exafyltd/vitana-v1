/**
 * Playwright screenshots with single comprehensive request handler.
 * ALL requests pass through one handler — localhost continues, external is mocked/blocked.
 */
const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const MOCK_PORT = 3099;
const VITE_PORT = 8080;
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

const MOCK_USER = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  aud: 'authenticated', role: 'authenticated',
  email: 'test@vitana.dev',
  email_confirmed_at: '2026-04-01T00:00:00.000Z',
  created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Test User' },
  identities: [],
};

const MOCK_SESSION = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJlbWFpbCI6InRlc3RAdml0YW5hLmRldiIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzE1MDAwMDAwfQ.fake',
  token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh-token',
  user: MOCK_USER,
};

async function waitForPort(port, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { if (await fetch(`http://localhost:${port}/`).catch(() => null)) return; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Port ${port} not ready`);
}

async function cdpScreenshot(page, filePath) {
  const cdp = await page.context().newCDPSession(page);
  const m = await cdp.send('Page.getLayoutMetrics');
  const w = Math.ceil(m.cssContentSize.width);
  const h = Math.min(Math.ceil(m.cssContentSize.height), 16384);
  await cdp.send('Emulation.setDeviceMetricsOverride', { mobile: false, width: w, height: h, deviceScaleFactor: 1 });
  const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  fs.writeFileSync(filePath, Buffer.from(r.data, 'base64'));
  await cdp.detach();
}

async function setupPage(context, role) {
  await context.addInitScript(({ session, role }) => {
    try {
      localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(session));
      localStorage.setItem('vitana.authToken', session.access_token);
      localStorage.setItem('vitana.viewRole', role);
    } catch {}
  }, { session: MOCK_SESSION, role });

  const page = await context.newPage();

  // ONE handler for ALL requests
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch { return route.continue(); }

    // 1. Allow localhost requests (Vite dev server, HMR, mock API, assets)
    //    BUT intercept localhost /api/v1/autopilot calls -> mock server
    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
      if (parsedUrl.pathname.includes('/api/v1/autopilot/') || parsedUrl.pathname.includes('/api/v1/admin/autopilot/')) {
        const mockUrl = `http://localhost:${MOCK_PORT}${parsedUrl.pathname}${parsedUrl.search}`;
        try {
          const resp = await fetch(mockUrl, {
            method, headers: { 'Content-Type': 'application/json' },
            body: method !== 'GET' ? route.request().postData() : undefined,
          });
          return route.fulfill({ status: resp.status, contentType: 'application/json', body: await resp.text() });
        } catch { return route.continue(); }
      }
      // Other localhost requests: let them through to Vite
      return route.continue();
    }

    // 2. Supabase auth
    if (url.includes('inmkhvwdcuyhnxkgfvsb')) {
      if (url.includes('/auth/v1/token')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SESSION) });
      }
      if (url.includes('/auth/v1/user')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) });
      }
      if (url.includes('/auth/v1/')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { session: MOCK_SESSION } }) });
      }
      if (url.includes('/rest/v1/profiles')) {
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify([{ user_id: MOCK_USER.id, full_name: 'Test User', active_role: role, tenant_id: 'mock-tenant' }]),
          headers: { 'content-range': '0-0/1' },
        });
      }
      if (url.includes('/rest/v1/user_tenants')) {
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify([{ tenant_id: 'mock-tenant', user_id: MOCK_USER.id, is_primary: true }]),
          headers: { 'content-range': '0-0/1' },
        });
      }
      if (url.includes('/rest/v1/')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]', headers: { 'content-range': '0-0/0' } });
      }
      if (url.includes('/realtime/')) {
        return route.abort();
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }

    // 3. Gateway API
    if (url.includes('gateway')) {
      if (url.includes('/autopilot/')) {
        const mockUrl = `http://localhost:${MOCK_PORT}${parsedUrl.pathname}${parsedUrl.search}`;
        try {
          const resp = await fetch(mockUrl, {
            method, headers: { 'Content-Type': 'application/json' },
            body: method !== 'GET' ? route.request().postData() : undefined,
          });
          return route.fulfill({ status: resp.status, contentType: 'application/json', body: await resp.text() });
        } catch {}
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"data":[]}' });
    }

    // 4. Block everything else (fonts, analytics, etc.)
    return route.abort();
  });

  return page;
}

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  console.log('Starting mock API...');
  const mockProc = spawn('node', ['mock-api.cjs'], { cwd: __dirname, stdio: 'pipe' });
  mockProc.stdout.on('data', d => process.stdout.write(`[mock] ${d}`));
  mockProc.stderr.on('data', d => process.stderr.write(`[mock-err] ${d}`));
  await waitForPort(MOCK_PORT, 10000);
  console.log('Mock API ready');

  console.log('Starting Vite...');
  const viteProc = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', String(VITE_PORT)], {
    cwd: __dirname, stdio: 'pipe', env: { ...process.env, NODE_ENV: 'development' },
  });
  viteProc.stdout.on('data', d => process.stdout.write(`[vite] ${d}`));
  viteProc.stderr.on('data', () => {});
  await waitForPort(VITE_PORT, 30000);
  console.log('Vite ready\n');

  try {
    const browser = await chromium.launch({
      headless: true,
      executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // ── 1. My Journey Mobile ──────────────────────────────────
    console.log('1. My Journey (Mobile 430x932)...');
    const ctx1 = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const p1 = await setupPage(ctx1, 'community');
    p1.on('console', m => { if (m.type() === 'error') console.log(`   [console.error] ${m.text().slice(0,150)}`); });

    await p1.goto(`http://localhost:${VITE_PORT}/autopilot`, { waitUntil: 'commit', timeout: 15000 });
    await p1.waitForTimeout(10000);

    const text1 = await p1.evaluate(() => document.body?.innerText?.slice(0, 300) || '(empty)');
    console.log(`   Page text: "${text1.replace(/\n/g, ' ').slice(0, 100)}"`);

    await cdpScreenshot(p1, path.join(SCREENSHOT_DIR, '01-my-journey-mobile.png'));
    console.log('   Saved: 01-my-journey-mobile.png');
    await ctx1.close();

    // ── 2. My Journey Desktop ─────────────────────────────────
    console.log('2. My Journey (Desktop 1440x900)...');
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p2 = await setupPage(ctx2, 'community');

    await p2.goto(`http://localhost:${VITE_PORT}/autopilot`, { waitUntil: 'commit', timeout: 15000 });
    await p2.waitForTimeout(10000);

    const text2 = await p2.evaluate(() => document.body?.innerText?.slice(0, 300) || '(empty)');
    console.log(`   Page text: "${text2.replace(/\n/g, ' ').slice(0, 100)}"`);

    await cdpScreenshot(p2, path.join(SCREENSHOT_DIR, '02-my-journey-desktop.png'));
    console.log('   Saved: 02-my-journey-desktop.png');
    await ctx2.close();

    // ── 3. Admin Planning Desktop ─────────────────────────────
    console.log('3. Admin Planning (Desktop 1440x900)...');
    const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p3 = await setupPage(ctx3, 'admin');

    await p3.goto(`http://localhost:${VITE_PORT}/admin/autopilot/planning`, { waitUntil: 'commit', timeout: 15000 });
    await p3.waitForTimeout(10000);

    const text3 = await p3.evaluate(() => document.body?.innerText?.slice(0, 300) || '(empty)');
    console.log(`   Page text: "${text3.replace(/\n/g, ' ').slice(0, 100)}"`);

    await cdpScreenshot(p3, path.join(SCREENSHOT_DIR, '03-admin-planning-desktop.png'));
    console.log('   Saved: 03-admin-planning-desktop.png');
    await ctx3.close();

    await browser.close();
    console.log('\n=== Done ===');
    viteProc.kill(); mockProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    viteProc.kill(); mockProc.kill();
    process.exit(1);
  }
}

main();
