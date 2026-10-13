/**
 * VTID-05186 (N3) — per-device conveniences in AsyncStorage (never a session:
 * the session lives in SecureStore, src/auth/secure-storage.ts). Every call is
 * guarded: a failing storage reads as "nothing stored".
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createActiveOrgStore, ACTIVE_ORG_STORAGE_KEY, type KeyValueStorage } from '../ports/core';

export const deviceStorage: KeyValueStorage = {
  async getItem(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      /* per-device convenience only */
    }
  },
  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* per-device convenience only */
    }
  },
};

/** The web keys, so a value means the same thing on both. */
export const STORAGE_KEYS = {
  tenantSlug: 'tenant_slug',
  language: 'vitana.lang',
  queryCache: 'vitana-query-cache',
  theme: 'vitana.themeMode',
  journeyModePrefix: 'vitana.journeyMode',
  activeOrg: ACTIVE_ORG_STORAGE_KEY,
} as const;

/** The shared active-org store (business-mode.ts:118-139 semantics) over AsyncStorage. */
export const activeOrgStore = createActiveOrgStore(deviceStorage);

/**
 * Sign-out cleanup — the native twin of SideDrawerNav.tsx:251-257 and
 * AuthProvider.tsx:14-30: the persisted query cache, the tenant slug and the
 * ORB / vitana.auth* / vitana.user* keys.
 */
export async function clearSignedOutState(): Promise<void> {
  activeOrgStore.set(null);
  let keys: readonly string[] = [];
  try {
    keys = await AsyncStorage.getAllKeys();
  } catch {
    keys = [];
  }
  const doomed = new Set<string>([STORAGE_KEYS.queryCache, STORAGE_KEYS.tenantSlug, STORAGE_KEYS.activeOrg]);
  for (const k of keys) {
    if (k.startsWith('orb_') || k.startsWith('vitana.auth') || k.startsWith('vitana.user')) doomed.add(k);
  }
  try {
    await AsyncStorage.multiRemove([...doomed]);
  } catch {
    /* nothing else to do: the session itself is already gone */
  }
}
