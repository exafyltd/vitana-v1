/**
 * VTID-05118: the X-Trigger-Secret check the send-welcome-discount pg_net
 * trigger now relies on. The module lives in supabase/functions/_shared and
 * has no imports, so Vitest loads it directly with a stubbed env.
 */
import { describe, it, expect } from 'vitest';
import { isTriggerSecretCaller, timingSafeEqual } from '../../supabase/functions/_shared/trigger-secret';

const env = (value: string | undefined) => (name: string) => (name === 'EMAIL_TRIGGER_SECRET' ? value : undefined);
const req = (headers: Record<string, string> = {}) =>
  new Request('https://example.test/functions/v1/send-welcome-discount', { method: 'POST', headers });

describe('VTID-05118 isTriggerSecretCaller', () => {
  it('accepts the matching secret', () => {
    expect(isTriggerSecretCaller(req({ 'x-trigger-secret': 's3cret' }), env('s3cret'))).toBe(true);
  });

  it('refuses a wrong value or a value of a different length', () => {
    expect(isTriggerSecretCaller(req({ 'x-trigger-secret': 's3creX' }), env('s3cret'))).toBe(false);
    expect(isTriggerSecretCaller(req({ 'x-trigger-secret': 's3cret-longer' }), env('s3cret'))).toBe(false);
    expect(isTriggerSecretCaller(req({ 'x-trigger-secret': 's3' }), env('s3cret'))).toBe(false);
  });

  it('refuses a request without the header', () => {
    expect(isTriggerSecretCaller(req(), env('s3cret'))).toBe(false);
  });

  it('refuses everything when the secret is unset', () => {
    expect(isTriggerSecretCaller(req({ 'x-trigger-secret': 's3cret' }), env(undefined))).toBe(false);
    expect(isTriggerSecretCaller(req({ 'x-trigger-secret': '' }), env(undefined))).toBe(false);
  });

  it('refuses an empty header when the secret is empty or blank', () => {
    expect(isTriggerSecretCaller(req({ 'x-trigger-secret': '' }), env(''))).toBe(false);
    expect(isTriggerSecretCaller(req({ 'x-trigger-secret': '' }), env('   '))).toBe(false);
    expect(isTriggerSecretCaller(req({ 'x-trigger-secret': '   ' }), env('   '))).toBe(false);
  });

  it('ignores a bearer token carrying the secret', () => {
    expect(isTriggerSecretCaller(req({ Authorization: 'Bearer s3cret' }), env('s3cret'))).toBe(false);
  });
});

describe('VTID-05118 timingSafeEqual', () => {
  it('is true only for identical strings', () => {
    expect(timingSafeEqual('a', 'a')).toBe(true);
    expect(timingSafeEqual('a', 'b')).toBe(false);
    expect(timingSafeEqual('a', 'ab')).toBe(false);
  });
});
