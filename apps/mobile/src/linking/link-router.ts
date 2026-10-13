/**
 * VTID-05178 — link routing (N4-APP Change 11).
 *
 * One path for every way into a screen: incoming links (handed over by
 * `app/+native-intent.tsx`, which keeps Expo Router from routing them on its
 * own) and push opens both go through `resolveLink`, then
 * - `auth` / `oauth_return` → N3's `onAuthLink`, `invite` → N3's `onInviteLink`;
 * - a route → `router.push` when a session exists and the root layout has
 *   attached the navigator; otherwise it is held (latest wins) and replayed
 *   after N3's auth guard reports a session;
 * - anything that does not resolve → home.
 */
import { useEffect } from 'react';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { deliverAuthLink, deliverInviteLink, getSession, subscribeSession } from './auth-port';
import { hrefOf, resolveLink, resolvePushLink, type ResolvedLink } from './resolve-link';
import { getPushProvider } from '../push/provider';

export type Navigate = (href: string) => void;

export const HOME_HREF = '/';

export interface LinkRouterDeps {
  linkHosts: readonly string[];
  isSignedIn: () => boolean;
}

export interface LinkRouter {
  handleLink(input: unknown): ResolvedLink | null;
  handlePushOpen(data: unknown): ResolvedLink | null;
  /** The root layout attaches router.push once mounted; returns detach. */
  attachNavigator(navigate: Navigate): () => void;
  /** N3's auth guard: call on sign-in so a held target is replayed. */
  onSignedIn(): void;
  /** For tests and diagnostics: the held route target, if any. */
  heldHref(): string | null;
}

export function createLinkRouter(deps: LinkRouterDeps): LinkRouter {
  let navigate: Navigate | null = null;
  let held: string | null = null;

  const flush = () => {
    if (held !== null && navigate && deps.isSignedIn()) {
      const href = held;
      held = null;
      navigate(href);
    }
  };

  const dispatch = (link: ResolvedLink | null): ResolvedLink | null => {
    if (!link) {
      // Foreign or malformed: open home, never the link itself.
      navigate?.(HOME_HREF);
      return null;
    }
    switch (link.kind) {
      case 'auth':
      case 'oauth_return':
        deliverAuthLink(link);
        break;
      case 'invite':
        deliverInviteLink(link);
        break;
      default:
        held = hrefOf(link);
        flush();
    }
    return link;
  };

  return {
    handleLink: (input) => dispatch(resolveLink(input, { linkHosts: deps.linkHosts })),
    handlePushOpen: (data) => dispatch(resolvePushLink(data, { linkHosts: deps.linkHosts })),
    attachNavigator(nav) {
      navigate = nav;
      flush();
      return () => {
        if (navigate === nav) navigate = null;
      };
    },
    onSignedIn: flush,
    heldHref: () => held,
  };
}

/** The profile's link hosts from app.config.ts (`extra.linkHosts`); none until G1 has a web host. */
export function configuredLinkHosts(): string[] {
  const hosts = (Constants.expoConfig?.extra as { linkHosts?: unknown } | undefined)?.linkHosts;
  return Array.isArray(hosts) ? hosts.filter((h): h is string => typeof h === 'string') : [];
}

let singleton: LinkRouter | null = null;

export function getLinkRouter(): LinkRouter {
  if (!singleton) {
    singleton = createLinkRouter({ linkHosts: configuredLinkHosts(), isSignedIn: () => getSession() !== null });
  }
  return singleton;
}

/** Test seam: replace (or reset with null) the app-wide router. */
export function setLinkRouter(next: LinkRouter | null): void {
  singleton = next;
}

/**
 * Mounted once in the root layout: attaches router.push, replays a held
 * target after sign-in, and feeds push opens (cold start and while running)
 * through the resolver. With the Noop provider there are no push opens.
 */
export function useLinkRouting(): void {
  useEffect(() => {
    const linkRouter = getLinkRouter();
    const detach = linkRouter.attachNavigator((href) => router.push(href as never));
    const unsubSession = subscribeSession((s) => {
      if (s) linkRouter.onSignedIn();
    });
    const provider = getPushProvider();
    let cancelled = false;
    void provider
      .getInitialOpen()
      .then((open) => {
        if (!cancelled && open) linkRouter.handlePushOpen(open.data);
      })
      .catch(() => undefined);
    const unsubOpen = provider.onOpen((open) => {
      linkRouter.handlePushOpen(open.data);
    });
    return () => {
      cancelled = true;
      detach();
      unsubSession();
      unsubOpen();
    };
  }, []);
}
