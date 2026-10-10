/**
 * VTID-05043 (Track S / S3) — switch_to_tenant_by_slug joins open-signup tenants only.
 *
 * switch_to_tenant_by_slug(text) is SECURITY DEFINER. The body this repo shipped
 * (20250909092110) let any signed-in user join any tenant by slug and pointed
 * their active_tenant_id claim at it. The function is now co-owned with
 * exafyltd/vitana-platform, whose migration
 * `20261010170200_vtid_05043_s3_switch_tenant_open_signup_only.sql` rewrites it:
 * members and exafy_admin only switch, anyone else may join only a tenant with
 * `tenants.open_signup = true`, every other tenant raises TENANT_NOT_JOINABLE.
 *
 * This mirror guard fails the build if a migration in this repo newer than the
 * last definition here creates or replaces the function without the open_signup
 * check in its body (comments do not count). Change both repos together.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../..');
const MIGRATIONS = join(ROOT, 'supabase/migrations');
// The last definition shipped from this repo (without the guard); the live
// function is now owned by the vitana-platform VTID-05043 migration.
const LAST_DEFINITION = '20250909092110_250b18a4-830a-429b-8957-83fb97c292ab.sql';

const stripComments = (sql: string) => sql.replace(/--[^\n]*/g, '');

/** Every CREATE [OR REPLACE] FUNCTION switch_to_tenant_by_slug(...) body in a file. */
function switchTenantBodies(sql: string): string[] {
  const code = stripComments(sql);
  const bodies: string[] = [];
  const re = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:"?public"?\s*\.\s*)?"?switch_to_tenant_by_slug"?\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const rest = code.slice(m.index);
    const tag = rest.match(/\bAS\s+(\$[A-Za-z_]*\$)/i);
    if (!tag) {
      bodies.push(rest);
      continue;
    }
    const start = rest.indexOf(tag[1], tag.index!) + tag[1].length;
    const end = rest.indexOf(tag[1], start);
    bodies.push(rest.slice(start, end === -1 ? undefined : end));
  }
  return bodies;
}

const hasOpenSignupCheck = (body: string) => /\bopen_signup\b/.test(body);

describe('switch_to_tenant_by_slug keeps the open_signup check (VTID-05043)', () => {
  it('the last definition shipped from this repo is still where the guard starts', () => {
    const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql'));
    expect(files).toContain(LAST_DEFINITION);
    expect(switchTenantBodies(readFileSync(join(MIGRATIONS, LAST_DEFINITION), 'utf8'))).toHaveLength(1);
  });

  it('no migration newer than the last definition creates or replaces it without open_signup', () => {
    const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql') && f > LAST_DEFINITION);
    for (const f of files) {
      for (const body of switchTenantBodies(readFileSync(join(MIGRATIONS, f), 'utf8'))) {
        expect({ file: f, openSignupCheck: hasOpenSignupCheck(body) }).toEqual({ file: f, openSignupCheck: true });
      }
    }
  });

  it('the guard itself: flags a rewrite without the check, accepts one with it, ignores comments', () => {
    const bad = `CREATE OR REPLACE FUNCTION public.switch_to_tenant_by_slug(p_tenant_slug text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
  -- open_signup is not checked here
  INSERT INTO public.user_tenants (tenant_id, user_id) SELECT tenant_id, auth.uid() FROM public.tenants WHERE slug = p_tenant_slug;
END;
$function$;`;
    const good = bad.replace('BEGIN', 'BEGIN\n  IF NOT (SELECT open_signup FROM public.tenants WHERE slug = p_tenant_slug) THEN RAISE EXCEPTION \'TENANT_NOT_JOINABLE\'; END IF;');
    expect(switchTenantBodies(bad).map(hasOpenSignupCheck)).toEqual([false]);
    expect(switchTenantBodies(good).map(hasOpenSignupCheck)).toEqual([true]);
    expect(switchTenantBodies('create function switch_to_tenant_by_slug(t text) returns void as $$ begin end $$ language plpgsql;')).toHaveLength(1);
    expect(switchTenantBodies('SELECT public.switch_to_tenant_by_slug(\'maxina\');')).toHaveLength(0);
  });
});
