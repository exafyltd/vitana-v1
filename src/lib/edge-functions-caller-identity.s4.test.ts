/**
 * VTID-05049 (Track S / S4, S-H) — edge functions that ran with the
 * service-role client on an identity the caller chose.
 *
 * `verify_jwt=true` accepts the public anon key, so a body `userId` let anyone
 * write any member's profile (linkedin-import, social-media-import) or read
 * their full context (fetch-user-context). queue-campaign-recipients let any
 * anon-key holder queue email/SMS/WhatsApp to members, and
 * send-welcome-discount (verify_jwt=false) sent a Maxina-branded email with a
 * caller-chosen recipient and code. They now go through
 * supabase/functions/_shared/caller-auth.ts.
 *
 * These are Deno functions (URL imports, top-level serve) that Vitest cannot
 * import, so the guards read the source.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const FUNCTIONS = join(__dirname, '../../supabase/functions');
const fn = (name: string) => readFileSync(join(FUNCTIONS, name, 'index.ts'), 'utf8');
const callerAuth = () => readFileSync(join(FUNCTIONS, '_shared', 'caller-auth.ts'), 'utf8');

const CALLER_AUTH_IMPORT = /from\s+["']\.\.\/_shared\/caller-auth\.ts["']/;

// A user id read from the request body: destructured from req.json()/body,
// or read as body.userId / body.user_id.
const BODY_USER_ID = [
  /\{[^}]*\b(userId|user_id)\b[^}]*\}\s*(?::\s*[\w<>[\]]+\s*)?=\s*(?:await\s+req\.json\(\)|(?:body|payload|requestBody|reqBody)\b)/,
  /\b(?:body|payload|requestBody|reqBody)\??\.(userId|user_id)\b/,
];

/** The source with the serve() handler body only (after `serve(`). */
const handler = (src: string) => src.slice(src.indexOf('serve('));

describe('VTID-05049 _shared/caller-auth.ts', () => {
  const src = callerAuth();

  it('exports requireUser and isServiceRoleCaller', () => {
    expect(src).toMatch(/export async function requireUser\(/);
    expect(src).toMatch(/export async function isServiceRoleCaller\(/);
  });

  it('requireUser verifies the bearer with auth.getUser() on the anon client', () => {
    expect(src).toMatch(/SUPABASE_ANON_KEY/);
    expect(src).toMatch(/\.auth\.getUser\(\)/);
    expect(src).toMatch(/status:\s*401/);
  });

  it('isServiceRoleCaller accepts an exact service-role key match or a verified service_role claim', () => {
    expect(src).toMatch(/Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
    expect(src).toMatch(/timingSafeEqual\(token, envKey\)/);
    // A claim is never trusted from the unverified payload alone.
    expect(src).toMatch(/\.auth\.getClaims\(token\)/);
    expect(src).toMatch(/claims\?\.role === "service_role"/);
    expect(src).toMatch(/\.auth\.admin\.listUsers\(/);
  });

  it('uses a supabase-js that has getClaims (2.57.2+, VTID-05008)', () => {
    const versions = Array.from(src.matchAll(/esm\.sh\/@supabase\/supabase-js@([0-9.]+)/g)).map((m) => m[1]);
    expect(versions.length).toBeGreaterThan(0);
    for (const v of versions) {
      const [major, minor, patch] = v.split('.').map(Number);
      expect(major).toBe(2);
      expect(minor * 1000 + (patch || 0)).toBeGreaterThanOrEqual(57 * 1000 + 2);
    }
  });

  it('builds its clients through createDataClient (VTID-05023)', () => {
    expect(src).not.toMatch(/(^|[^.\w])createClient\s*\(/m);
    expect(src).toMatch(/createDataClient\(/);
  });
});

describe('VTID-05049 the five functions use caller-auth', () => {
  for (const name of [
    'linkedin-import',
    'social-media-import',
    'queue-campaign-recipients',
    'send-welcome-discount',
    'fetch-user-context',
  ]) {
    it(`${name} imports _shared/caller-auth`, () => {
      expect(fn(name)).toMatch(CALLER_AUTH_IMPORT);
    });
  }
});

describe('VTID-05049 profile imports write only the caller\'s own profile', () => {
  for (const name of ['linkedin-import', 'social-media-import']) {
    const src = handler(fn(name));

    it(`${name} authenticates with requireUser before reading the body`, () => {
      const auth = src.indexOf('await requireUser(req');
      expect(auth).toBeGreaterThan(-1);
      expect(auth).toBeLessThan(src.indexOf('req.json()'));
    });

    it(`${name} keys the write on the verified user, and refuses a different body id with 403`, () => {
      expect(src).toMatch(/userId:\s*bodyUserId/);
      expect(src).toMatch(/bodyUserId\s*&&\s*bodyUserId\s*!==\s*auth\.user\.id/);
      expect(src).toMatch(/const userId = auth\.user\.id;/);
      expect(src).toMatch(/forbidden\(corsHeaders/);
    });
  }

  it('linkedin-import is flagged for removal', () => {
    expect(fn('linkedin-import')).toMatch(/flagged for removal/);
  });
});

describe('VTID-05049 fetch-user-context', () => {
  const src = handler(fn('fetch-user-context'));

  it('honours a body userId only for a service-role caller', () => {
    expect(src).toMatch(/if \(userId && \(await isServiceRoleCaller\(req\)\)\)/);
    expect(src).not.toMatch(/use it directly \(from service role call\)/);
  });

  it('otherwise uses the verified user and refuses a different body id with 403', () => {
    expect(src).toMatch(/await requireUser\(req, corsHeaders\)/);
    expect(src).toMatch(/userId && userId !== auth\.user\.id/);
    expect(src).toMatch(/fetchAndReturnContext\(auth\.user\.id/);
  });

  // VTID-05119: the bodyless call from generate-enhanced-recommendations got a 500.
  it('parses the body with readJsonBody, never a bare req.json()', () => {
    expect(fn('fetch-user-context')).toMatch(/from\s+["']\.\.\/_shared\/read-json-body\.ts["']/);
    expect(src).not.toMatch(/await req\.json\(\)/);
    const parse = src.indexOf('await readJsonBody(req)');
    expect(parse).toBeGreaterThan(-1);
    expect(parse).toBeLessThan(src.indexOf('isServiceRoleCaller(req)'));
  });

  it('answers an invalid body with 400', () => {
    expect(src).toMatch(/if \(parsed\.kind === 'invalid'\) \{[\s\S]{0,200}status: 400/);
  });

  it('keeps the empty-body lenience at the call site, with a comment', () => {
    expect(src).toMatch(/\/\/ An empty body is a valid request[^\n]*\n[\s\S]{0,250}const body: Record<string, unknown> = parsed\.kind === 'json' \? parsed\.value : \{\};/);
  });
});

describe('VTID-05049 queue-campaign-recipients is service-role only', () => {
  const src = handler(fn('queue-campaign-recipients'));

  it('rejects any caller that is not service role before reading the body', () => {
    const gate = src.indexOf('await isServiceRoleCaller(req)');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(src.indexOf('req.json()'));
    expect(src).toMatch(/unauthorizedResponse\(corsHeaders\)/);
  });

  it('has no exafy_admin path (service-role only)', () => {
    expect(src).not.toMatch(/exafy_admin/);
  });

  it('reloads the campaign and refuses one that is not scheduled or active', () => {
    expect(src).toMatch(/\.from\('campaigns'\)\s*\.select\([^)]*status[^)]*\)\s*\.eq\('id', campaignId\)/);
    expect(src).toMatch(/status:\s*409/);
  });

  it('takes the message from the campaign row, never the request', () => {
    expect(src).not.toMatch(/\{[^}]*\bmessageContent\b[^}]*\}\s*=\s*await req\.json\(\)/);
    expect(src).toMatch(/const messageContent = campaign\.distribution_config\?\.messageContent/);
  });

  // VTID-05120 moved the recipient queries into _shared/campaign-audience.ts
  // (scoped to ownerId = campaign.user_id) and replaced the embedded
  // `profiles.tenant_id` filter, which only nulled the embed, with a real
  // `profiles.tenant_id` row filter.
  it('scopes every recipient query to the campaign owner or the owner\'s tenant', () => {
    const audience = readFileSync(join(FUNCTIONS, '_shared', 'campaign-audience.ts'), 'utf8');
    expect(src).toMatch(/\.from\('user_tenants'\)[\s\S]*?\.eq\('user_id', campaign\.user_id\)/);
    expect(src).toMatch(/resolveCampaignAudience\(supabaseClient, \{\s*ownerId: campaign\.user_id,\s*tenantId,/);
    expect(audience).toMatch(/\.from\('contacts'\)\s*\.select\([^)]*\)\s*\.eq\('user_id', ownerId\)/);
    expect(audience).toMatch(/\.from\('campaign_audience_segments'\)[\s\S]*?\.eq\('user_id', ownerId\)/);
    expect(audience).toMatch(/\.from\('global_community_events'\)[\s\S]*?\.eq\('created_by', ownerId\)/);
    expect(audience).toMatch(/\.from\('profiles'\)[\s\S]*?\.eq\('tenant_id', tenantId\)/);
    expect(src + audience).not.toMatch(/\.eq\('profiles\.tenant_id'/);
  });
});

// VTID-05118: deliberate contract change from VTID-05049 "service-role only".
// The pg_net trigger has no service-role key in vault, so it now sends the
// shared X-Trigger-Secret instead.
describe('send-welcome-discount accepts only a service-role or trigger-secret caller', () => {
  const src = handler(fn('send-welcome-discount'));
  const GUARD = /if\s*\(\s*!\(\s*isTriggerSecretCaller\(req\)\s*\|\|\s*\(await isServiceRoleCaller\(req\)\)\s*\)\s*\)/;

  it('checks both callers before reading the body', () => {
    const serviceRole = src.indexOf('isServiceRoleCaller(req)');
    const triggerSecret = src.indexOf('isTriggerSecretCaller(req)');
    const body = src.indexOf('req.json()');
    expect(serviceRole).toBeGreaterThan(-1);
    expect(triggerSecret).toBeGreaterThan(-1);
    expect(serviceRole).toBeLessThan(body);
    expect(triggerSecret).toBeLessThan(body);
  });

  it('combines both checks in one guard that answers 401', () => {
    const m = GUARD.exec(src);
    expect(m).not.toBeNull();
    const after = src.slice(m!.index + m![0].length);
    expect(after.indexOf('unauthorizedResponse(')).toBeGreaterThan(-1);
    expect(after.indexOf('unauthorizedResponse(')).toBeLessThan(after.indexOf('req.json()'));
  });

  it('keeps the CORS allow-headers string (no browser calls with the trigger secret)', () => {
    const full = fn('send-welcome-discount');
    expect(full).toMatch(/"authorization, x-client-info, apikey, content-type"/);
    expect(full).not.toMatch(/x-trigger-secret/);
    const allow = /"Access-Control-Allow-Headers":\s*"([^"]*)"/.exec(full);
    expect(allow?.[1]).toBe('authorization, x-client-info, apikey, content-type');
  });

  it('reads recipient, code, percent and expiry from user_discount_codes, not the body', () => {
    expect(src).toMatch(/\.from\("user_discount_codes"\)/);
    expect(src).toMatch(/const \{ discount_code_id \} = await req\.json\(\);/);
    expect(src).toMatch(/const \{ user_id, code, discount_percent, expires_at \} = discountCode;/);
  });

  it('HTML-escapes every interpolated value', () => {
    expect(src).toMatch(/\$\{escapeHtml\(code\)\}/);
    expect(src).toMatch(/\$\{escapeHtml\(userName\)\}/);
    expect(src).not.toMatch(/^\s*\$\{code\}\s*$/m);
    expect(src).not.toMatch(/<strong>\$\{discount_percent\}/);
  });
});

describe('VTID-05118 _shared/trigger-secret.ts', () => {
  const src = readFileSync(join(FUNCTIONS, '_shared', 'trigger-secret.ts'), 'utf8');

  it('has no imports, so Vitest can load it', () => {
    expect(src).not.toMatch(/^\s*import\s/m);
  });

  it('exports timingSafeEqual and isTriggerSecretCaller', () => {
    expect(src).toMatch(/export function timingSafeEqual\(/);
    expect(src).toMatch(/export function isTriggerSecretCaller\(/);
  });

  it('compares X-Trigger-Secret with EMAIL_TRIGGER_SECRET in constant time', () => {
    expect(src).toMatch(/"EMAIL_TRIGGER_SECRET"/);
    const body = src.slice(src.indexOf('export function isTriggerSecretCaller('));
    expect(body).toMatch(/timingSafeEqual\(/);
    expect(body).not.toMatch(/(?:!==|===)\s*secret\b|\bsecret\s*(?:!==|===)/);
  });

  it('caller-auth.ts imports timingSafeEqual from it and re-exports isTriggerSecretCaller', () => {
    const auth = callerAuth();
    expect(auth).toMatch(/import\s*\{\s*timingSafeEqual\s*\}\s*from\s*"\.\/trigger-secret\.ts"/);
    expect(auth).not.toMatch(/function timingSafeEqual\(/);
    expect(auth).toMatch(/export\s*\{\s*isTriggerSecretCaller\s*\}\s*from\s*"\.\/trigger-secret\.ts"/);
  });
});

describe('VTID-05049 tree-wide: no service-role function trusts a body user id unchecked', () => {
  const offenders = readdirSync(FUNCTIONS)
    .filter((d) => statSync(join(FUNCTIONS, d)).isDirectory() && existsSync(join(FUNCTIONS, d, 'index.ts')))
    .filter((d) => {
      const src = fn(d);
      if (!/SERVICE_ROLE/.test(src)) return false;
      if (!BODY_USER_ID.some((re) => re.test(src))) return false;
      return !/\.auth\.getUser\(|\.auth\.getClaims\(/.test(src) && !CALLER_AUTH_IMPORT.test(src);
    });

  it('the scan sees the known body-id readers', () => {
    const readers = readdirSync(FUNCTIONS).filter(
      (d) => existsSync(join(FUNCTIONS, d, 'index.ts')) && BODY_USER_ID.some((re) => re.test(fn(d))),
    );
    expect(readers).toEqual(expect.arrayContaining(['linkedin-import', 'social-media-import', 'fetch-user-context']));
  });

  it('every SERVICE_ROLE function that reads a body user id checks the caller', () => {
    expect(offenders).toEqual([]);
  });
});
