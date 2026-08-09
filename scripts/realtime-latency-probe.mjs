/**
 * Realtime message-latency probe.
 *
 * Measures the metric that decides whether the messenger "feels realtime":
 * the wall-clock time between a chat message being written and a subscribed
 * client receiving it over Supabase Realtime (the exact channel the messenger
 * UI relies on). This is the layer the PR #831 fixes target.
 *
 * It signs in as the e2e test user, opens a postgres_changes subscription on
 * `chat_messages` (filtered to the user, just like useGlobalMessages), then
 * sends N self-addressed probe rows and times each one's delivery.
 *
 * Run from the repo root (needs node_modules):
 *   ANON="<VITE_SUPABASE_PUBLISHABLE_KEY>" node scripts/realtime-latency-probe.mjs
 *
 * Optional env: ITER (default 10), E2E_EMAIL, E2E_PASS, SUPABASE_URL, TENANT_ID.
 *
 * NOTE: requires outbound WebSocket egress (wss) to Supabase. Some sandboxes
 * block WS — run it on a normal network / CI / device to get real numbers.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const ANON = process.env.ANON;
const EMAIL = process.env.E2E_EMAIL || 'e2e-test@vitana.dev';
const PASS = process.env.E2E_PASS || 'VitanaE2eTest2026!';
const ITER = Number(process.env.ITER || 10);
const PER_MSG_TIMEOUT_MS = 10_000;

if (!ANON) {
  console.error('Set ANON to the Supabase publishable (anon) key. Aborting.');
  process.exit(2);
}

const pct = (arr, p) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : NaN);

const supa = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });

const { data: auth, error: authErr } = await supa.auth.signInWithPassword({ email: EMAIL, password: PASS });
if (authErr) { console.error('AUTH FAILED:', authErr.message); process.exit(1); }
const uid = auth.user.id;
const token = auth.session.access_token;
console.log(`✓ signed in as ${EMAIL} (uid=${uid})`);

let tenantId = process.env.TENANT_ID;
if (!tenantId) {
  const { data } = await supa
    .from('chat_messages')
    .select('tenant_id')
    .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
    .not('tenant_id', 'is', null)
    .limit(1);
  tenantId = data?.[0]?.tenant_id;
}
if (!tenantId) { console.error('Could not resolve tenant_id; pass TENANT_ID env.'); process.exit(1); }

// Pending probe lookups keyed by the unique content tag.
const pending = new Map();

await supa.realtime.setAuth(token);

const subT0 = Date.now();
const subscribed = await new Promise((resolve) => {
  const timer = setTimeout(() => resolve(false), 15_000);
  supa
    .channel('latency-probe')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `receiver_id=eq.${uid}` },
      (payload) => {
        const tag = payload.new?.content;
        const p = tag && pending.get(tag);
        if (p) { p.resolve(Date.now()); pending.delete(tag); }
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(true); }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timer); resolve(false); }
    });
});

if (!subscribed) {
  console.error('✗ Realtime did NOT subscribe (WS blocked or unauthorized). Cannot measure.');
  process.exit(1);
}
console.log(`✓ realtime SUBSCRIBED in ${Date.now() - subT0}ms\n`);

const latencies = [];
const insertedIds = [];
const run = process.pid.toString(36) + Date.now().toString(36);

for (let i = 0; i < ITER; i++) {
  const tag = `__rtprobe__${run}__${i}`;
  const t0 = Date.now();
  const wait = new Promise((resolve, reject) => {
    pending.set(tag, { resolve });
    setTimeout(() => { if (pending.has(tag)) { pending.delete(tag); reject(new Error('timeout')); } }, PER_MSG_TIMEOUT_MS);
  });
  const { data: ins, error: insErr } = await supa
    .from('chat_messages')
    .insert({ sender_id: uid, receiver_id: uid, tenant_id: tenantId, content: tag })
    .select('id')
    .single();
  if (insErr) { console.error(`  [${i}] insert failed: ${insErr.message}`); continue; }
  if (ins?.id) insertedIds.push(ins.id);
  try {
    const t1 = await wait;
    const ms = t1 - t0;
    latencies.push(ms);
    console.log(`  [${i}] delivered in ${ms}ms`);
  } catch {
    console.log(`  [${i}] NOT delivered within ${PER_MSG_TIMEOUT_MS}ms`);
  }
  await new Promise((r) => setTimeout(r, 300));
}

console.log('\n── Realtime delivery latency (send → received by subscriber) ──');
console.log(`  samples : ${latencies.length}/${ITER}`);
if (latencies.length) {
  console.log(`  min     : ${Math.min(...latencies)}ms`);
  console.log(`  avg     : ${avg(latencies)}ms`);
  console.log(`  p50     : ${pct(latencies, 50)}ms`);
  console.log(`  p95     : ${pct(latencies, 95)}ms`);
  console.log(`  max     : ${Math.max(...latencies)}ms`);
  const slow = latencies.filter((m) => m > 1000).length;
  console.log(`\n  ${slow === 0 ? '✓' : '⚠'} ${latencies.length - slow}/${latencies.length} delivered in <1s (realtime-feel threshold)`);
}

// Best-effort cleanup of probe rows (RLS may deny user deletes — non-fatal).
if (insertedIds.length) {
  const { error: delErr } = await supa.from('chat_messages').delete().in('id', insertedIds);
  console.log(delErr ? `\n(cleanup skipped: ${delErr.message})` : `\n(cleaned up ${insertedIds.length} probe rows)`);
}
process.exit(0);
