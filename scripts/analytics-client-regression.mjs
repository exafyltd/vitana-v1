/**
 * Product analytics client regression test (BOOTSTRAP-PRODUCT-ANALYTICS).
 *
 * Run: npm run test:analytics-client
 *
 * Bundles src/lib/product-analytics/* with esbuild and executes it against
 * stubbed browser globals, asserting:
 *   1. session id is stable across calls
 *   2. events batch and POST to /api/v1/analytics/events/batch (no doubled
 *      /api/v1 even though VITE_GATEWAY_URL includes it)
 *   3. consent=denied disables tracking entirely
 *   4. forbidden raw-text property keys never leave the client
 *   5. events tracked before tenant context are held, then sent with the
 *      tenant id once it arrives
 */

import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`ok - ${message}`);
}

// ── stub browser globals ────────────────────────────────────────────────────

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

const fetchCalls = [];
globalThis.sessionStorage = makeStorage();
globalThis.localStorage = makeStorage();
globalThis.window = { innerWidth: 1400, addEventListener: () => {} };
globalThis.document = { addEventListener: () => {}, visibilityState: 'visible' };
Object.defineProperty(globalThis, 'navigator', {
  value: { sendBeacon: () => true },
  configurable: true,
});
globalThis.location = { pathname: '/community', search: '' };
globalThis.fetch = async (url, init) => {
  fetchCalls.push({ url, body: JSON.parse(init.body) });
  return { ok: true, json: async () => ({ ok: true }) };
};

// ── bundle the client with a gateway URL that includes /api/v1 ──────────────

const outDir = mkdtempSync(join(tmpdir(), 'vitana-analytics-test-'));
const outFile = join(outDir, 'client.mjs');
await build({
  entryPoints: [resolve(repoRoot, 'src/lib/product-analytics/client.ts')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  define: {
    'import.meta.env': JSON.stringify({ VITE_GATEWAY_URL: 'https://gateway.vitanaland.com/api/v1' }),
  },
});

const client = await import(pathToFileURL(outFile).href);
const { track, setAnalyticsContext, setAnalyticsConsent, __analyticsInternals } = client;

// ── 1. stable session id ────────────────────────────────────────────────────

const sessionMod = await import(
  pathToFileURL(
    (await build({
      entryPoints: [resolve(repoRoot, 'src/lib/product-analytics/session.ts')],
      bundle: true,
      format: 'esm',
      outfile: join(outDir, 'session.mjs'),
    }),
    join(outDir, 'session.mjs'))
  ).href
);
const id1 = sessionMod.getOrCreateAnalyticsSessionId();
const id2 = sessionMod.getOrCreateAnalyticsSessionId();
assert(id1 && id1 === id2, 'session id is stable across calls');

// ── 2. pending until tenant context arrives ─────────────────────────────────

track('screen_viewed', { event_type: 'journey' });
assert(__analyticsInternals().pending.length === 1, 'events are held until tenant context is known');
assert(__analyticsInternals().buffer.length === 0, 'no event is buffered for send without a tenant id');

setAnalyticsContext({ tenantId: '11111111-1111-4111-8111-111111111111', userIdHash: 'abc123', language: 'de-DE' });
assert(__analyticsInternals().pending.length === 0, 'pending events drain once tenant context arrives');
assert(
  __analyticsInternals().buffer[0].tenant_id === '11111111-1111-4111-8111-111111111111',
  'drained events carry the tenant id',
);

// ── 3. batching + endpoint path ─────────────────────────────────────────────

for (let i = 0; i < 9; i++) track('navigation_clicked', { event_type: 'journey', feature_key: 'navigation' });
await new Promise((r) => setTimeout(r, 50));
assert(fetchCalls.length === 1, 'buffer flushes once it reaches 10 events');
assert(
  fetchCalls[0].url === 'https://gateway.vitanaland.com/api/v1/analytics/events/batch',
  'batch posts to /api/v1/analytics/events/batch with no doubled /api/v1',
);
assert(fetchCalls[0].body.events.length === 10, 'flush sends the batched events');
assert(fetchCalls[0].body.events[0].session_id, 'events carry a session id');
assert(
  fetchCalls[0].body.events.at(-1).user_id_hash === 'abc123',
  'events tracked after sign-in carry the hashed user id only',
);

// ── 4. forbidden raw-text keys never leave the client ───────────────────────

fetchCalls.length = 0;
track('user_message_sent', {
  event_type: 'assistant',
  conversation_id: 'c1',
  properties: {
    message: 'raw health question',
    prompt: 'p',
    raw_text: 'r',
    transcript: 't',
    answer: 'a',
    message_length: 19,
    input_mode: 'text',
  },
});
const queued = __analyticsInternals().buffer.at(-1);
assert(
  JSON.stringify(queued.properties) === JSON.stringify({ message_length: 19, input_mode: 'text' }),
  'forbidden raw-text property keys are stripped client-side',
);
assert(!JSON.stringify(queued).includes('raw health question'), 'raw message text never enters the queue');

// ── 5. consent=denied disables tracking ─────────────────────────────────────

setAnalyticsConsent('denied');
assert(__analyticsInternals().buffer.length === 0, 'denying consent clears the queue');
track('screen_viewed', {});
assert(__analyticsInternals().buffer.length === 0, 'no events are recorded while consent is denied');
assert(globalThis.localStorage.getItem('vitana_analytics_outbox') === null, 'outbox is cleared on denial');

rmSync(outDir, { recursive: true, force: true });
console.log('\nanalytics-client-regression: all assertions passed');
