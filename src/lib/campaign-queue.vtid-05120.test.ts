/**
 * VTID-05120: source guards for the campaign send path.
 *
 * - queue-campaign-recipients reads the audience from the campaign row, uses
 *   only real columns, and inserts nothing unless CAMPAIGN_QUEUE_ENABLED.
 * - process-campaign-queue (verify_jwt=false) is service-role only.
 * - trigger-scheduled-campaigns passes the snake-case audience_data.
 * - Every column the audience resolver reads exists in the generated types,
 *   so a rename fails CI.
 *
 * These are Deno functions (URL imports, top-level serve) that Vitest cannot
 * import, so the guards read the source. The resolver's behaviour is covered
 * by campaign-audience.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const FUNCTIONS = join(ROOT, 'supabase/functions');
const fn = (name: string) => readFileSync(join(FUNCTIONS, name, 'index.ts'), 'utf8');
const handler = (src: string) => src.slice(src.indexOf('serve('));
const audienceSrc = readFileSync(join(FUNCTIONS, '_shared', 'campaign-audience.ts'), 'utf8');

describe('VTID-05120 queue-campaign-recipients', () => {
  const src = handler(fn('queue-campaign-recipients'));

  it('still rejects a non-service-role caller first (VTID-05049)', () => {
    const gate = src.indexOf('await isServiceRoleCaller(req)');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(src.indexOf('req.json()'));
  });

  it('reads the audience from distribution_config.audience_data, the request only as a logged fallback', () => {
    expect(src).toMatch(/let audienceData = campaign\.distribution_config\?\.audience_data/);
    expect(src).toMatch(/audienceData: requestAudienceData\s*\}\s*=\s*await req\.json\(\)/);
    expect(src).toMatch(/console\.warn\([^)]*legacy fallback/);
  });

  it('uses none of the columns or tables that do not exist', () => {
    // contact_* are real columns of `contacts` only, never of `profiles`.
    expect(src).not.toMatch(/contact_email|contact_phone/);
    expect(audienceSrc).not.toMatch(/\.from\('profiles'\)[^;]*contact_/);
    for (const s of [src, audienceSrc]) {
      expect(s).not.toMatch(/from\('social_connections'\)/);
      expect(s).not.toMatch(/\.eq\('response'/);
      expect(s).not.toMatch(/profiles:(user_id|follower_id)/);
    }
  });

  it('checks CAMPAIGN_QUEUE_ENABLED before any insert or campaign update', () => {
    const flag = src.indexOf("Deno.env.get('CAMPAIGN_QUEUE_ENABLED') !== 'true'");
    expect(flag).toBeGreaterThan(-1);
    expect(flag).toBeLessThan(src.indexOf('.insert('));
    expect(flag).toBeLessThan(src.indexOf('.update('));
    expect(src).toMatch(/dry_run: true, counts/);
  });

  it('builds every row first and inserts campaign_recipients once, throwing on error', () => {
    expect((src.match(/\.from\('campaign_recipients'\)/g) || []).length).toBe(1);
    expect(src).toMatch(/\.from\('campaign_recipients'\)\s*\.insert\(recipientRecords\)/);
    expect(src).toMatch(/if \(recipientError\) \{[\s\S]*?throw recipientError;/);
    expect(src).not.toMatch(/continue;\s*\}\s*campaignRecipients\.push/);
  });

  it('fails loudly: owner-tenant error throws, no tenant answers 409, audience errors answer 500 with the step', () => {
    expect(src).toMatch(/if \(ownerTenantError\) throw ownerTenantError;/);
    expect(src).toMatch(/campaign_owner_has_no_tenant/);
    expect(src).toMatch(/error instanceof CampaignAudienceError[\s\S]*?step: error\.step[\s\S]*?status: 500/);
    expect(src).toMatch(/if \(statusError\) throw statusError;/);
  });
});

describe('VTID-05120 process-campaign-queue is service-role only', () => {
  const src = handler(fn('process-campaign-queue'));

  it('imports caller-auth and checks isServiceRoleCaller before anything else in the handler', () => {
    expect(fn('process-campaign-queue')).toMatch(/from\s+["']\.\.\/_shared\/caller-auth\.ts["']/);
    const tryBody = src.slice(src.indexOf('try {') + 'try {'.length);
    const firstStatement = tryBody.replace(/^\s*(\/\/[^\n]*\n\s*)*/, '');
    expect(firstStatement.startsWith('if (!(await isServiceRoleCaller(req))) {')).toBe(true);
    expect(src.indexOf('await isServiceRoleCaller(req)')).toBeLessThan(src.indexOf('req.json()'));
    expect(src.indexOf('await isServiceRoleCaller(req)')).toBeLessThan(src.indexOf('createDataClient('));
  });

  it('answers an unauthorised caller with unauthorizedResponse', () => {
    expect(src).toMatch(/if \(!\(await isServiceRoleCaller\(req\)\)\) \{\s*return unauthorizedResponse\(corsHeaders\);\s*\}/);
  });
});

describe('VTID-05120 trigger-scheduled-campaigns passes the stored audience key', () => {
  const src = fn('trigger-scheduled-campaigns');
  it('uses audience_data and has no { vitanaContacts: true } fallback', () => {
    expect(src).toMatch(/audienceData: distributionConfig\.audience_data \?\? distributionConfig\.audienceData/);
    expect(src).not.toMatch(/vitanaContacts: true/);
  });
});

// Pinned from src/integrations/supabase/types.ts (Row types). The two
// allowlist tables are not in the generated types; they are pinned to the
// columns generate-daily-matches already reads from them.
const typesSrc = readFileSync(join(ROOT, 'src/integrations/supabase/types.ts'), 'utf8');
function rowColumns(table: string): string[] {
  const start = typesSrc.indexOf(`      ${table}: {\n        Row: {`);
  if (start < 0) return [];
  const body = typesSrc.slice(start, typesSrc.indexOf('\n        }', start));
  return [...body.matchAll(/^\s{10}(\w+)\??:/gm)].map((m) => m[1]);
}

describe('VTID-05120 schema guard: the resolver reads only real columns', () => {
  const pinnedOutsideTypes: Record<string, string[]> = {
    service_bot_accounts: ['user_id'],
    notification_test_actors: ['user_id'],
  };

  // Each `.from('<table>')` chain up to the next `.from(` or the end of the call.
  const chains = [...audienceSrc.matchAll(/\.from\('(\w+)'\)([\s\S]*?)(?=\.from\(|\n\s*\),?\n|\)\s*,\s*\n)/g)];

  it('finds every table the resolver reads', () => {
    expect(new Set(chains.map((c) => c[1]))).toEqual(
      new Set([
        'service_bot_accounts',
        'notification_test_actors',
        'global_community_events',
        'global_event_participants',
        'user_follows',
        'profiles',
        'contacts',
        'campaign_audience_segments',
      ]),
    );
  });

  it.each(chains.map((c) => [c[1], c[2]] as const))('%s: selected and filtered columns exist', (table, chain) => {
    const known = pinnedOutsideTypes[table] ?? rowColumns(table);
    expect(known.length).toBeGreaterThan(0);
    const used = new Set<string>();
    for (const m of chain.matchAll(/\.select\('([^']*)'\)/g)) {
      m[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((c) => used.add(c));
    }
    for (const m of chain.matchAll(/\.(?:eq|in)\('([^']+)'/g)) used.add(m[1]);
    expect(used.size).toBeGreaterThan(0);
    for (const col of used) expect(known, `${table}.${col}`).toContain(col);
  });
});
