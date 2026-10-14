/** VTID-05186 (N3, plan change 13) — dark mode default and tenant theming. */
import './helpers/no-network';
import './helpers/mocks';
import { act, renderHook } from '@testing-library/react-native';
import * as RN from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReactNode } from 'react';
import { ThemeProvider, useThemeMode, useShellTheme, DEFAULT_THEME_MODE } from '../src/theme/ThemeProvider';
import { FALLBACK_REGISTRY, normalizeEntry, tenantBrand, type TenantEntry } from '../src/ports/core';

const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

describe('theme', () => {
  it('defaults to light, like the web (main.tsx defaultTheme="light")', () => {
    expect(DEFAULT_THEME_MODE).toBe('light');
    const { result } = renderHook(() => useThemeMode(), { wrapper });
    expect(result.current.mode).toBe('light');
    expect(result.current.scheme).toBe('light');
  });

  it('system follows the OS appearance', () => {
    const spy = jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
    const { result } = renderHook(() => useThemeMode(), { wrapper });
    act(() => result.current.setMode('system'));
    expect(result.current.scheme).toBe('dark');
    spy.mockReturnValue('light');
    act(() => result.current.setMode('dark'));
    expect(result.current.scheme).toBe('dark');
    spy.mockRestore();
  });

  it('the choice is persisted per device', async () => {
    const { result } = renderHook(() => useThemeMode(), { wrapper });
    await act(async () => result.current.setMode('dark'));
    expect(await AsyncStorage.getItem('vitana.themeMode')).toBe('dark');
  });

  it('dark and light colours differ; brands come from the tenant registry; an unlisted tenant is neutral', () => {
    const reg = {
      source: 'rpc' as const,
      tenants: [
        normalizeEntry({ tenant_id: 't-m', slug: 'maxina', name: 'Maxina', brand: { accent: '#FF7BAC' } }) as TenantEntry,
        normalizeEntry({ tenant_id: 't-a', slug: 'alkalma', name: 'AlKalma', brand: { accent: '#123456' } }) as TenantEntry,
      ],
    };
    const { result } = renderHook(() => ({ m: useShellTheme('maxina', reg), a: useShellTheme('alkalma', reg), x: useShellTheme('nope', reg), f: useShellTheme('alkalma'), mode: useThemeMode() }), { wrapper });
    expect(result.current.m.brand?.brandAccent).toBe('#FF7BAC');
    expect(result.current.a.brand?.brandAccent).toBe('#123456');
    expect(result.current.x.brand).toBeNull();
    // With only the compiled fallback, Alkalma is unlisted → neutral, never Maxina.
    expect(result.current.f.brand).toBeNull();
    expect(tenantBrand('maxina', FALLBACK_REGISTRY)?.brandAccent).toBe('#FF7BAC');
    expect(result.current.m.isMaxina).toBe(true);
    expect(result.current.a.isMaxina).toBe(false);
    const light = result.current.m.colors.background;
    act(() => result.current.mode.setMode('dark'));
    expect(result.current.m.colors.background).not.toBe(light);
  });
});
