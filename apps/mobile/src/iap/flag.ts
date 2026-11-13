/**
 * VTID-05680 — the `iap_enabled` flag. Defaults OFF. Deliberately not in `config/remote-config.ts`
 * (shared infra); a later lane wires remote config by calling `setIapFlagResolver`.
 */
export const IAP_FLAG_NAME = 'iap_enabled';

const defaultResolver = (): boolean => false;

let resolver: () => boolean = defaultResolver;

/** A resolver that throws counts as OFF. */
export function isIapEnabled(): boolean {
  try {
    return resolver() === true;
  } catch {
    return false;
  }
}

/** `null` restores the OFF default. */
export function setIapFlagResolver(fn: (() => boolean) | null): void {
  resolver = fn ?? defaultResolver;
}
