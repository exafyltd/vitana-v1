/**
 * VTID-05186 (N3, plan change 13) — dark mode and tenant theming.
 *
 * `light | dark | system`, default **light** like the web (`main.tsx:108`
 * `defaultTheme="light"`), persisted per device in AsyncStorage. Colours come
 * from the tokens port; the tenant brand accent/bg/fg from N1's
 * `tenantBrand(slug, registry)` — the tenant registry (VTID-05151): an
 * unlisted tenant has no brand (null) and renders neutral, never as Maxina.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { shellColors, maxinaTopbar, type ColorScheme, type ShellColors } from '../ports/tokens';
import { FALLBACK_REGISTRY, canonicalTenantSlug, tenantBrand, type TenantBrand, type TenantRegistry } from '../ports/core';
import { deviceStorage, STORAGE_KEYS } from '../identity/device-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export const DEFAULT_THEME_MODE: ThemeMode = 'light';

type ModeValue = { mode: ThemeMode; scheme: ColorScheme; setMode: (m: ThemeMode) => void };

const ThemeModeContext = createContext<ModeValue | null>(null);

const isMode = (v: unknown): v is ThemeMode => v === 'light' || v === 'dark' || v === 'system';

export function ThemeProvider({ children, initialMode }: { children: ReactNode; initialMode?: ThemeMode }) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode ?? DEFAULT_THEME_MODE);
  const system = useColorScheme();
  useEffect(() => {
    if (initialMode) return;
    let active = true;
    void Promise.resolve(deviceStorage.getItem(STORAGE_KEYS.theme)).then((v) => {
      if (active && isMode(v)) setModeState(v);
    });
    return () => {
      active = false;
    };
  }, [initialMode]);
  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    void deviceStorage.setItem(STORAGE_KEYS.theme, m);
  }, []);
  const scheme: ColorScheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const value = useMemo(() => ({ mode, scheme, setMode }), [mode, scheme, setMode]);
  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode(): ModeValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used inside <ThemeProvider>');
  return ctx;
}

export type ShellTheme = {
  scheme: ColorScheme;
  colors: ShellColors;
  /** null for a tenant the registry does not list (neutral, never Maxina). */
  brand: TenantBrand | null;
  isMaxina: boolean;
  maxinaTopbar: typeof maxinaTopbar;
};

/** Theme values for a tenant slug and the registry (the shell passes the resolved ones). */
export function useShellTheme(slug: string | null | undefined, registry: TenantRegistry = FALLBACK_REGISTRY): ShellTheme {
  const { scheme } = useThemeMode();
  return useMemo(() => {
    const brand = tenantBrand(slug, registry);
    return { scheme, colors: shellColors(scheme), brand, isMaxina: canonicalTenantSlug(slug ?? null) === 'maxina', maxinaTopbar };
  }, [scheme, slug, registry]);
}
