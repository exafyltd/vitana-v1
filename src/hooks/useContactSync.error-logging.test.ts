/**
 * useContactSync.ts's matchContacts() — error-visibility fix.
 *
 * Neither the phone-lookup nor the email-lookup against `profiles`
 * checked `error` — a real DB failure on either resolved to
 * `undefined`/`null`, and `phoneProfiles?.forEach(...)` / `emailProfiles?.
 * forEach(...)` silently skip, so every imported contact is categorized
 * as a non-match ("not on Vitana") even if many are actual members —
 * indistinguishable from a genuinely empty match set. The user sees "0 of
 * your contacts use Vitana" and may be prompted to invite people already
 * using the app.
 *
 * matchContacts() is a closure inside the useContactSync() hook (not
 * independently exported) and its only entry point, syncContacts(),
 * additionally drives device-contact-permission flows per source — not
 * practical to fully mock for this fix. Pinned at the source level
 * instead, matching this repo's established precedent (see
 * Videos.error-logging.test.ts) for exactly this destructure-and-log shape.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useContactSync.ts'), 'utf8');

describe('useContactSync — matchContacts() error logging', () => {
  it('destructures `error` from the phone-lookup query', () => {
    expect(SRC).toMatch(
      /const \{ data: phoneProfiles, error: phoneError \} = await supabase\s*\n\s*\.from\("profiles"\)/,
    );
  });

  it('logs the phone-lookup error before the unchanged forEach fallback', () => {
    const idx = SRC.indexOf('const { data: phoneProfiles, error: phoneError }');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 700);
    expect(after).toMatch(/if \(phoneError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('phoneProfiles?.forEach(');
  });

  it('destructures `error` from the email-lookup query', () => {
    expect(SRC).toMatch(
      /const \{ data: emailProfiles, error: emailError \} = await supabase\s*\n\s*\.from\("profiles"\)/,
    );
  });

  it('logs the email-lookup error before the unchanged forEach fallback', () => {
    const idx = SRC.indexOf('const { data: emailProfiles, error: emailError }');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 700);
    expect(after).toMatch(/if \(emailError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('emailProfiles?.forEach(');
  });
});
