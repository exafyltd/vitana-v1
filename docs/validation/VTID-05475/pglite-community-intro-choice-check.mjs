// VTID-05475 — applies migration
// 20261103120000_vtid_05475_community_intro_explicit_choice.sql to a throwaway
// in-memory Postgres (PGlite) holding a live-shaped global_community_profiles
// (incl. the VTID-05206 community_intro_opt_in column already present, both RLS
// policies, REPLICA IDENTITY FULL, the supabase_realtime publication) and
// checks the explicit-choice backfill: recorded choices preserved, unmarked
// inclusion cleared, idempotent, self-check fires. Never touches any real DB.
// Run: node pglite-community-intro-choice-check.mjs <path-to-migration>
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';

const migration = readFileSync(process.argv[2], 'utf8');
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};

// Synthetic rows:
const PRE1 = '11111111-1111-4111-8111-111111111111'; // pre-rollout false, no marker
const PRE2 = '22222222-2222-4222-8222-222222222222'; // pre-rollout false, no marker
const YES  = '33333333-3333-4333-8333-333333333333'; // explicit YES: opt_in true + marker
const NO   = '44444444-4444-4444-8444-444444444444'; // explicit NO: opt_in false + marker
const WIN  = '55555555-5555-4555-8555-555555555555'; // pre-migration window: opt_in true, NO marker

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
      -- VTID-05206 state at the start: opt_in exists, DEFAULT true, no marker column.
      community_intro_opt_in boolean NOT NULL DEFAULT true,
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
  `);
  // Seed rows. The marker column does not exist yet, so seed opt_in only; the
  // migration adds the marker, then we set it on the YES/NO rows via a pre-step.
  await db.query(`INSERT INTO public.global_community_profiles (user_id, display_name, community_intro_opt_in, created_at) VALUES
    ($1, 'Pre-rollout A', false, now() - interval '200 days'),
    ($2, 'Pre-rollout B', false, now() - interval '30 days'),
    ($3, 'Explicit yes',  true,  now() - interval '2 days'),
    ($4, 'Explicit no',   false, now() - interval '2 days'),
    ($5, 'Window opt-in', true,  now() - interval '1 day')`,
    [PRE1, PRE2, YES, NO, WIN]);
  return db;
}

const opt = async (db, u) =>
  (await db.query(`SELECT community_intro_opt_in AS v FROM public.global_community_profiles WHERE user_id = $1`, [u])).rows[0]?.v;
const marker = async (db, u) =>
  (await db.query(`SELECT community_intro_choice_at AS v FROM public.global_community_profiles WHERE user_id = $1`, [u])).rows[0]?.v;

// ── Main run ──────────────────────────────────────────────────────────────
const db = await base();

// The YES and NO rows represent members who made an explicit choice. The
// marker column is created by the migration, so we first apply the migration
// (which adds the column, sets default false, and backfills), but that would
// run the backfill BEFORE we can set the markers. To model reality we instead:
//   1. add the marker column the way the migration's ADD COLUMN would,
//   2. stamp the explicit YES/NO rows with a marker (their recorded choice),
//   3. then apply the full migration file and assert the backfill preserved them.
await db.exec(`ALTER TABLE public.global_community_profiles ADD COLUMN IF NOT EXISTS community_intro_choice_at timestamptz NULL;`);
await db.query(`UPDATE public.global_community_profiles SET community_intro_choice_at = now() WHERE user_id = ANY($1)`, [[YES, NO]]);

// Now apply the real migration file over this state (ADD COLUMN IF NOT EXISTS is a no-op; backfill runs).
await db.exec(migration);
check('migration applies over existing rows', true);

check('explicit YES row stays true (recorded choice preserved)', (await opt(db, YES)) === true);
check('explicit YES row keeps its marker', (await marker(db, YES)) != null);
check('explicit NO row stays false (recorded choice preserved)', (await opt(db, NO)) === false);
check('explicit NO row keeps its marker', (await marker(db, NO)) != null);
check('pre-migration-window true row (no marker) is backfilled to false', (await opt(db, WIN)) === false);
check('window row still has no marker after backfill', (await marker(db, WIN)) == null);
check('pre-rollout false row A unchanged (false)', (await opt(db, PRE1)) === false);
check('pre-rollout false row B unchanged (false)', (await opt(db, PRE2)) === false);

// Column shape.
const col = (await db.query(`SELECT is_nullable, column_default, data_type FROM information_schema.columns
  WHERE table_schema='public' AND table_name='global_community_profiles' AND column_name='community_intro_opt_in'`)).rows[0];
check('community_intro_opt_in is NOT NULL DEFAULT false', col?.is_nullable === 'NO' && col?.column_default === 'false', JSON.stringify(col));
const mcol = (await db.query(`SELECT is_nullable, data_type FROM information_schema.columns
  WHERE table_schema='public' AND table_name='global_community_profiles' AND column_name='community_intro_choice_at'`)).rows[0];
check('community_intro_choice_at is timestamptz NULL', mcol?.is_nullable === 'YES' && mcol?.data_type === 'timestamp with time zone', JSON.stringify(mcol));

// Counts: no unmarked row is still introduced; recorded-choice count stable.
const leftover = (await db.query(`SELECT count(*)::int AS n FROM public.global_community_profiles WHERE community_intro_choice_at IS NULL AND community_intro_opt_in`)).rows[0].n;
check('no unmarked row is still introduced (backfill complete)', leftover === 0, `leftover=${leftover}`);
const recorded = (await db.query(`SELECT count(*)::int AS n FROM public.global_community_profiles WHERE community_intro_choice_at IS NOT NULL`)).rows[0].n;
check('exactly the two explicit-choice rows carry a marker', recorded === 2, `recorded=${recorded}`);

// Second run is a no-op.
const beforeSecond = (await db.query(`SELECT user_id, community_intro_opt_in, community_intro_choice_at FROM public.global_community_profiles ORDER BY user_id`)).rows;
await db.exec(migration);
const afterSecond = (await db.query(`SELECT user_id, community_intro_opt_in, community_intro_choice_at FROM public.global_community_profiles ORDER BY user_id`)).rows;
check('second run is a no-op (every row identical)', JSON.stringify(beforeSecond) === JSON.stringify(afterSecond));

// A fresh insert with no explicit choice takes the new default false.
const FRESH = '66666666-6666-4666-8666-666666666666';
await db.query(`INSERT INTO public.global_community_profiles (user_id, display_name, is_visible) VALUES ($1, 'New signup', true)`, [FRESH]);
check('a new signup defaults to false (not introduced until they choose Yes)', (await opt(db, FRESH)) === false);

// Realtime and RLS untouched.
const ri = (await db.query(`SELECT relreplident FROM pg_class WHERE oid = 'public.global_community_profiles'::regclass`)).rows[0];
check('REPLICA IDENTITY stays FULL', ri.relreplident === 'f');
const pub = (await db.query(`SELECT count(*)::int AS n FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='global_community_profiles'`)).rows[0];
check('table stays in the supabase_realtime publication', pub.n === 1);
const pols = (await db.query(`SELECT array_agg(policyname ORDER BY policyname) AS p FROM pg_policies WHERE tablename='global_community_profiles'`)).rows[0].p;
check('both RLS policies unchanged', JSON.stringify(pols) === JSON.stringify(['Authenticated users can view minimal global profiles', 'Users can manage their own global profile']), JSON.stringify(pols));

// A member changes only their own row, through the existing owner policy.
await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${FRESH}', false);`);
const own = await db.query(`UPDATE public.global_community_profiles SET community_intro_opt_in = true, community_intro_choice_at = now() WHERE user_id = $1`, [FRESH]);
const other = await db.query(`UPDATE public.global_community_profiles SET community_intro_opt_in = true WHERE user_id = $1`, [YES]);
await db.exec(`RESET ROLE;`);
check('a member can record their own choice', own.affectedRows === 1 && (await opt(db, FRESH)) === true);
check("a member cannot change another member's row", other.affectedRows === 0);

// Self-check fires if realtime would break.
const bad = await base({ replicaFull: false });
try { await bad.exec(migration); check('self-check rejects a table that is not REPLICA IDENTITY FULL', false); }
catch (e) {
  check('self-check rejects a table that is not REPLICA IDENTITY FULL', /REPLICA IDENTITY FULL/.test(e.message), e.message);
  await bad.exec('ROLLBACK');
}
const badCols = (await bad.query(`SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='global_community_profiles' AND column_name='community_intro_choice_at'`)).rows[0];
check('a failed self-check rolls the whole migration back', badCols.n === 0);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
