/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) — Expo
 * Router ranks the lane's concrete (public) route files above the resolver
 * route, including the `_intro/[tenantSlug]` and `i/[code]` segments, and the
 * web paths resolve as native in the one path resolver.
 */
import '../helpers/no-network';
import { Text } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { resolveWebPath } from '../../src/navigation/resolve';

describe('Expo Router: the public routes', () => {
  const routes = {
    index: () => <Text>landing-redirect</Text>,
    '(public)/_layout': () => {
      const { Stack } = jest.requireActual('expo-router');
      return <Stack />;
    },
    '(public)/privacy': () => <Text>privacy-route</Text>,
    '(public)/terms': () => <Text>terms-route</Text>,
    '(public)/maxina_support': () => <Text>support-route</Text>,
    '(public)/apply': () => <Text>apply-route</Text>,
    '(public)/i/[code]': () => <Text>invite-route</Text>,
    '(public)/_intro/[tenantSlug]': () => <Text>intro-route</Text>,
    '(app)/[...path]': () => <Text>resolver-route</Text>,
  };
  it.each([
    ['/privacy', 'privacy-route'],
    ['/terms?lang=en', 'terms-route'],
    ['/maxina_support', 'support-route'],
    ['/apply?utm_source=ig', 'apply-route'],
    ['/i/abc123', 'invite-route'],
    ['/_intro/maxina', 'intro-route'],
    ['/download', 'resolver-route'],
    ['/maxina/app', 'resolver-route'],
  ])('%s → %s', (url, label) => {
    renderRouter(routes, { initialUrl: url });
    expect(screen.getByText(label)).toBeTruthy();
  });
});

describe('resolveWebPath', () => {
  it.each(['/privacy', '/terms', '/maxina_support', '/apply'])('%s is native', (p) => {
    expect(resolveWebPath(p).kind).toBe('native');
  });

  it.each(['/download', '/maxina/app'])('%s (kept exception) is not native', (p) => {
    expect(resolveWebPath(p).kind).not.toBe('native');
  });
});
