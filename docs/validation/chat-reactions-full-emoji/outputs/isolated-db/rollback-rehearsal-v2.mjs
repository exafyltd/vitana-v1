// Rehearses the rollback procedure exactly as written in the migration header (extracted from the file).
// MODE=refuse : reactions outside the six exist; the precheck must refuse and nothing may change.
// MODE=clean  : no reaction outside the six exists; the procedure must succeed and restore the six-value CHECK.
// Runs on the ISOLATED database only (127.0.0.1:54329, built from the repo migrations by setup-db.mjs).
import fs from 'node:fs';
import pg from 'pg';

const MODE = process.env.MODE ?? 'refuse';
const MIG = process.env.MIGRATION_FILE;
const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const MSG = '33333333-3333-4333-8333-333333333333';
const MSG2 = '44444444-4444-4444-8444-444444444444';

// The procedure: the lines between "-- Step 2" and "-- If the precheck", without the comment marker.
const lines = fs.readFileSync(MIG, 'utf8').split('\n');
const start = lines.findIndex((l) => l.startsWith('-- Step 2'));
const end = lines.findIndex((l, i) => i > start && l.startsWith('-- If the precheck'));
const block = lines.slice(start + 1, end).filter((l) => l.startsWith('--')).map((l) => l.replace(/^--/, '').replace(/^ /, ''));
const selectLine = block.find((l) => /^SELECT count/.test(l.trim()));
const procedure = block.filter((l) => !/^SELECT count/.test(l.trim())).join('\n');
if (!selectLine || !/BEGIN;/.test(procedure) || !/COMMIT;/.test(procedure)) throw new Error('procedure not found in header');

const db = new pg.Client({ host: '127.0.0.1', port: 54329, user: 'postgres', database: 'isodb' });
await db.connect();
if (MODE === 'refuse') {
  await db.query(`INSERT INTO public.message_reactions (message_id,user_id,emoji,created_at) VALUES
    ($1,$2,'🍎',now()), ($1,$2,'🌻',now()), ($1,$3,'🍎',now()), ($4,$3,'🔥',now())`, [MSG, ALICE, BOB, MSG2]);
}
const snap = async () => (await db.query('SELECT message_id,user_id,emoji,created_at FROM public.message_reactions ORDER BY message_id,user_id,emoji')).rows;
const before = await snap();
const outside = (await db.query(`SELECT count(*)::int n FROM public.message_reactions WHERE emoji NOT IN ('👍','❤️','😂','😮','🙏','🎉')`)).rows[0].n;
console.log(`precheck (${selectLine.trim()}) = ${outside}`);

let result;
try {
  await db.query(procedure);
  result = 'procedure committed';
} catch (e) {
  await db.query('ROLLBACK').catch(() => undefined);
  result = `procedure refused and rolled back: ${e.message}`;
}
const after = await snap();
const cons = (await db.query(`SELECT conname FROM pg_constraint WHERE conrelid='public.message_reactions'::regclass ORDER BY 1`)).rows.map((r) => r.conname);
const trg = (await db.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgrelid='public.message_reactions'::regclass AND tgname='message_reactions_cap'`)).rows[0].n;
const table = (await db.query(`SELECT to_regclass('public.message_reaction_emojis')::text t`)).rows[0].t;
console.log(JSON.stringify({ mode: MODE, result, rows_before: before.length, rows_after: after.length, rows_identical: JSON.stringify(before) === JSON.stringify(after), constraints: cons, cap_trigger: trg, lookup_table: table }));
await db.end();
