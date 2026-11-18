// Builds the isolated reactions database from the repository's own migration files.
// Usage: node setup-db.mjs <vitana-v1 checkout>
// Local Postgres on 127.0.0.1:54329 only; refuses any other host.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const v1 = process.argv[2];
if (!v1) throw new Error('usage: node setup-db.mjs <vitana-v1 checkout>');
const HOST = '127.0.0.1';
const PORT = 54329;
const mig = (f) => fs.readFileSync(path.join(v1, 'supabase/migrations', f), 'utf8');

export const IDS = {
  alice: '11111111-1111-4111-8111-111111111111', // mobile member
  bob: '22222222-2222-4222-8222-222222222222', // web member
  msg: '33333333-3333-4333-8333-333333333333', // direct message alice -> bob
};

async function main() {
  const admin = new pg.Client({ host: HOST, port: PORT, user: 'postgres', database: 'postgres' });
  await admin.connect();
  await admin.query('DROP DATABASE IF EXISTS isodb WITH (FORCE)');
  await admin.query('CREATE DATABASE isodb');
  await admin.end();

  const db = new pg.Client({ host: HOST, port: PORT, user: 'postgres', database: 'isodb' });
  await db.connect();
  const run = async (label, sql) => {
    await db.query(sql);
    console.log(`applied: ${label}`);
  };
  await run('00-supabase-base.sql', fs.readFileSync(new URL('./00-supabase-base.sql', import.meta.url), 'utf8'));
  // Original table, verbatim (six-value CHECK, RLS, publication).
  await run('20250918121049 (original message_reactions)', mig('20250918121049_bd093f57-f6c1-4669-92f9-5fe63bfba473.sql'));
  // Current reactions RPC, section 3 of the chat-access migration, verbatim.
  const access = mig('20260522120000_vtid_03089_chat_access_stable.sql');
  const rpc = access.slice(access.indexOf('-- ── 3.'), access.indexOf('-- ── 4.'));
  if (!rpc.includes('get_message_reactions_text')) throw new Error('RPC section not found');
  await run('20260522120000 §3 (get_message_reactions_text)', rpc);

  // Members, profiles and one direct message between them.
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1,'alice@local.test'),($2,'bob@local.test')`, [IDS.alice, IDS.bob]);
  await db.query(`INSERT INTO public.profiles (user_id, display_name) VALUES ($1,'Alice (mobile)'),($2,'Bob (web)')`, [IDS.alice, IDS.bob]);
  await db.query(`INSERT INTO public.chat_messages (id, sender_id, receiver_id, body) VALUES ($1,$2,$3,'hello')`, [IDS.msg, IDS.alice, IDS.bob]);

  // Existing reactions before the migration: every one of the six, as stored today.
  const six = ['👍', '❤️', '😂', '😮', '🙏', '🎉'];
  for (const [i, e] of six.entries()) {
    await db.query('INSERT INTO public.message_reactions (message_id, user_id, emoji, created_at) VALUES ($1,$2,$3, now() - make_interval(mins => $4))', [IDS.msg, i % 2 ? IDS.alice : IDS.bob, e, 60 - i]);
  }
  const before = (await db.query('SELECT message_id, user_id, emoji, created_at FROM public.message_reactions ORDER BY created_at')).rows;

  // The change under test, verbatim.
  await run('20261117120000_message_reactions_full_emoji.sql', mig('20261117120000_message_reactions_full_emoji.sql'));

  const after = (await db.query('SELECT message_id, user_id, emoji, created_at FROM public.message_reactions ORDER BY created_at')).rows;
  const same = JSON.stringify(before) === JSON.stringify(after);
  const lookup = (await db.query('SELECT count(*)::int AS n FROM public.message_reaction_emojis')).rows[0].n;
  const cons = (await db.query(`SELECT conname FROM pg_constraint WHERE conrelid='public.message_reactions'::regclass ORDER BY 1`)).rows.map((r) => r.conname);
  console.log(JSON.stringify({ existing_rows_before: before.length, existing_rows_after: after.length, identical: same, lookup_rows: lookup, constraints: cons }));
  if (!same) throw new Error('existing reactions changed by the migration');
  await db.query(`NOTIFY pgrst, 'reload schema'`);
  await db.end();
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
