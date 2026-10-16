// VTID-05206 — applies migration 20261016110000_vtid_05206_community_intro_opt_in.sql
// to a throwaway in-memory Postgres (PGlite) holding a live-shaped
// global_community_profiles (columns, both RLS policies, REPLICA IDENTITY FULL,
// the supabase_realtime publication — read-only from production 2026-10-16)
// and checks its behaviour. Never touches any real database.
// Run: node pglite-community-intro-check.mjs <path-to-migration>
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';

const migration = readFileSync(process.argv[2], 'utf8');
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};

const OLD1 = '11111111-1111-4111-8111-111111111111';
const OLD2 = '22222222-2222-4222-8222-222222222222';
const NEW1 = '33333333-3333-4333-8333-333333333333';
const NEW2 = '44444444-4444-4444-8444-444444444444';

async function base({ replicaFull = true } = {}) {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION public.is_community_user() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
    CREATE TABLE public.global_community_profiles (
      id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid NOT NULL UNIQUE,
      display_name text, avatar_url text, bio text, interests text[], location text,
      is_visible boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ${replicaFull ? 'ALTER TABLE public.global_community_profiles REPLICA IDENTITY FULL;' : ''}
    ALTER TABLE public.global_community_profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Authenticated users can view minimal global profiles" ON public.global_community_profiles
      FOR SELECT TO authenticated USING (is_visible = true);
    CREATE POLICY "Users can manage their own global profile" ON public.global_community_profiles
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND is_community_user());
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_community_profiles TO authenticated;
    GRANT SELECT ON public.global_community_profiles TO anon;
    CREATE PUBLICATION supabase_realtime FOR TABLE public.global_community_profiles;
    INSERT INTO public.global_community_profiles (user_id, display_name, created_at) VALUES
      ('${OLD1}', 'Old member', now() - interval '200 days'),
      ('${OLD2}', 'Joined yesterday', now() - interval '1 day');
  `);
  return db;
}

const opt = async (db, u) =>
  (await db.query(`SELECT community_intro_opt_in AS v FROM public.global_community_profiles WHERE user_id = $1`, [u])).rows[0]?.v;

// 1. Applies over existing rows, and applies twice.
const db = await base();
await db.exec(migration);
check('migration applies over existing rows', true);
try { await db.exec(migration); check('migration is re-runnable', true); }
catch (e) { check('migration is re-runnable', false, e.message); }

// 2. Existing members are not introduced; members registering afterwards are.
check('a member from before the migration is false (200 days ago)', (await opt(db, OLD1)) === false);
check('a member from before the migration is false (joined yesterday)', (await opt(db, OLD2)) === false);
// handle_new_user() inserts exactly (user_id, display_name, is_visible).
await db.query(`INSERT INTO public.global_community_profiles (user_id, display_name, is_visible) VALUES ($1, 'New member', true)
                ON CONFLICT (user_id) DO NOTHING`, [NEW1]);
check('a member registering afterwards is true (handle_new_user insert shape)', (await opt(db, NEW1)) === true);
const col = (await db.query(`SELECT is_nullable, column_default FROM information_schema.columns
  WHERE table_schema='public' AND table_name='global_community_profiles' AND column_name='community_intro_opt_in'`)).rows[0];
check('column is NOT NULL DEFAULT true', col?.is_nullable === 'NO' && col?.column_default === 'true', JSON.stringify(col));

// 3. A re-run keeps every member's value.
await db.query(`UPDATE public.global_community_profiles SET community_intro_opt_in = false WHERE user_id = $1`, [NEW1]);
await db.query(`UPDATE public.global_community_profiles SET community_intro_opt_in = true  WHERE user_id = $1`, [OLD1]);
await db.exec(migration);
check('a re-run keeps a member who switched off', (await opt(db, NEW1)) === false);
check('a re-run keeps a member who switched on', (await opt(db, OLD1)) === true);
check('NULL is rejected', await db.query(`UPDATE public.global_community_profiles SET community_intro_opt_in = NULL WHERE user_id = $1`, [OLD2]).then(() => false, () => true));

// 4. Realtime and RLS are untouched.
const ri = (await db.query(`SELECT relreplident FROM pg_class WHERE oid = 'public.global_community_profiles'::regclass`)).rows[0];
check('REPLICA IDENTITY stays FULL', ri.relreplident === 'f');
const pub = (await db.query(`SELECT count(*)::int AS n FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='global_community_profiles'`)).rows[0];
check('table stays in the supabase_realtime publication', pub.n === 1);
const pols = (await db.query(`SELECT array_agg(policyname ORDER BY policyname) AS p FROM pg_policies WHERE tablename='global_community_profiles'`)).rows[0].p;
check('both RLS policies unchanged', JSON.stringify(pols) === JSON.stringify(['Authenticated users can view minimal global profiles', 'Users can manage their own global profile']), JSON.stringify(pols));

// 5. A member changes only their own row, through the existing owner policy.
await db.query(`INSERT INTO public.global_community_profiles (user_id, display_name, is_visible) VALUES ($1, 'Other new', true)`, [NEW2]);
await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${NEW2}', false);`);
const own = await db.query(`UPDATE public.global_community_profiles SET community_intro_opt_in = false WHERE user_id = $1`, [NEW2]);
const other = await db.query(`UPDATE public.global_community_profiles SET community_intro_opt_in = false WHERE user_id = $1`, [OLD1]);
await db.exec(`RESET ROLE;`);
check('a member can switch their own setting off', own.affectedRows === 1 && (await opt(db, NEW2)) === false);
check("a member cannot change another member's setting", other.affectedRows === 0 && (await opt(db, OLD1)) === true);

// 6. The self-check fails loudly if realtime would break.
const bad = await base({ replicaFull: false });
try { await bad.exec(migration); check('self-check rejects a table that is not REPLICA IDENTITY FULL', false); }
catch (e) {
  check('self-check rejects a table that is not REPLICA IDENTITY FULL', /REPLICA IDENTITY FULL/.test(e.message), e.message);
  await bad.exec('ROLLBACK'); // end the aborted transaction, as the apply workflow's session would
}
const badCols = (await bad.query(`SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='global_community_profiles' AND column_name='community_intro_opt_in'`)).rows[0];
check('a failed self-check rolls the whole migration back', badCols.n === 0);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
