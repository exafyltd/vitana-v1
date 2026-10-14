/**
 * VTID-05176 — the `@vitana/tokens` contract (plan "Interfaces for other
 * lanes"). Runs against whatever the alias resolves to: the N2 stub now, N1's
 * package later.
 */
import { processColor } from 'react-native';
import * as mod from '@vitana/tokens';
import type { SemanticColors, ShadowStyle } from '@vitana/tokens';

const COLOR_KEYS: (keyof SemanticColors)[] = [
  'background', 'foreground', 'card', 'cardForeground', 'popover', 'popoverForeground',
  'primary', 'primaryForeground', 'secondary', 'secondaryForeground', 'muted', 'mutedForeground',
  'accent', 'accentForeground', 'destructive', 'destructiveForeground', 'border', 'input', 'ring',
  'statusSuccess', 'statusSuccessSubtle', 'statusWarning', 'statusWarningSubtle',
  'statusError', 'statusErrorSubtle', 'statusInfo', 'statusInfoSubtle',
];

function parsable(color: unknown): boolean {
  return typeof color === 'string' && processColor(color) !== null && processColor(color) !== undefined;
}

function isShadow(s: ShadowStyle): boolean {
  return (
    parsable(s.shadowColor) &&
    Number.isFinite(s.shadowOffset?.width) &&
    Number.isFinite(s.shadowOffset?.height) &&
    Number.isFinite(s.shadowOpacity) &&
    Number.isFinite(s.shadowRadius) &&
    Number.isFinite(s.elevation)
  );
}

describe('@vitana/tokens contract', () => {
  const { tokens } = mod;

  it('exports TOKENS_VERSION and tokens', () => {
    expect(typeof mod.TOKENS_VERSION).toBe('string');
    expect(mod.TOKENS_VERSION.length).toBeGreaterThan(0);
    expect(tokens).toBeTruthy();
  });

  it.each(['light', 'dark'] as const)('%s has every semantic colour, each parsable by processColor', (scheme) => {
    for (const key of COLOR_KEYS) {
      expect(`${key}:${parsable(tokens.color[scheme][key])}`).toBe(`${key}:true`);
    }
  });

  it('the colour check itself rejects garbage', () => {
    expect(parsable('not-a-colour')).toBe(false);
    expect(parsable('hsl(222.2, 84%, 4.9%)')).toBe(true);
  });

  it('light and dark differ (two real schemes)', () => {
    expect(tokens.color.light.background).not.toBe(tokens.color.dark.background);
  });

  it('tenant overrides, if any, are parsable colours', () => {
    for (const [tenant, schemes] of Object.entries(tokens.tenants ?? {})) {
      for (const [scheme, colors] of Object.entries(schemes ?? {})) {
        for (const [key, value] of Object.entries(colors ?? {})) {
          expect(`${tenant}.${scheme}.${key}:${parsable(value)}`).toBe(`${tenant}.${scheme}.${key}:true`);
        }
      }
    }
  });

  it('radius, fontSize are finite numbers with every key', () => {
    for (const k of ['sm', 'md', 'lg', 'xl', '2xl', 'full', 'vcard', 'vcardSm'] as const) expect(Number.isFinite(tokens.radius[k])).toBe(true);
    for (const k of ['xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const) expect(Number.isFinite(tokens.fontSize[k])).toBe(true);
  });

  it('space is the 4 px scale', () => {
    expect(tokens.space(0)).toBe(0);
    expect(tokens.space(1)).toBe(4);
    expect(tokens.space(4)).toBe(16);
  });

  it('fontFamily has sans (string | undefined) and editorial', () => {
    expect(['string', 'undefined']).toContain(typeof tokens.fontFamily.sans);
    expect(typeof tokens.fontFamily.editorial).toBe('string');
  });

  it.each(['light', 'dark'] as const)('%s elevation: every ShadowStyle has all five fields', (scheme) => {
    for (const k of ['e1', 'e2', 'sm', 'md', 'lg'] as const) {
      expect(`${k}:${isShadow(tokens.elevation[scheme][k])}`).toBe(`${k}:true`);
    }
  });

  it('motion: 150 ms cross-fade (SR-22), finite sheet/dialog durations', () => {
    expect(tokens.motion.crossFadeMs).toBe(150);
    expect(Number.isFinite(tokens.motion.sheetMs)).toBe(true);
    expect(Number.isFinite(tokens.motion.dialogMs)).toBe(true);
  });
});
