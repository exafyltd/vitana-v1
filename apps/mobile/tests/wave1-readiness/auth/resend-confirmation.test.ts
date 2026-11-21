/**
 * VTID-05681 (native-wave1-readiness-tests/auth, A2) — readiness evidence only; mocks only, no network.
 * Does NOT prove the Wave 1 exit (needs G1, NATIVE-APP-PLAN.md §5).
 *
 * resendConfirmation (src/auth/sign-in.ts:142) against the supabase double.
 * NOTE: the double (tests/helpers/supabase-double.ts) has no `auth.resend`, and helpers may not be edited,
 * so this file adds `resend` to the double's auth object itself.
 */
import '../../helpers/no-network';
import '../../helpers/mocks';
import { ConfigMissingError } from '../../../src/ports/env';
import { resendConfirmation } from '../../../src/auth/sign-in';
import { createSupabaseDouble } from '../../helpers/supabase-double';

jest.mock('../../../src/ports/env', () => {
  const actual = jest.requireActual('../../../src/ports/env');
  return { ...actual, config: { authRedirectUrl: 'https://g1-auth.example.org/' } };
});

const BASE = 'https://g1-auth.example.org';

function withResend(answer: (args: unknown) => unknown | Promise<unknown>) {
  const d = createSupabaseDouble();
  const resend = jest.fn(async (args: unknown) => answer(args));
  d.client.auth.resend = resend;
  return { d, resend };
}

describe('resendConfirmation (sign-in.ts:142)', () => {
  it('success: resends a signup mail with the tenant’s confirmation redirect', async () => {
    const { d, resend } = withResend(() => ({ data: {}, error: null }));
    await expect(resendConfirmation('ana@example.org', 'alkalma', d.client)).resolves.toEqual({ ok: true });
    expect(resend).toHaveBeenCalledTimes(1);
    expect(resend).toHaveBeenCalledWith({ type: 'signup', email: 'ana@example.org', options: { emailRedirectTo: `${BASE}/alkalma?confirmed=true` } });
  });

  it('uses the generic /<slug>?confirmed=true link for a registry tenant', async () => {
    const { d, resend } = withResend(() => ({ data: {}, error: null }));
    await resendConfirmation('ana@example.org', 'acme', d.client);
    expect(resend.mock.calls[0][0]).toMatchObject({ options: { emailRedirectTo: `${BASE}/acme?confirmed=true` } });
  });

  it('an error answer: ok false with the message, no error key', async () => {
    const { d } = withResend(() => ({ data: null, error: { message: 'User not found' } }));
    await expect(resendConfirmation('x@example.org', 'maxina', d.client)).resolves.toEqual({ ok: false, message: 'User not found' });
  });

  it.each(['email rate limit exceeded', 'too many requests'])('"%s" is a rate limit with the web toast key', async (message) => {
    const { d } = withResend(() => ({ data: null, error: { message } }));
    await expect(resendConfirmation('x@example.org', 'maxina', d.client)).resolves.toEqual({
      ok: false,
      rateLimited: true,
      errorKey: 'toasts.auth.tooManyAttemptsPleaseWaitFew',
    });
  });

  it('a thrown error maps to a catalog key instead of escaping', async () => {
    const { d } = withResend(() => {
      throw new Error('socket hang up');
    });
    await expect(resendConfirmation('x@example.org', 'maxina', d.client)).resolves.toEqual({ ok: false, errorKey: 'screens.portals.somethingWentWrong' });
  });

  it('a call that never answers ends at the sign-in deadline as the "taking longer" key', async () => {
    jest.useFakeTimers();
    try {
      const { d } = withResend(() => new Promise(() => undefined));
      const pending = resendConfirmation('x@example.org', 'maxina', d.client);
      await jest.advanceTimersByTimeAsync(15_000);
      await expect(pending).resolves.toEqual({ ok: false, errorKey: 'screens.portals.signinTakingLongerThanExpected' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('never calls the backend when authRedirectUrl is unset (config error is thrown before)', async () => {
    const env = jest.requireMock('../../../src/ports/env') as { config: Record<string, string | undefined> };
    const saved = env.config.authRedirectUrl;
    delete env.config.authRedirectUrl;
    try {
      const { d, resend } = withResend(() => ({ data: {}, error: null }));
      await expect(resendConfirmation('x@example.org', 'maxina', d.client)).rejects.toBeInstanceOf(ConfigMissingError);
      expect(resend).not.toHaveBeenCalled();
    } finally {
      env.config.authRedirectUrl = saved;
    }
  });
});
