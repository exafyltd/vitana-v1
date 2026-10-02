// VTID-04832 — Commerce OAuth returns to its own host; a failed or expired
// round-trip lands on the Commerce join screen, never the MAXINA intro.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyCommerceOAuthReturn,
  commerceOAuthErrorTarget,
  oauthErrorFrom,
  oauthReturnUrl,
  rememberCommerceOAuth,
  takeCommerceOAuth,
} from './oauth-return';

const EXPIRED = '?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+has+expired';

describe('oauthReturnUrl', () => {
  it('returns to staging when the sign-in started on staging', () => {
    expect(oauthReturnUrl('/commerce', 'https://preview-aws.vitanaland.com')).toBe('https://preview-aws.vitanaland.com/commerce');
  });
  it('returns to production from production', () => {
    expect(oauthReturnUrl('/commerce', 'https://vitanaland.com')).toBe('https://vitanaland.com/commerce');
  });
  it('falls back to production for any other host (previews, localhost, http)', () => {
    expect(oauthReturnUrl('/commerce', 'https://d2w0cqhh9jhjpj.cloudfront.net')).toBe('https://vitanaland.com/commerce');
    expect(oauthReturnUrl('/commerce', 'http://localhost:8080')).toBe('https://vitanaland.com/commerce');
    expect(oauthReturnUrl('/commerce', 'http://preview-aws.vitanaland.com')).toBe('https://vitanaland.com/commerce');
  });
});

describe('oauthErrorFrom', () => {
  it('reads the expired-state error from the query (the reported case)', () => {
    expect(oauthErrorFrom(EXPIRED, '')).toBe('expired');
  });
  it('reads errors from the hash too', () => {
    expect(oauthErrorFrom('', '#error=access_denied&error_description=denied')).toBe('cancelled');
    expect(oauthErrorFrom('', '#error=server_error')).toBe('failed');
  });
  it('ignores a normal landing', () => {
    expect(oauthErrorFrom('?confirmed=true', '')).toBeNull();
    expect(oauthErrorFrom('', '#access_token=x')).toBeNull();
  });
});

describe('commerceOAuthErrorTarget', () => {
  it('sends a Commerce sign-in error to the join screen, wherever it landed', () => {
    expect(commerceOAuthErrorTarget('/_intro/maxina', EXPIRED, '', true)).toBe('/commerce/join?oauth_error=expired');
    expect(commerceOAuthErrorTarget('/', EXPIRED, '', true)).toBe('/commerce/join?oauth_error=expired');
  });
  it('handles an error that lands on a /commerce route without a marker', () => {
    expect(commerceOAuthErrorTarget('/commerce', '?error=access_denied', '', false)).toBe('/commerce/join?oauth_error=cancelled');
  });
  it('leaves other portals alone (MAXINA keeps its own behaviour)', () => {
    expect(commerceOAuthErrorTarget('/_intro/maxina', EXPIRED, '', false)).toBeNull();
    expect(commerceOAuthErrorTarget('/maxina', EXPIRED, '', false)).toBeNull();
  });
});

describe('marker', () => {
  beforeEach(() => localStorage.clear());
  it('is fresh for 30 minutes and is consumed once', () => {
    rememberCommerceOAuth(1_000);
    expect(takeCommerceOAuth(1_000 + 29 * 60_000)).toBe(true);
    expect(takeCommerceOAuth(1_000 + 29 * 60_000)).toBe(false);
  });
  it('expires after 30 minutes', () => {
    rememberCommerceOAuth(1_000);
    expect(takeCommerceOAuth(1_000 + 31 * 60_000)).toBe(false);
  });
});

describe('applyCommerceOAuthReturn (boot)', () => {
  beforeEach(() => localStorage.clear());
  it('rewrites an expired Commerce sign-in landing to the join screen before the router starts', () => {
    rememberCommerceOAuth();
    window.history.replaceState(null, '', `/_intro/maxina${EXPIRED}`);
    applyCommerceOAuthReturn('/');
    expect(window.location.pathname + window.location.search).toBe('/commerce/join?oauth_error=expired');
  });
  it('does nothing for a MAXINA sign-in error', () => {
    window.history.replaceState(null, '', `/_intro/maxina${EXPIRED}`);
    applyCommerceOAuthReturn('/');
    expect(window.location.pathname).toBe('/_intro/maxina');
  });
  it('a successful return clears the marker', () => {
    rememberCommerceOAuth();
    window.history.replaceState(null, '', '/commerce?code=abc');
    applyCommerceOAuthReturn('/');
    expect(takeCommerceOAuth()).toBe(false);
  });
});
