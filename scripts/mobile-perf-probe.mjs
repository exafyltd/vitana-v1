/**
 * Mobile screen synthetic load probe.
 *
 * Loads each of the 9 complained-about mobile screens in an iPhone-14 viewport
 * under Slow-4G + 4× CPU throttle, captures TTFB / FCP / LCP / load /
 * transfer-bytes, and compares each against a budget. Prints a JSON report and
 * exits non-zero on any breach so it doubles as a CI gate. When
 * GATEWAY_URL + ROUTINE_INGEST_TOKEN are set it also emits the breach as an
 * OASIS event (matching routines/mobile-synthetic-load-probe.md).
 *
 * Usage:
 *   COMMUNITY_URL=https://vitanaland.com node scripts/mobile-perf-probe.mjs
 *
 * Requires Playwright chromium (devDependency @playwright/test).
 */

import { chromium, devices } from 'playwright-core';

const COMMUNITY_URL = (process.env.COMMUNITY_URL || 'https://vitanaland.com').replace(/\/$/, '');
const GATEWAY_URL = process.env.GATEWAY_URL?.replace(/\/$/, '');
const INGEST_TOKEN = process.env.ROUTINE_INGEST_TOKEN;
const NAV_TIMEOUT_MS = 20_000;

// Screens + budgets — mirror routines/mobile-synthetic-load-probe.md and the
// e2e mobile-perf-targets fixture. Media Lab / Live Rooms get a looser budget.
const SCREENS = [
  { name: 'Events',       route: '/comm/events-meetups', lcp: 4000, load: 6000 },
  { name: 'Find a Match', route: '/comm/find-partner',   lcp: 4000, load: 6000 },
  { name: 'Chat History', route: '/inbox',               lcp: 4000, load: 6000 },
  { name: 'My Journey',   route: '/autopilot',           lcp: 4000, load: 6000 },
  { name: 'Settings',     route: '/settings',            lcp: 4000, load: 6000 },
  { name: 'Memory',       route: '/memory',              lcp: 4000, load: 6000 },
  { name: 'Media Lab',    route: '/comm/media-hub',      lcp: 4500, load: 7000 },
  { name: 'Live Rooms',   route: '/comm/live-rooms',     lcp: 4500, load: 7000 },
  { name: 'User Profile', route: '/me/profile',          lcp: 4000, load: 6000 },
];

// Slow-4G profile (bytes/s + latency) for CDP Network.emulateNetworkConditions.
const SLOW_4G = {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8, // ~1.6 Mbps
  uploadThroughput: (750 * 1024) / 8,          // ~750 Kbps
  latency: 150,
};

async function probeScreen(browser, screen) {
  const context = await browser.newContext({ ...devices['iPhone 14'] });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', SLOW_4G);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  let transfer = 0;
  client.on('Network.loadingFinished', (e) => { transfer += e.encodedDataLength || 0; });

  const result = { ...screen, ttfb_ms: 0, fcp_ms: 0, lcp_ms: 0, load_ms: 0, transfer_bytes: 0, timed_out: false };
  try {
    await page.goto(`${COMMUNITY_URL}${screen.route}`, { waitUntil: 'load', timeout: NAV_TIMEOUT_MS });
    const timing = await page.evaluate(() => new Promise((resolve) => {
      let lcp = 0;
      try {
        const po = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) lcp = e.startTime;
        });
        po.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch { /* unsupported */ }
      setTimeout(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const fcp = performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint');
        resolve({
          ttfb: nav ? nav.responseStart : 0,
          fcp: fcp ? fcp.startTime : 0,
          lcp,
          load: nav ? nav.loadEventEnd : 0,
        });
      }, 600);
    }));
    result.ttfb_ms = Math.round(timing.ttfb);
    result.fcp_ms = Math.round(timing.fcp);
    result.lcp_ms = Math.round(timing.lcp);
    result.load_ms = Math.round(timing.load);
  } catch {
    result.timed_out = true;
    result.load_ms = NAV_TIMEOUT_MS;
  } finally {
    result.transfer_bytes = transfer;
    await context.close();
  }
  return result;
}

function breachesFor(r) {
  const b = [];
  if (r.timed_out) b.push({ route: r.route, metric: 'TIMEOUT', value: NAV_TIMEOUT_MS });
  if (r.lcp_ms > r.lcp) b.push({ route: r.route, metric: 'LCP', value: r.lcp_ms, budget: r.lcp });
  if (r.load_ms > r.load) b.push({ route: r.route, metric: 'LOAD', value: r.load_ms, budget: r.load });
  return b;
}

async function emitOasis(breached, results) {
  if (!GATEWAY_URL || !INGEST_TOKEN) return null;
  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/events/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Routine-Token': INGEST_TOKEN },
      body: JSON.stringify({
        vtid: 'VTID-03177',
        type: 'mobile.screen.synthetic_slow',
        source: 'routine.mobile-synthetic-load-probe',
        status: 'warning',
        message: `${breached.length} screens over synthetic budget under throttle`,
        payload: { throttle: 'slow4g+4xcpu', breached, results },
      }),
    });
    return res.ok ? 'emitted' : `ingest_${res.status}`;
  } catch (e) {
    return `ingest_error:${e.message}`;
  }
}

async function main() {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const screen of SCREENS) {
      results.push(await probeScreen(browser, screen));
    }
  } finally {
    await browser.close();
  }

  const breached = results.flatMap(breachesFor);
  let oasis = null;
  if (breached.length) oasis = await emitOasis(breached, results);

  console.log(JSON.stringify({
    ok: breached.length === 0,
    throttle: 'slow4g+4xcpu',
    results,
    breached,
    oasis_event: oasis,
  }, null, 2));

  process.exit(breached.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(2);
});
