/**
 * VTID-05681 (native-wave1-readiness-tests/auth, A1) — readiness evidence only; mocks only, no network.
 * Does NOT prove the Wave 1 exit (needs G1, NATIVE-APP-PLAN.md §5).
 *
 * The pure helpers of src/auth/sign-in.ts that no test referenced on origin/main:
 * oauthErrorKey (:69), SignInTimeoutError (:43), SIGN_IN_DEADLINE_MS (:35), emailRedirectFor (:87),
 * resetRedirect (:92) and the authRedirectUrl link base (:83).
 */
import '../../helpers/no-network';
import '../../helpers/mocks';
import { ConfigMissingError } from '../../../src/ports/env';
import { SIGN_IN_DEADLINE_MS, SignInTimeoutError, emailRedirectFor, oauthErrorKey, resetRedirect } from '../../../src/auth/sign-in';

// The link base comes from `config.authRedirectUrl`; the file owns a mutable config (no shared mock is touched).
jest.mock('../../../src/ports/env', () => {
  const actual = jest.requireActual('../../../src/ports/env');
  return { ...actual, config: { authRedirectUrl: 'https://g1-auth.example.org' } };
});

const mockedConfig = (jest.requireMock('../../../src/ports/env') as { config: Record<string, string | undefined> }).config;
const BASE = 'https://g1-auth.example.org';

beforeEach(() => {
  mockedConfig.authRedirectUrl = BASE;
});

const TAKING_LONGER = 'screens.portals.signinTakingLongerThanExpected';
const TRY_APPLE = 'screens.portals.tryAppleSigninAgain';
const WRONG = 'screens.portals.somethingWentWrong';

describe('oauthErrorKey (sign-in.ts:69)', () => {
  it.each([
    ['an Error that timed out', new Error('Request timed out'), TAKING_LONGER],
    ['the timeout error itself', new SignInTimeoutError(), TAKING_LONGER],
    ['a TIMED OUT string in any case', 'Operation TIMED OUT', TAKING_LONGER],
    ['an Apple cancel', new Error('Apple sign in was canceled'), TRY_APPLE],
    ['an Apple expiry', new Error('apple credential expired'), TRY_APPLE],
    ['a Google cancel (not Apple)', new Error('google sign in cancelled'), WRONG],
    ['an Apple error without cancel or expiry', new Error('apple server error'), WRONG],
    ['any other Error', new Error('boom'), WRONG],
    ['a plain string', 'nope', WRONG],
    ['an object with a message', { message: 'apple flow cancelled' }, TRY_APPLE],
    ['an object with a timeout message', { message: 'timed out' }, TAKING_LONGER],
    ['an object without a message', {}, WRONG],
    ['undefined', undefined, WRONG],
    ['null', null, WRONG],
  ])('%s', (_name, input, key) => {
    expect(oauthErrorKey(input)).toBe(key);
  });

  it('checks the timeout before the Apple branch', () => {
    expect(oauthErrorKey(new Error('apple timed out and canceled'))).toBe(TAKING_LONGER);
  });
});

describe('SignInTimeoutError (sign-in.ts:43)', () => {
  it('has the name and message the failure mapper relies on', () => {
    const e = new SignInTimeoutError();
    expect(e.name).toBe('SignInTimeoutError');
    expect(e.message).toBe('sign-in timed out');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(SignInTimeoutError);
  });
});

describe('SIGN_IN_DEADLINE_MS (sign-in.ts:35)', () => {
  it('is the web portals’ 15 s deadline', () => {
    expect(SIGN_IN_DEADLINE_MS).toBe(15_000);
  });
});

describe('emailRedirectFor / resetRedirect (sign-in.ts:87, :92)', () => {
  it.each([
    ['maxina', `${BASE}/maxina?confirmed=true`],
    ['alkalma', `${BASE}/alkalma?confirmed=true`],
    ['acme-clinic', `${BASE}/acme-clinic?confirmed=true`],
  ])('confirmation link for %s', (slug, url) => {
    expect(emailRedirectFor(slug)).toBe(url);
  });

  it('password reset link is the recovery path', () => {
    expect(resetRedirect()).toBe(`${BASE}/reset-password?type=recovery`);
  });

  it('trims trailing slashes from authRedirectUrl', () => {
    mockedConfig.authRedirectUrl = `${BASE}///`;
    expect(emailRedirectFor('maxina')).toBe(`${BASE}/maxina?confirmed=true`);
    expect(resetRedirect()).toBe(`${BASE}/reset-password?type=recovery`);
  });

  it('a missing authRedirectUrl throws ConfigMissingError for it, never a default link', () => {
    delete mockedConfig.authRedirectUrl;
    for (const call of [() => emailRedirectFor('maxina'), () => resetRedirect()]) {
      let thrown: unknown;
      try {
        call();
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(ConfigMissingError);
      expect((thrown as ConfigMissingError).keys).toEqual(['authRedirectUrl']);
    }
  });

  it('a blank authRedirectUrl is also missing', () => {
    mockedConfig.authRedirectUrl = '';
    expect(() => resetRedirect()).toThrow(ConfigMissingError);
  });

  it('refuses a production host rather than building a link on it', () => {
    mockedConfig.authRedirectUrl = 'https://vitanaland.com';
    expect(() => emailRedirectFor('maxina')).toThrow(/Refusing/);
  });
});
