/**
 * VTID-04961 — the appointment edge functions must not embed `profiles`
 * through `provider_appointments_user_id_fkey`: that FK points at auth.users,
 * so PostgREST answers PGRST200 and send-appointment-reminder failed every
 * hourly run. They must look the recipient up by `profiles.user_id` instead.
 *
 * VTID-04964 — appilix-push had verify_jwt=false and no caller check, so
 * anyone could push any text and link to any member. It is retired: it must
 * answer 410 and never read the Appilix keys or call Appilix again.
 *
 * These are Deno functions (URL imports, top-level Deno.serve) that Vitest
 * cannot import, so the guards read the source.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const fn = (name: string) =>
  readFileSync(join(__dirname, '../../supabase/functions', name, 'index.ts'), 'utf8');

describe('VTID-04961 appointment functions resolve the recipient without a profiles embed', () => {
  for (const name of ['send-appointment-reminder', 'send-appointment-email']) {
    it(`${name} has no profiles!provider_appointments_user_id_fkey embed`, () => {
      expect(fn(name)).not.toMatch(/profiles!provider_appointments_user_id_fkey/);
    });

    it(`${name} reads profiles by user_id`, () => {
      const src = fn(name);
      expect(src).toMatch(/\.from\("profiles"\)/);
      expect(src).toMatch(/\.(in|eq)\("user_id"/);
    });
  }
});

describe('VTID-04964 appilix-push is retired', () => {
  const src = fn('appilix-push');

  it('answers 410 Gone', () => {
    expect(src).toMatch(/status:\s*410/);
  });

  it('no longer reads the Appilix keys or calls Appilix', () => {
    expect(src).not.toMatch(/APPILIX_APP_KEY|APPILIX_API_KEY/);
    expect(src).not.toMatch(/appilix\.com/);
  });

  it('never logs the request body', () => {
    expect(src).not.toMatch(/req\.(json|text|formData)\(/);
  });
});
