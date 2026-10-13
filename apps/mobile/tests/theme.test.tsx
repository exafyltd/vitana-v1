/** VTID-05186 (N3, plan change 13) — dark mode default and tenant theming. */
import './helpers/no-network';
import './helpers/mocks';
import { act, renderHook } from '@testing-library/react-native';
import * as RN from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReactNode } from 'react';
import { ThemeProvider, useThemeMode, useShellTheme, DEFAULT_THEME_MODE } from '../src/theme/ThemeProvider';
import { tenantBrand } from '../src/ports/core';

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

  it('dark and light colours differ; Maxina vs Alkalma accents come from tenantBrand', () => {
    const { result } = renderHook(() => ({ m: useShellTheme('maxina'), a: useShellTheme('alkalma'), mode: useThemeMode() }), { wrapper });
    expect(result.current.m.brand.brandAccent).toBe(tenantBrand('maxina').brandAccent);
    expect(result.current.m.brand.brandAccent).toBe('#FF7BAC');
    expect(result.current.a.brand.brandAccent).toBe('#3B82F6');
    expect(result.current.m.isMaxina).toBe(true);
    expect(result.current.a.isMaxina).toBe(false);
    const light = result.current.m.colors.background;
    act(() => result.current.mode.setMode('dark'));
    expect(result.current.m.colors.background).not.toBe(light);
  });
});
