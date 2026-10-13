/** VTID-05183 — @vitana/tokens: generated from src/index.css + tailwind.config.ts. */
import { themeVars, color, resolved, cssVars, colors, runtimeVars, radius, screens, shadows, gradients } from '@vitana/tokens';
import { tenantBrand } from '@vitana/core/tenants';

describe('tokens', () => {
  it('dark has every light key', () => {
    const light = themeVars('light');
    const dark = themeVars('dark');
    for (const k of Object.keys(light)) expect(dark).toHaveProperty([k]);
    expect(Object.keys(light).length).toBeGreaterThan(100);
  });

  it('resolves HSL triplets to hex', () => {
    expect(cssVars.light['--primary']).toBe('222.2 47.4% 11.2%');
    expect(resolved.light['--primary']).toBe('#0f172a');
    expect(color('primary', 'light')).toBe('#0f172a');
    expect(() => color('--nope', 'light')).toThrow();
  });

  it('every colour class names a declared variable or a runtime variable', () => {
    const declared = new Set([...Object.keys(cssVars.light), ...runtimeVars]);
    for (const [cls, v] of Object.entries(colors)) expect(`${cls} → ${v}: ${declared.has(v)}`).toBe(`${cls} → ${v}: true`);
  });

  it('brand overlay and derived values', () => {
    expect(tenantBrand('unknown')).toEqual(tenantBrand('maxina'));
    const vars = themeVars('light', tenantBrand('alkalma'));
    expect(vars['--brand-accent']).toBe('#3B82F6');
    expect(themeVars('light')['--brand-accent']).toBe(cssVars.light['--brand-accent']);
    expect(radius.lg.px).toBe(8);
    expect(screens.md).toBe(1024);
    expect(shadows.vcard.light.opacity).toBeCloseTo(0.06);
    expect(gradients.maxinaTopbar.stops).toHaveLength(2);
  });
});
