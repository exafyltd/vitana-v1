/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the public web origin a share link points at.
 * The web uses `window.location.origin`; natively it is `webBaseUrl` (unset in every non-production
 * profile) or the gateway origin, never a hardcoded host (the env guard blocks those).
 */
import { config, endpoints } from '../../ports/env';

export function shareOrigin(): string {
  if (config.webBaseUrl) return config.webBaseUrl.replace(/\/+$/, '');
  try {
    return endpoints(config).gatewayOrigin.replace(/\/+$/, '');
  } catch {
    return '';
  }
}
