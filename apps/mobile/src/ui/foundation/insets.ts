/** VTID-05176 — safe-area insets without throwing when no SafeAreaProvider is mounted (tests, catalogue). */
import { useContext } from 'react';
import { SafeAreaInsetsContext, type EdgeInsets } from 'react-native-safe-area-context';

const ZERO: EdgeInsets = { top: 0, bottom: 0, left: 0, right: 0 }; // physical-ok: EdgeInsets is physical by definition

export function useInsets(): EdgeInsets {
  return useContext(SafeAreaInsetsContext) ?? ZERO;
}
