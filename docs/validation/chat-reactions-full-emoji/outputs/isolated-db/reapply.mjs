import fs from 'node:fs'; import pg from 'pg';
const db = new pg.Client({ host: '127.0.0.1', port: 54329, user: 'postgres', database: 'isodb' }); await db.connect();
const before = (await db.query('SELECT count(*)::int n FROM public.message_reactions')).rows[0].n;
await db.query(fs.readFileSync(process.env.MIGRATION_FILE, 'utf8'));
const after = (await db.query('SELECT count(*)::int n FROM public.message_reactions')).rows[0].n;
const fk = (await db.query(`SELECT count(*)::int n FROM pg_constraint WHERE conrelid='public.message_reactions'::regclass AND conname='message_reactions_emoji_fk'`)).rows[0].n;
const lookup = (await db.query('SELECT count(*)::int n FROM public.message_reaction_emojis')).rows[0].n;
console.log(JSON.stringify({ second_apply: 'ok', rows_before: before, rows_after: after, fk_count: fk, lookup_rows: lookup })); await db.end();
