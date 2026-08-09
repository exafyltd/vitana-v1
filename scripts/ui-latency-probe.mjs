/**
 * End-to-end UI message-appearance latency probe (Playwright).
 *
 * Measures what the user actually feels: time from a message being sent to it
 * rendering in the messenger DOM. Runs the real app (point BASE at a running
 * dev server or a deployed URL), logs in as the e2e test user by injecting a
 * Supabase session, opens a group chat, then sends uniquely-tagged messages
 * via the gateway and times each one's appearance in the conversation.
 *
 * Prereqs: a running frontend (default http://127.0.0.1:8080), WS egress to
 * Supabase, and Chromium (Playwright). Run from repo root:
 *   ANON="<anon key>" GROUP_ID="<uuid>" node scripts/ui-latency-probe.mjs
 *
 * Env: BASE, ANON (required), GROUP_ID (required), ITER (default 6),
 *      E2E_EMAIL, E2E_PASS, SUPABASE_URL, GATEWAY (default /api/v1 via BASE proxy).
 */
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.BASE || 'http://127.0.0.1:8080';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const SUPABASE_REF = SUPABASE_URL.split('//')[1].split('.')[0];
const ANON = process.env.ANON;
const EMAIL = process.env.E2E_EMAIL || 'e2e-test@vitana.dev';
const PASS = process.env.E2E_PASS || 'VitanaE2eTest2026!';
const GROUP_ID = process.env.GROUP_ID;
const ITER = Number(process.env.ITER || 6);
const GATEWAY = process.env.GATEWAY || `${BASE}/api/v1`;

if (!ANON || !GROUP_ID) { console.error('Set ANON and GROUP_ID. Aborting.'); process.exit(2); }

const supa = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
const { data: auth, error } = await supa.auth.signInWithPassword({ email: EMAIL, password: PASS });
if (error) { console.error('AUTH FAILED:', error.message); process.exit(1); }
const token = auth.session.access_token;
console.log(`✓ signed in as ${EMAIL}`);

const sendToGroup = async (content) => {
  const res = await fetch(`${GATEWAY}/chat/groups/${GROUP_ID}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`gateway send ${res.status}: ${(await res.text()).slice(0, 120)}`);
};

// Use a pre-installed Chromium when the pinned Playwright build isn't present
// (set CHROME_BIN, e.g. /opt/pw-browsers/chromium-1194/chrome-linux/chrome).
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone 14 size

// Seed localStorage with the session on the app origin, then load the group route.
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate(([ref, session, tok]) => {
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session));
  localStorage.setItem('vitana.authToken', tok);
  localStorage.setItem('vitana.viewRole', 'community');
}, [SUPABASE_REF, auth.session, token]);

await page.goto(`${BASE}/inbox/g/${GROUP_ID}`, { waitUntil: 'domcontentloaded' });
// AuthProvider may force one reload to re-register identity; tolerate it.
await page.waitForTimeout(3000);
if (/\/login|\/auth/.test(page.url())) { console.error(`✗ not authenticated (at ${page.url()})`); await browser.close(); process.exit(1); }

// Wait until the conversation surface is present (message composer textbox).
try {
  await page.locator('textarea, [contenteditable="true"], input[type="text"]').first().waitFor({ timeout: 20000 });
} catch { console.error('✗ conversation composer never appeared; page may not have loaded the group.'); }
console.log(`✓ group chat open at ${page.url()}\n`);

const latencies = [];
const run = Date.now().toString(36);
for (let i = 0; i < ITER; i++) {
  const tag = `rtui-${run}-${i}-${Math.floor(Math.random() * 1e6)}`;
  const t0 = Date.now();
  await sendToGroup(tag);
  // Poll the DOM for the tag to appear.
  let appeared = -1;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const found = await page.locator(`text=${tag}`).count().catch(() => 0);
    if (found > 0) { appeared = Date.now(); break; }
    await page.waitForTimeout(50);
  }
  if (appeared > 0) { const ms = appeared - t0; latencies.push(ms); console.log(`  [${i}] appeared in DOM after ${ms}ms`); }
  else console.log(`  [${i}] did NOT appear within 15s`);
  await page.waitForTimeout(500);
}

const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : NaN);
const pct = (a, p) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };
console.log('\n── UI appearance latency (gateway send → visible in DOM) ──');
console.log(`  samples : ${latencies.length}/${ITER}`);
if (latencies.length) {
  console.log(`  min ${Math.min(...latencies)}ms  avg ${avg(latencies)}ms  p50 ${pct(latencies, 50)}ms  max ${Math.max(...latencies)}ms`);
  const slow = latencies.filter((m) => m > 2000).length;
  console.log(`  ${slow === 0 ? '✓' : '⚠'} ${latencies.length - slow}/${latencies.length} visible within 2s`);
}
await browser.close();
process.exit(0);
