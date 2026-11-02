/**
 * VTID-05510 (sparring R1-F1) — `/discover/ai-picks` (web src/App.tsx:1034,
 * reached from "See all" in Vitana Picks) resolves to the native Discover
 * Vitana Picks tab (DISCOVER.AI_PICKS, `/discover?tab=suggested`) and is never
 * the Unported / not-found fallback — on a cold start too: a universal link
 * handled before the navigator exists is replayed into Expo Router, the
 * resolver route redirects (the registry alias route → mobileRoute, now that
 * `/discover` is a native route in src/navigation/resolve.ts) and the real
 * `app/(app)/discover/index.tsx` route renders with `tab=suggested`.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import { renderRouter, screen } from 'expo-router/testing-library';
import { resolveWebPath } from '../../src/navigation/resolve';
import { createLinkRouter } from '../../src/linking/link-router';
import Resolver from '../../app/(app)/[...path]';
import DiscoverRoute from '../../app/(app)/discover/index';

// The real route file renders DiscoverScreen; the screen itself is covered by
// discover.test.tsx, so here it only reports the params it was opened with.
jest.mock('../../src/screens/discover/DiscoverScreen', () => {
  const { Text: T } = jest.requireActual('react-native');
  const { useLocalSearchParams: params } = jest.requireActual('expo-router');
  return {
    DiscoverScreen: () => {
      const { tab } = params();
      return <T>{`discover-screen tab=${tab ?? ''}`}</T>;
    },
  };
});

describe('/discover/ai-picks', () => {
  it('resolves natively to the Vitana Picks tab (not Unported), keeping extra params', () => {
    expect(resolveWebPath('/discover/ai-picks')).toMatchObject({ kind: 'native', href: '/discover?tab=suggested', path: '/discover' });
    expect(resolveWebPath('/discover/ai-picks?utm=x').href).toBe('/discover?tab=suggested&utm=x');
  });

  it('cold start: the held link reaches the router, the resolver redirects, the real /discover route opens tab=suggested', () => {
    const lr = createLinkRouter({ linkHosts: [], isSignedIn: () => true });
    const navigated: string[] = [];
    lr.handleLink('https://vitanaland.com/discover/ai-picks');
    expect(navigated).toEqual([]);
    lr.attachNavigator((href) => navigated.push(href));
    expect(navigated).toEqual(['/discover/ai-picks']);
    renderRouter({ '(app)/[...path]': Resolver, '(app)/discover/index': DiscoverRoute }, { initialUrl: navigated[0] });
    expect(screen.getByText('discover-screen tab=suggested')).toBeTruthy();
    expect(screen.queryByTestId('unported')).toBeNull();
  });

  it.each(['/discover', '/discover?tab=categories', '/discover?tab=share', '/discover/supplements', '/discover/wellness-services', '/discover/deals-offers?tab=ai', '/shop'])('%s is a native route', (url) => {
    expect(resolveWebPath(url).kind).toBe('native');
  });
});
