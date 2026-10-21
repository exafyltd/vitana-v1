/**
 * VTID-05248 — a TEST-ONLY push provider for the G1 smoke (native G1 wiring).
 *
 * This is NOT the production provider. The production default stays
 * `NoopPushProvider` (provider.ts) until gate G2 brings FCM
 * (@react-native-firebase/messaging) in its own VTID. Nothing in the app
 * installs this; only the G1 smoke suites do, through `setPushProvider`
 * (provider.ts), so the Wave 1 exit path — a signed-in member with
 * `push_enabled` on registers a token and a push deep link routes — can be
 * proven end to end against the loopback fixture gateway (tools/fixture-gateway),
 * with no FCM, no Firebase package and no network beyond 127.0.0.1.
 *
 * It implements the real `PushProvider` port unchanged:
 *  - `isAvailable()` is true and `getToken()` yields a fixed test token, so the
 *    push client's provider gate opens (registration.ts);
 *  - `registerToken(session)` POSTs the token to the fixture's
 *    `POST /api/v1/notifications/token` in the SHAPE THE FIXTURE ACCEPTS
 *    (`{ token, device_type: 'ios' | 'android' }` — server.js validates those,
 *    not the app's `fcm_token`/`*_native` wire shape), carrying the member's
 *    bearer token;
 *  - `pushOpen(url)` builds the `PushOpen` a tapped notification delivers
 *    (`data.url`), the payload the smoke feeds to `resolvePushLink` /
 *    `resolveLink` to prove a push deep link resolves to the right route.
 *
 * Resolving the link and registering the token are kept separate here, exactly
 * as the real pipeline separates `registration.ts` (token POST) from
 * `link-router.ts` / `resolve-link.ts` (push-open routing); the smoke drives
 * both through this one test provider.
 */
import { fetchWithTimeout, gatewayEndpoint, type FetchLike } from '../config/http';
import { TOKEN_PATH } from './registration';
import type { SessionLike } from '../linking/auth-port';
import type { PushOpen, PushProvider } from './provider';

/** What the fixture's POST /api/v1/notifications/token validates (server.js). */
export type FixtureDeviceType = 'ios' | 'android';

export interface G1TestPushConfig {
  /** The loopback fixture base, e.g. `http://127.0.0.1:<port>` (never a real host). */
  gatewayUrl: string;
  /** The device_type the fixture records; defaults to `'ios'`. */
  deviceType?: FixtureDeviceType;
  /** The token this provider yields and posts; defaults to a fixed test token. */
  token?: string;
  /** Injected so the smoke passes its own loopback fetch; defaults to global fetch. */
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

export interface TokenPostResult {
  status: number;
  ok: boolean;
  body: unknown;
}

export const DEFAULT_G1_TEST_TOKEN = 'g1-test-push-token';
const G1_TEST_PUSH_TIMEOUT_MS = 3000;

const noop = () => undefined;

export interface G1TestPushProvider extends PushProvider {
  /** The token this provider reports and registers. */
  readonly token: string;
  readonly deviceType: FixtureDeviceType;
  /** POSTs the token to the fixture in the shape it accepts, with the member's bearer. */
  registerToken(session: SessionLike): Promise<TokenPostResult>;
  /** The `PushOpen` a tapped notification carrying `url` delivers. */
  pushOpen(url: string): PushOpen;
}

/**
 * Builds the test provider. `setPushProvider(createG1TestPushProvider(...))`
 * installs it for the smoke; the production default is never touched.
 */
export function createG1TestPushProvider(config: G1TestPushConfig): G1TestPushProvider {
  const token = config.token ?? DEFAULT_G1_TEST_TOKEN;
  const deviceType: FixtureDeviceType = config.deviceType ?? 'ios';
  const fetchImpl: FetchLike = config.fetchImpl ?? ((input, init) => fetch(input, init));
  const timeoutMs = config.timeoutMs ?? G1_TEST_PUSH_TIMEOUT_MS;

  return {
    token,
    deviceType,

    // PushProvider port — enough of it to open the push client's gate.
    isAvailable: () => true,
    getToken: async () => token,
    onTokenRefresh: () => noop,
    requestPermission: async () => 'granted',
    getInitialOpen: async () => null,
    onOpen: () => noop,
    onForegroundMessage: () => noop,
    setBadge: async () => undefined,

    async registerToken(session: SessionLike): Promise<TokenPostResult> {
      const url = gatewayEndpoint(config.gatewayUrl, TOKEN_PATH);
      const res = await fetchWithTimeout(
        fetchImpl,
        url,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ token, device_type: deviceType }),
        },
        timeoutMs,
      );
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      return { status: res.status, ok: res.ok, body };
    },

    pushOpen(url: string): PushOpen {
      return { data: { url } };
    },
  };
}
