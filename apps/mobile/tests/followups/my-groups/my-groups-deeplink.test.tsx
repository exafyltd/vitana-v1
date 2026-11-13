/**
 * VTID-05725 — `/comm/my-groups/:id` resolves native. The route file
 * `app/(app)/comm/my-groups/[id].tsx` exists, but the resolver called the path
 * `unported`, so deep links and the ORB refused it. The dynamic route belongs in
 * NATIVE_PATTERNS (NATIVE_ROUTES is tied to concrete files).
 */
import '../../helpers/no-network';
import { Text } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { resolveWebPath } from '../../../src/navigation/resolve';

describe('resolveWebPath /comm/my-groups/:id', () => {
  it('a group id is native', () => {
    expect(resolveWebPath('/comm/my-groups/g-1')).toEqual({
      kind: 'native',
      href: '/comm/my-groups/g-1',
      path: '/comm/my-groups/g-1',
      query: '',
    });
  });

  it('keeps the query', () => {
    expect(resolveWebPath('/comm/my-groups/g-1?x=1')).toMatchObject({
      kind: 'native',
      href: '/comm/my-groups/g-1?x=1',
      path: '/comm/my-groups/g-1',
      query: 'x=1',
    });
  });

  it('without an id it is not native', () => {
    expect(resolveWebPath('/comm/my-groups').kind).not.toBe('native');
  });

  it('with an extra segment it is not native', () => {
    expect(resolveWebPath('/comm/my-groups/g-1/extra').kind).not.toBe('native');
  });
});

describe('cold start', () => {
  it('/comm/my-groups/g-1 reaches the route, not the resolver', () => {
    renderRouter(
      {
        '(app)/comm/my-groups/[id]': () => <Text>group-route</Text>,
        '(app)/[...path]': () => <Text>resolver-route</Text>,
      },
      { initialUrl: '/comm/my-groups/g-1' },
    );
    expect(screen.getByText('group-route')).toBeTruthy();
    expect(screen.queryByText('resolver-route')).toBeNull();
  });
});
