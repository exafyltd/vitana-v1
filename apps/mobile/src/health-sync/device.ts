/**
 * VTID-05184 — device facts for the `source` block and the install id
 * (N5a, plan changes 7 "Fields" and 12).
 */
import type { DevicePort, InstallIdPort } from './ports';

export const INSTALL_ID_ITEM = 'vitana.healthSync.installId.v1';

/** Platform.OS / Platform.Version / Platform.constants, expo-constants and expo-localization. */
export function defaultDevice(): DevicePort {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Platform } = require('react-native') as typeof import('react-native');
  const Constants = (require('expo-constants') as typeof import('expo-constants')).default;
  const Localization = require('expo-localization') as typeof import('expo-localization');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const c = (Platform.constants ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null);
  return {
    os: Platform.OS,
    osVersion: String(Platform.Version),
    appVersion: Constants.expoConfig?.version ?? '0.0.0',
    manufacturer: Platform.OS === 'ios' ? 'Apple' : str(c.Manufacturer),
    model: Platform.OS === 'ios' ? null : str(c.Model),
    timeZone: () => Localization.getCalendars()[0]?.timeZone ?? 'UTC',
  };
}

/** randomUUID() once per install, secure-store `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` (a restored phone is a new source). */
export function secureInstallId(): InstallIdPort {
  let cached: string | null = null;
  return {
    async get() {
      if (cached) return cached;
      /* eslint-disable @typescript-eslint/no-require-imports */
      const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
      const Crypto = require('expo-crypto') as typeof import('expo-crypto');
      /* eslint-enable @typescript-eslint/no-require-imports */
      const opts = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
      let id = await SecureStore.getItemAsync(INSTALL_ID_ITEM, opts);
      if (!id) {
        id = Crypto.randomUUID();
        await SecureStore.setItemAsync(INSTALL_ID_ITEM, id, opts);
      }
      cached = id;
      return id;
    },
  };
}
