/**
 * VTID-05178 — the N3 port for links and session state (N4-APP Changes 10–12).
 *
 * N4 owns no auth. This stub is the seam N3 (shell + auth) plugs into:
 * - `onAuthLink(handler)` receives `/auth/confirmed`, `/reset-password` and
 *   `/oauth/complete` links; `onInviteLink(handler)` receives `/i/:code`.
 *   A link that arrives before N3 registers a handler is kept (the latest of
 *   each kind) and delivered on registration, so a cold-start link is not lost.
 * - `setSession(session | null)` is N3's auth guard signal: the link router
 *   holds route targets while there is no session and replays the latest one
 *   when a session appears. Until N3 lands there is never a session, so
 *   route targets stay held (no screen behind sign-in is ever opened).
 */
import type { ResolvedLink } from './resolve-link';

export type AuthLink = Extract<ResolvedLink, { kind: 'auth' | 'oauth_return' }>;
export type InviteLink = Extract<ResolvedLink, { kind: 'invite' }>;

/** What N4 needs from N3's session: the gateway bearer token. */
export interface SessionLike {
  accessToken: string;
}

type Handler<T> = (link: T) => void;

function channel<T>() {
  let handler: Handler<T> | null = null;
  let pending: T | null = null;
  return {
    on(h: Handler<T>): () => void {
      handler = h;
      if (pending !== null) {
        const p = pending;
        pending = null;
        h(p);
      }
      return () => {
        if (handler === h) handler = null;
      };
    },
    deliver(link: T): void {
      if (handler) handler(link);
      else pending = link;
    },
    reset(): void {
      handler = null;
      pending = null;
    },
  };
}

const authChannel = channel<AuthLink>();
const inviteChannel = channel<InviteLink>();

let session: SessionLike | null = null;
const sessionListeners = new Set<(s: SessionLike | null) => void>();

export function onAuthLink(handler: Handler<AuthLink>): () => void {
  return authChannel.on(handler);
}

export function onInviteLink(handler: Handler<InviteLink>): () => void {
  return inviteChannel.on(handler);
}

export function deliverAuthLink(link: AuthLink): void {
  authChannel.deliver(link);
}

export function deliverInviteLink(link: InviteLink): void {
  inviteChannel.deliver(link);
}

export function getSession(): SessionLike | null {
  return session;
}

/** N3 calls this after sign-in (with the session) and on sign-out (null). */
export function setSession(next: SessionLike | null): void {
  session = next;
  sessionListeners.forEach((l) => l(next));
}

export function subscribeSession(listener: (s: SessionLike | null) => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

/** Test seam: clears handlers, pending links and the session. */
export function resetAuthPort(): void {
  authChannel.reset();
  inviteChannel.reset();
  session = null;
  sessionListeners.clear();
}
