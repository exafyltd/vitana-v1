/**
 * VTID-05186 (N3, Interfaces I-N4) — app links, consumed from N4.
 *
 * N4 owns the link scheme and universal links / App Links. Until it exports
 * `appLink(path)`, this is the stand-in the plan names: `Linking.createURL`
 * from expo-linking (already a Wave 0 dependency), which builds a URL for the
 * placeholder scheme of the running build — never a web host. N4 replaces the
 * body; callers keep importing `appLink` from here.
 */
import * as Linking from 'expo-linking';

export function appLink(path: string): string {
  return Linking.createURL(path.startsWith('/') ? path.slice(1) : path);
}

/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — opens another
 * lane's screen by its web path (e.g. an inbox row → the conversation-chat
 * lane's `/inbox/u/<id>`, `/inbox/g/<id>`, `/inbox/t/<id>`) through the shell
 * resolver: native once that route file exists, the Unported screen until
 * then. Lanes navigate by path and never import each other's screens.
 * The navigator is required lazily so `appLink`'s importers (sign-in) do not
 * load expo-router.
 */
export function openWebPath(path: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { navigateToWebPath } = require('../navigation/navigate') as typeof import('../navigation/navigate');
  navigateToWebPath(path);
}
