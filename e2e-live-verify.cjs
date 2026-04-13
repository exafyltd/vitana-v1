/**
 * Live site verification — screenshots of the deployed community app.
 * Uses real Supabase auth to log in, then screenshots /autopilot.
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'live');
const SUPABASE_URL = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWtodndkY3V5aG54a2dmdnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjY2MzcsImV4cCI6MjA3MTQ0MjYzN30._-QX8ZFgDsKgLM7eDlyc64vi73F-Hwc4ttnDPHjZgVw';
const COMMUNITY_URL = 'https://community-app-q74ibpv6ia-uc.a.run.app';

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

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // Step 1: Sign in via Supabase REST API
  console.log('Signing into Supabase...');
  const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify({ email: 'e2e-test@vitana.dev', password: 'VitanaE2eTest2026!' }),
  });

  if (!signInRes.ok) {
    console.error('Auth failed:', signInRes.status, await signInRes.text());
    process.exit(1);
  }

  const session = await signInRes.json();
  console.log(`Authenticated: ${session.user?.email} (${session.user?.id?.slice(0,8)}...)`);

  // Step 2: Launch browser
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ── My Journey Mobile ─────────────────────────────────────
  console.log('\n1. My Journey (Mobile 430x932)...');
  const ctx1 = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const p1 = await ctx1.newPage();

  // Navigate to app, inject auth, reload
  await p1.goto(COMMUNITY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p1.evaluate(({ s }) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, { s: session });
  await p1.goto(`${COMMUNITY_URL}/autopilot`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p1.waitForTimeout(8000);

  const text1 = await p1.evaluate(() => document.body?.innerText?.slice(0, 300) || '(empty)');
  console.log(`   Text: "${text1.replace(/\n/g, ' ').slice(0, 120)}"`);

  await cdpScreenshot(p1, path.join(SCREENSHOT_DIR, '01-live-my-journey-mobile.png'));
  console.log('   Saved: live/01-live-my-journey-mobile.png');
  await ctx1.close();

  // ── My Journey Desktop ────────────────────────────────────
  console.log('2. My Journey (Desktop 1440x900)...');
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage();

  await p2.goto(COMMUNITY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p2.evaluate(({ s }) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, { s: session });
  await p2.goto(`${COMMUNITY_URL}/autopilot`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p2.waitForTimeout(8000);

  const text2 = await p2.evaluate(() => document.body?.innerText?.slice(0, 300) || '(empty)');
  console.log(`   Text: "${text2.replace(/\n/g, ' ').slice(0, 120)}"`);

  await cdpScreenshot(p2, path.join(SCREENSHOT_DIR, '02-live-my-journey-desktop.png'));
  console.log('   Saved: live/02-live-my-journey-desktop.png');
  await ctx2.close();

  await browser.close();
  console.log('\n=== Live verification complete ===');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
