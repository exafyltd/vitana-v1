/**
 * VTID-05147 (Track S / S-M) — members cannot write their own role or membership.
 *
 * exafyltd/vitana-platform's migration
 * `20261013233000_vtid_05147_s_m_membership_role_lockdown.sql` dropped the
 * member write policies on user_tenants / role_preferences / user_active_roles,
 * revoked INSERT/UPDATE/DELETE on those tables and user_permitted_roles from
 * anon and authenticated, and made set_role_preference refuse a tenant the
 * caller is not a member of. Before it, a member could PATCH their own
 * user_tenants row to active_role='admin' (tenant admin in the gateway) or to
 * any tenant_id, and write any role into role_preferences.
 *
 * This app never wrote those tables directly — role switches go through
 * supabase.rpc('set_role_preference') (useRole.setRole). Two guards keep it so:
 *  1. static: no `.from('<table>')…insert|update|upsert|delete` on the four
 *     tables in src/ or supabase/functions/, except in files that build a
 *     service-role client (server side, bypasses RLS by design);
 *  2. mirror: no migration in this repo newer than the platform S-M migration
 *     recreates a dropped policy, grants writes on the four tables to
 *     anon/authenticated/PUBLIC, or creates/replaces set_role_preference
 *     without the membership check. Change both repos together.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '../../..');
const MIGRATIONS = join(ROOT, 'supabase/migrations');
const TABLES = ['user_tenants', 'role_preferences', 'user_active_roles', 'user_permitted_roles'];
// The platform S-M migration's timestamp: everything newer must keep the lockdown.
const SM_CUTOFF = '20261013233000';
const DROPPED_POLICIES = [
  'user_tenants_update_own',
  'rp_upsert_self',
  'rp_update_self',
  'rp_delete_self',
  'user_active_roles_insert',
  'user_active_roles_update',
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name) && !/\.(test|spec)\.[tj]sx?$/.test(name)) out.push(p);
  }
  return out;
}

/** `.from('<table>')` chains that end in a write, within the same statement. */
export function clientWrites(source: string): string[] {
  const hits: string[] = [];
  const re = /\.from\(\s*['"`](user_tenants|role_preferences|user_active_roles|user_permitted_roles)['"`]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    // The chain up to the end of the statement (or a reasonable window).
    const rest = source.slice(m.index, m.index + 600);
    const stmt = rest.split(/;\s*\n|\n\s*\n/)[0];
    if (/\.\s*(insert|update|upsert|delete)\s*\(/.test(stmt)) hits.push(m[1]);
  }
  return hits;
}

const buildsServiceClient = (source: string) => /SUPABASE_SERVICE_ROLE(_KEY)?\b/.test(source);

const stripComments = (sql: string) => sql.replace(/--[^\n]*/g, '');

/** Violations of the S-M lockdown in one migration's SQL. */
export function migrationViolations(sql: string): string[] {
  const code = stripComments(sql);
  const out: string[] = [];
  for (const p of DROPPED_POLICIES) {
    if (new RegExp(`CREATE\\s+POLICY\\s+"?${p}"?\\s`, 'i').test(code)) out.push(`recreates ${p}`);
  }
  for (const g of code.match(/GRANT[^;]*;/gi) ?? []) {
    if (/\bFUNCTION\b/i.test(g) || !/\bON\b/i.test(g)) continue;
    const privs = g.replace(/\bON\b[\s\S]*$/i, '');
    const target = g.replace(/^[\s\S]*?\bON\b/i, '').replace(/\bTO\b[\s\S]*$/i, '');
    const grantees = g.replace(/^[\s\S]*?\bTO\b/i, '');
    const touches = TABLES.some((t) => new RegExp(`\\b${t}\\b`, 'i').test(target)) || /ALL\s+TABLES\s+IN\s+SCHEMA/i.test(target);
    if (/\b(INSERT|UPDATE|DELETE|ALL|TRUNCATE)\b/i.test(privs) && touches && /\b(authenticated|anon|public)\b/i.test(grantees)) {
      out.push(`grants member writes: ${g.trim()}`);
    }
  }
  if (/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+(?:"?public"?\s*\.\s*)?"?set_role_preference"?\s*\(/i.test(code) && !/Not a member of this tenant/.test(code)) {
    out.push('set_role_preference without the membership check');
  }
  return out;
}

describe('role/membership tables: no client writes (VTID-05147)', () => {
  it('src/ and supabase/functions/ never write the four tables with a user client', () => {
    const files = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'supabase/functions'))];
    const offenders: Array<{ file: string; tables: string[] }> = [];
    for (const f of files) {
      const source = readFileSync(f, 'utf8');
      const hits = clientWrites(source);
      if (hits.length && !buildsServiceClient(source)) offenders.push({ file: relative(ROOT, f), tables: hits });
    }
    expect(offenders).toEqual([]);
  });

  it('the role switch goes through set_role_preference', () => {
    const useRole = readFileSync(join(ROOT, 'src/hooks/useRole.tsx'), 'utf8');
    expect(useRole).toMatch(/supabase\.rpc\(\s*["']set_role_preference["']/);
    expect(clientWrites(useRole)).toEqual([]);
  });

  it('no migration newer than the platform S-M migration reopens the tables or the RPC', () => {
    const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql') && f > SM_CUTOFF);
    const offenders = files
      .map((f) => ({ file: f, violations: migrationViolations(readFileSync(join(MIGRATIONS, f), 'utf8')) }))
      .filter((o) => o.violations.length);
    expect(offenders).toEqual([]);
  });

  it('the guards themselves: flag a client write, a reopened policy, a grant and an unchecked RPC', () => {
    expect(clientWrites(`await supabase.from('user_tenants').update({ active_role: 'admin' }).eq('user_id', id);`)).toEqual(['user_tenants']);
    expect(clientWrites(`supabase\n  .from("role_preferences")\n  .upsert({ role: 'developer' });`)).toEqual(['role_preferences']);
    expect(clientWrites(`const { data } = await supabase.from('user_tenants').select('tenant_id').eq('user_id', id);`)).toEqual([]);
    expect(buildsServiceClient(`createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)`)).toBe(true);

    expect(migrationViolations('CREATE POLICY user_tenants_update_own ON public.user_tenants FOR UPDATE USING (user_id = auth.uid());')).toHaveLength(1);
    expect(migrationViolations('GRANT INSERT, UPDATE ON public.role_preferences TO authenticated;')).toHaveLength(1);
    expect(migrationViolations('GRANT SELECT ON public.role_preferences TO authenticated;')).toEqual([]);
    expect(migrationViolations('GRANT ALL ON public.user_tenants TO service_role;')).toEqual([]);
    const rpc = `CREATE OR REPLACE FUNCTION public.set_role_preference(p_tenant_id uuid, p_role text) RETURNS void AS $f$ BEGIN END $f$ LANGUAGE plpgsql;`;
    expect(migrationViolations(rpc)).toEqual(['set_role_preference without the membership check']);
    expect(migrationViolations(rpc.replace('BEGIN', "BEGIN RAISE EXCEPTION 'Not a member of this tenant';"))).toEqual([]);
    expect(migrationViolations('-- CREATE POLICY rp_upsert_self ON public.role_preferences')).toEqual([]);
  });
});
