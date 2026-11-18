// Rollback rehearsal on the ISOLATED database (127.0.0.1:54329 only, built from the repo's migrations).
// Adds reactions outside the original six first, then runs one rollback mode and reports exactly what happened.
// MODE=naive  : the header's six statements as separate autocommit statements
// MODE=tx     : the same statements in one transaction (all or nothing)
// MODE=delete : backup, delete the outside-six rows, then the transaction version
import pg from 'pg';

const MODE = process.env.MODE ?? 'tx';
const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const MSG = '33333333-3333-4333-8333-333333333333';
const MSG2 = '44444444-4444-4444-8444-444444444444';
const db = new pg.Client({ host: '127.0.0.1', port: 54329, user: 'postgres', database: 'isodb' });
await db.connect();

const snap = async () => (await db.query('SELECT message_id,user_id,emoji,created_at FROM public.message_reactions ORDER BY message_id,user_id,emoji')).rows;
const counts = async () => (await db.query(`SELECT count(*)::int total, count(*) FILTER (WHERE emoji IN ('👍','❤️','😂','😮','🙏','🎉'))::int six, count(*) FILTER (WHERE emoji NOT IN ('👍','❤️','😂','😮','🙏','🎉'))::int outside FROM public.message_reactions`)).rows[0];

// 1. Reactions outside the original six, written while the migration is live (as the cap and FK allow).
await db.query(`INSERT INTO public.message_reactions (message_id,user_id,emoji,created_at) VALUES
  ($1,$2,'🍎', now()), ($1,$2,'🌻', now()), ($1,$3,'🍎', now()), ($4,$3,'🔥', now())`, [MSG, ALICE, BOB, MSG2]);
const before = await snap();
const beforeCounts = await counts();
console.log(`before rollback: ${JSON.stringify(beforeCounts)}`);

const STEPS = [
  'DROP TRIGGER IF EXISTS message_reactions_cap ON public.message_reactions',
  'DROP FUNCTION IF EXISTS public.enforce_message_reaction_cap()',
  'ALTER TABLE public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_emoji_fk',
  "ALTER TABLE public.message_reactions ADD CONSTRAINT message_reactions_emoji_check CHECK (emoji IN ('👍','❤️','😂','😮','🙏','🎉'))",
  'DROP TABLE IF EXISTS public.message_reaction_emojis',
];

async function report(label) {
  const after = await snap();
  const cons = (await db.query(`SELECT conname FROM pg_constraint WHERE conrelid='public.message_reactions'::regclass ORDER BY 1`)).rows.map((r) => r.conname);
  const trg = (await db.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgrelid='public.message_reactions'::regclass AND tgname='message_reactions_cap'`)).rows[0].n;
  const table = (await db.query(`SELECT to_regclass('public.message_reaction_emojis')::text t`)).rows[0].t;
  console.log(JSON.stringify({ label, counts: await counts(), rows_identical_to_before: JSON.stringify(after) === JSON.stringify(before), constraints: cons, cap_trigger: trg, lookup_table: table }));
}

if (MODE === 'naive') {
  for (const s of STEPS) {
    try { await db.query(s); console.log('ok   ', s.slice(0, 70)); }
    catch (e) { console.log('FAIL ', s.slice(0, 70), '->', e.message); break; }
  }
  await report('naive: statements run one by one (autocommit)');
}

if (MODE === 'tx' || MODE === 'delete') {
  if (MODE === 'delete') {
    await db.query('CREATE TABLE public.message_reactions_outside_six_backup AS SELECT * FROM public.message_reactions WHERE emoji NOT IN (\'👍\',\'❤️\',\'😂\',\'😮\',\'🙏\',\'🎉\')');
    const bk = (await db.query('SELECT count(*)::int n FROM public.message_reactions_outside_six_backup')).rows[0].n;
    console.log(`backup written: ${bk} rows`);
    await db.query("DELETE FROM public.message_reactions WHERE emoji NOT IN ('👍','❤️','😂','😮','🙏','🎉')");
    console.log('deleted outside-six rows');
  }
  await db.query('BEGIN');
  try {
    for (const s of STEPS) await db.query(s);
    await db.query('COMMIT');
    console.log('committed');
  } catch (e) {
    await db.query('ROLLBACK');
    console.log('ROLLED BACK ALL STATEMENTS ->', e.message);
  }
  await report(`${MODE}: single transaction`);
  if (MODE === 'delete') {
    const bk = (await db.query('SELECT message_id,user_id,emoji FROM public.message_reactions_outside_six_backup ORDER BY 1,2,3')).rows;
    console.log('backup rows (recoverable only from this table):', JSON.stringify(bk));
  }
}
await db.end();
