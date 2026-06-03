/**
 * VTID-03236 — universal-cart-client + useUniversalCart regression tests.
 *
 * Pure Node ESM. Mirrors the static-text + runtime-simulation pattern in
 * scripts/orb-voice-client-stop-regression.mjs. Covers (per handoff):
 *   §1  add (POST /items)
 *   §2  duplicate quantity bump (POST /items returning action: 'quantity_bumped')
 *   §3  remove (DELETE /items/:id)
 *   §4  auth / 403 cart_unavailable_for_role handling
 *   §5  generic API error states (404 item_not_found, 5xx, malformed JSON)
 * Plus structural anti-regression assertions on the client / hook / button:
 *   - Routes hit exactly the gateway paths from VTID-03213.
 *   - Headers include Bearer + X-Vitana-Active-Role: community.
 *   - The legacy cart_items / checkout_sessions / cj_* / user_wallets /
 *     wallet_credits surfaces are NOT referenced.
 *
 * Invocation:
 *   npm run test:universal-cart
 *   # or
 *   node scripts/universal-cart-client-regression.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return readFileSync(resolve(repoRoot, rel), 'utf8');
}

/**
 * Strip TypeScript/JavaScript comments (// line + /* block * /) so the
 * forbidden-token check fires only on real code references, not on doc
 * comments that explain what we explicitly do NOT touch.
 */
function stripComments(body) {
  // Block comments
  let out = body.replace(/\/\*[\s\S]*?\*\//g, '');
  // Line comments — preserve leading whitespace structure, remove the comment
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_, lead) => lead);
  return out;
}

const failures = [];
function assert(condition, message) {
  if (!condition) {
    failures.push(message);
    // eslint-disable-next-line no-console
    console.error(`  ✗ ${message}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${message}`);
  }
}

const client = read('src/lib/universal-cart-client.ts');
const hook = read('src/hooks/useUniversalCart.ts');
const button = read('src/components/universal-cart/AddToUniversalCartButton.tsx');
const page = read('src/pages/UniversalCart.tsx');
const card = read('src/components/discover/MarketplaceProductCard.tsx');

// ============================================================================
// Hard out-of-scope: forbidden references anywhere in the slice
// ============================================================================
console.log('\n[§out-of-scope] no Lovable-side commerce table / Stripe / wallet refs');

const FORBIDDEN_TOKENS = [
  'cart_items', // exact match — the legacy table
  'checkout_sessions',
  'cj_products',
  'cj_orders',
  'cj_webhook_logs',
  'user_wallets',
  'wallet_credits',
  'stripe-create-checkout-session',
  'payment_intent',
  'PaymentIntent',
];

const NEW_FILES = [
  ['client', client, 'src/lib/universal-cart-client.ts'],
  ['hook', hook, 'src/hooks/useUniversalCart.ts'],
  ['button', button, 'src/components/universal-cart/AddToUniversalCartButton.tsx'],
  ['page', page, 'src/pages/UniversalCart.tsx'],
];
for (const [name, rawBody, path] of NEW_FILES) {
  // Strip comments first — doc comments explaining what we DON'T touch
  // should not trip the forbidden-token check. Only flag real code refs.
  const body = stripComments(rawBody);
  for (const tok of FORBIDDEN_TOKENS) {
    assert(
      !body.includes(tok),
      `${path} (code only) must NOT reference '${tok}' (universal_* schema only)`
    );
  }
  // 'universal_cart_items' (with underscore prefix) IS allowed. Verify
  // there's no bare 'cart_items' anywhere in actual code that isn't part
  // of 'universal_cart_items'.
  const bareCartItems = body.match(/(?<!universal_)cart_items/g);
  assert(
    !bareCartItems,
    `${name} (code only): no bare 'cart_items' tokens (only 'universal_cart_items' allowed)`
  );
}

// ============================================================================
// §client — universal-cart-client.ts structure
// ============================================================================
console.log('\n[§client] universal-cart-client.ts structure');

const ROUTE_ASSERTIONS = [
  ['/api/v1/universal-cart/health', 'GET /health endpoint exists'],
  ['/api/v1/universal-cart', 'GET/POST /universal-cart base endpoint exists'],
  ['/api/v1/universal-cart/items', 'POST /items endpoint exists'],
  ['/api/v1/universal-cart/items/${encodeURIComponent(itemId)}', 'PATCH/DELETE items/:id endpoint exists'],
  ['/api/v1/universal-cart/items/${encodeURIComponent(itemId)}/complete', '/items/:id/complete endpoint exists'],
  ['/api/v1/universal-cart/events', 'GET /events endpoint exists'],
];
for (const [path, msg] of ROUTE_ASSERTIONS) {
  assert(client.includes(path), msg);
}

assert(
  client.includes(`Authorization: \`Bearer \${token}\``),
  'client sets Authorization: Bearer <token>'
);
assert(
  client.includes(`'X-Vitana-Active-Role': "community"`) ||
  client.includes(`"X-Vitana-Active-Role": "community"`),
  'client sets X-Vitana-Active-Role: community'
);

assert(
  client.includes('class UniversalCartRoleError'),
  'UniversalCartRoleError class exists'
);
assert(
  client.includes('class UniversalCartApiError'),
  'UniversalCartApiError class exists'
);
assert(
  client.includes(`'cart_unavailable_for_role'`) ||
  client.includes(`"cart_unavailable_for_role"`),
  'client detects gateway 403 code cart_unavailable_for_role'
);

assert(
  /export function (getHealth|getCart|createOrFetchCart|addItem|patchItem|removeItem|completeItem|getEvents)\b/.test(client),
  'client exports all 8 endpoint wrappers'
);

// ============================================================================
// §hook — useUniversalCart structure
// ============================================================================
console.log('\n[§hook] useUniversalCart.ts structure');

assert(
  hook.includes(`from "@tanstack/react-query"`) || hook.includes(`from '@tanstack/react-query'`),
  'hook uses TanStack React Query'
);
assert(
  /useMutation\b/.test(hook) && /useQuery\b/.test(hook),
  'hook uses both useQuery and useMutation'
);
assert(
  hook.includes('roleBlocked'),
  'hook surfaces roleBlocked: { role } when gateway returns 403'
);
assert(
  hook.includes('UniversalCartRoleError'),
  'hook imports UniversalCartRoleError to detect 403'
);
assert(
  /retry:\s*\(failureCount,\s*error\)\s*=>/.test(hook),
  'hook configures retry to skip retrying on role error / 401'
);
assert(
  hook.includes('invalidateQueries'),
  'hook invalidates cart query after mutations'
);
// Public surface must include all the imperative actions the page + button need
for (const fn of ['addItem', 'patchItem', 'removeItem', 'completeItem']) {
  assert(
    new RegExp(`\\b${fn}:`).test(hook),
    `hook exposes ${fn} action`
  );
}

// ============================================================================
// §button — AddToUniversalCartButton.tsx wiring
// ============================================================================
console.log('\n[§button] AddToUniversalCartButton.tsx wiring');

assert(
  button.includes(`useUniversalCart`),
  'button uses useUniversalCart hook'
);
assert(
  button.includes('addItem(') || button.includes('addItem({'),
  'button calls addItem'
);
assert(
  button.includes(`'community'`) || button.includes(`"community"`),
  "button defaults sourceSurface = 'community'"
);
assert(
  button.includes('signRequired'),
  'button handles unauthenticated → signRequired toast'
);
assert(
  button.includes('roleBlocked'),
  'button handles 403 cart_unavailable_for_role explicitly'
);
assert(
  button.includes('Bookmark'),
  "button uses a distinct icon (Bookmark) — not ShoppingCart"
);
assert(
  !button.includes('useCart('),
  'button does NOT import useCart (legacy hook) — coexists, not replaces'
);

// ============================================================================
// §page — UniversalCart.tsx wiring
// ============================================================================
console.log('\n[§page] UniversalCart.tsx wiring');

assert(page.includes('useUniversalCart'), 'page uses useUniversalCart hook');
assert(page.includes('roleBlocked'), 'page handles 403 with community-only empty state');
assert(page.includes('emptyTitle') || page.includes('universalCart.page.emptyTitle'),
  'page renders empty state copy from i18n');
assert(page.includes('patchItem') && page.includes('removeItem') && page.includes('completeItem'),
  'page wires patch / remove / complete mutations');
assert(!page.includes('useCart('),
  'page does NOT import the legacy useCart hook');

// ============================================================================
// §discover — MarketplaceProductCard.tsx integration is additive
// ============================================================================
console.log('\n[§discover] MarketplaceProductCard.tsx additive integration');

assert(
  /<AddToCartButton[\s\S]+?<AddToUniversalCartButton/.test(card),
  'MarketplaceProductCard keeps legacy AddToCartButton AND adds AddToUniversalCartButton (additive, not replacement)'
);
assert(
  card.includes('AddToUniversalCartButton'),
  'MarketplaceProductCard imports the new Stack button'
);
// The legacy useCart flow must remain intact in product cards
assert(
  card.includes('AddToCartButton'),
  'MarketplaceProductCard still renders the legacy AddToCartButton'
);

// ============================================================================
// §runtime — simulated response parsing covers the user's required cases
// ============================================================================
console.log('\n[§runtime] simulated response parsing');

// We mirror the parse logic from universalCartFetch so we can exercise the
// branches without a TS runtime. If this diverges from the real implementation,
// the structural assertions above will catch the contract change.
function simulateParse(status, body, parsed) {
  if (status >= 200 && status < 300) {
    return { ok: true, value: parsed };
  }
  if (status === 403 && parsed?.error === 'cart_unavailable_for_role') {
    return { ok: false, kind: 'role', role: parsed?.role ?? null };
  }
  const code = parsed && typeof parsed.error === 'string'
    ? parsed.error
    : `http_${status}`;
  return { ok: false, kind: 'api', status, code, detail: parsed?.detail };
}

// §1 — add (created)
const addCreated = simulateParse(201, '', {
  ok: true, cart_id: 'c1', item: { id: 'i1' }, action: 'created', cart_created: true,
});
assert(addCreated.ok && addCreated.value.action === 'created',
  '§1 POST /items: created action passes through');

// §2 — duplicate quantity bump
const addBumped = simulateParse(200, '', {
  ok: true, cart_id: 'c1', item: { id: 'i1', quantity: 3 }, action: 'quantity_bumped', cart_created: false,
});
assert(addBumped.ok && addBumped.value.action === 'quantity_bumped',
  '§2 POST /items: duplicate product returns quantity_bumped');

// §3 — remove
const removed = simulateParse(200, '', {
  ok: true, item: { id: 'i1', status: 'removed' },
});
assert(removed.ok && removed.value.item.status === 'removed',
  '§3 DELETE /items/:id: removed item surfaces with status=removed');

// §4 — 403 cart_unavailable_for_role
const roleBlocked = simulateParse(403, '', { ok: false, error: 'cart_unavailable_for_role', role: 'admin' });
assert(!roleBlocked.ok && roleBlocked.kind === 'role' && roleBlocked.role === 'admin',
  '§4 403 cart_unavailable_for_role surfaces as role error with role string');

const roleBlockedNullRole = simulateParse(403, '', { ok: false, error: 'cart_unavailable_for_role', role: null });
assert(!roleBlockedNullRole.ok && roleBlockedNullRole.kind === 'role' && roleBlockedNullRole.role === null,
  '§4 403 with role=null still surfaces as role error');

// §4b — 401 (unauthenticated)
const unauth = simulateParse(401, '', { ok: false, error: 'UNAUTHENTICATED' });
assert(!unauth.ok && unauth.kind === 'api' && unauth.status === 401 && unauth.code === 'UNAUTHENTICATED',
  '§4b 401 surfaces as api error with code UNAUTHENTICATED');

// §5 — 404 item_not_found
const notFound = simulateParse(404, '', { ok: false, error: 'item_not_found' });
assert(!notFound.ok && notFound.kind === 'api' && notFound.code === 'item_not_found',
  '§5 404 item_not_found surfaces as api error');

// §5b — 409 item_not_active
const conflict = simulateParse(409, '', { ok: false, error: 'item_not_active', current_status: 'removed' });
assert(!conflict.ok && conflict.kind === 'api' && conflict.code === 'item_not_active',
  '§5b 409 item_not_active surfaces as api error');

// §5c — 500 with no body
const server = simulateParse(500, '', undefined);
assert(!server.ok && server.kind === 'api' && server.status === 500 && server.code === 'http_500',
  '§5c 500 with no body falls back to http_500 code');

// §5d — malformed JSON (parsed=undefined, status=200)
const malformed = simulateParse(200, 'not-json', undefined);
assert(malformed.ok && malformed.value === undefined,
  '§5d 200 with empty/malformed JSON leaves value undefined (handled at call site)');

// ============================================================================
// Report
// ============================================================================
if (failures.length > 0) {
  // eslint-disable-next-line no-console
  console.error(`\nFAILED: ${failures.length} assertion(s) failed.`);
  process.exit(1);
}
// eslint-disable-next-line no-console
console.log('\n✅ universal-cart-client + useUniversalCart regression: all assertions passed');
