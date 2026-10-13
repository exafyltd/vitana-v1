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
