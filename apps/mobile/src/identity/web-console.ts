/**
 * VTID-05186 (N3, plan change 11; program decision 3) — admin/staff consoles
 * and developer/infra destinations open in the system browser at
 * `webBaseUrl + path`. With `webBaseUrl` unset (every non-production profile)
 * the `native.adminInBrowser` sheet opens instead. Never a production host:
 * `webBaseUrl` passed assertNotProduction when the config was loaded.
 */
import { Linking } from 'react-native';
import { config } from '../ports/env';
import { overlayBus } from '../navigation/overlay-bus';

export function webConsoleUrl(path: string, base: string | undefined = config.webBaseUrl): string | null {
  if (!base) return null;
  if (/^https?:\/\//.test(path)) return null;
  return `${base.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function openWebConsole(path: string, base: string | undefined = config.webBaseUrl): Promise<'browser' | 'sheet'> {
  const url = webConsoleUrl(path, base);
  if (url) {
    try {
      await Linking.openURL(url);
      return 'browser';
    } catch {
      /* fall through to the sheet */
    }
  }
  overlayBus.emit('adminInBrowser:open', { path });
  return 'sheet';
}
