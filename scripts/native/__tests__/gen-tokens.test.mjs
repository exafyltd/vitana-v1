// VTID-05183 — @vitana/tokens generator on fixture trees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build, run, hslToHex, parseHslTriplet, parseShadow, lengthToPx, colorToHex } from '../gen-tokens.mjs';
import { tree } from './fixture.mjs';

const CSS = `@tailwind base;
@layer base {
  :root {
    /* comment */
    --background: 0 0% 100%;
    --primary: 222.2 47.4% 11.2%;
    --radius: 0.5rem;
    --sp-elevation-1: 0 2px 6px hsl(222 47% 11% / 0.06);
    --only-light: 10px;
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --sp-elevation-1: 0 2px 6px hsl(0 0% 0% / 0.35);
  }
}
@layer base { * { border-color: hsl(var(--primary)); } }
.app-hack { --appilix-x: 4px; }
.maxina-topbar {
  background: linear-gradient(180deg, hsl(201 90% 78%) 0%, hsl(201 75% 70%) 100%);
  color: rgba(255, 255, 255, 0.95);
}
`;

const TW = `import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
const CJK = ['PingFang SC'];
export default {
  theme: {
    screens: { md: '1024px' },
    extend: {
      fontFamily: { editorial: ['Cormorant', ...CJK, 'serif'], sans: [...defaultTheme.fontFamily.sans, ...CJK] },
      colors: {
        background: 'hsl(var(--background))',
        primary: { DEFAULT: 'hsl(var(--primary))' },
        status: { success: { DEFAULT: 'hsl(var(--primary))', subtle: 'hsl(var(--background))' } },
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)' },
      boxShadow: { vcard: 'var(--sp-elevation-1)' },
      keyframes: { 'accordion-down': { to: { height: 'var(--radix-accordion-content-height)' } } },
    },
  },
} satisfies Config;
`;

const CONFIG = {
  css: 'src/index.css',
  tailwind: 'tailwind.config.ts',
  out: { ts: 'packages/tokens/src/tokens.generated.ts', theme: 'packages/tokens/tailwind-theme.generated.json' },
  gradients: { maxinaTopbar: '.maxina-topbar' },
  excluded: { '--appilix-x': 'web-view hack' },
  runtimeVars: { '--radix-accordion-content-height': 'set by Radix' },
};

const fixture = (over = {}) => tree({ 'src/index.css': CSS, 'tailwind.config.ts': TW, 'packages/tokens/tokens.config.json': CONFIG, ...over });

const dataOf = (ts, name) => {
  const m = new RegExp(`export const ${name} = ([\\s\\S]*?) as const;`).exec(ts);
  return JSON.parse(m[1]);
};

test('a fixture css + tailwind config give the expected output', () => {
  const fx = fixture();
  try {
    const { files } = build(fx.root);
    const ts = files['packages/tokens/src/tokens.generated.ts'];
    assert.deepEqual(dataOf(ts, 'colors'), { background: '--background', primary: '--primary', 'status-success': '--primary', 'status-success-subtle': '--background' });
    assert.equal(dataOf(ts, 'resolved').light['--primary'], '#0f172a');
    assert.equal(dataOf(ts, 'resolvedHsl').light['--primary'], 'hsl(222.2 47.4% 11.2%)');
    assert.deepEqual(dataOf(ts, 'radius').md, { css: 'calc(var(--radius) - 2px)', value: 'calc(0.5rem - 2px)', px: 6 });
    assert.deepEqual(dataOf(ts, 'screens'), { md: 1024 });
    assert.deepEqual(dataOf(ts, 'fonts'), { editorial: { families: ['Cormorant', 'PingFang SC', 'serif'] }, sans: { extendsTailwindDefault: 'fontFamily.sans', families: ['PingFang SC'] } });
    const g = dataOf(ts, 'gradients').maxinaTopbar;
    assert.equal(g.angle, 180);
    assert.deepEqual(g.stops.map((s) => s.at), [0, 1]);
    assert.equal(g.foreground.color, '#fffffff2');
    assert.deepEqual(dataOf(ts, 'runtimeVars'), ['--radix-accordion-content-height']);
    const theme = JSON.parse(files['packages/tokens/tailwind-theme.generated.json']);
    assert.equal(theme.colors.primary.DEFAULT, 'hsl(var(--primary))');
    assert.equal(theme.borderRadius.lg, 'var(--radius)');
  } finally { fx.cleanup(); }
});

test('dark = light overlaid with .dark; every light key exists in dark', () => {
  const fx = fixture();
  try {
    const vars = dataOf(build(fx.root).files['packages/tokens/src/tokens.generated.ts'], 'cssVars');
    assert.equal(vars.dark['--background'], '222.2 84% 4.9%');
    assert.equal(vars.dark['--only-light'], '10px');
    assert.deepEqual(Object.keys(vars.dark).sort(), Object.keys(vars.light).sort());
  } finally { fx.cleanup(); }
});

test('an undeclared custom property fails with its name', () => {
  const fx = fixture({ 'src/index.css': `${CSS}\n.x { --new-thing: 1px; }\n` });
  try {
    assert.throws(() => build(fx.root), /--new-thing \(src\/index\.css:\d+\)/);
  } finally { fx.cleanup(); }
});

test('a dark-only variable and an undeclared Tailwind variable fail', () => {
  const dark = fixture({ 'src/index.css': CSS.replace('--sp-elevation-1: 0 2px 6px hsl(0 0% 0% / 0.35);', '--sp-elevation-1: 0 2px 6px hsl(0 0% 0% / 0.35);\n    --dark-only: 1px;') });
  try { assert.throws(() => build(dark.root), /--dark-only is declared in \.dark but not in :root/); } finally { dark.cleanup(); }
  const tw = fixture({ 'tailwind.config.ts': TW.replace("ring: 'x'", '').replace("background: 'hsl(var(--background))',", "background: 'hsl(var(--background))', ring: 'hsl(var(--ring))',") });
  try { assert.throws(() => build(tw.root), /references undeclared variables: --ring/); } finally { tw.cleanup(); }
});

test('HSL → hex rounding, colour parsing, lengths and shadow parsing', () => {
  assert.equal(hslToHex(parseHslTriplet('222.2 47.4% 11.2%')), '#0f172a');
  assert.equal(hslToHex(parseHslTriplet('0 0% 100%')), '#ffffff');
  assert.equal(hslToHex(parseHslTriplet('210 40% 98%')), '#f8fafc');
  assert.equal(hslToHex(parseHslTriplet('0 72% 51%')), '#dc2828'); // 220.0 / 40.09 / 40.09 → round half up
  assert.equal(hslToHex({ h: 0, s: 0, l: 0, a: 0.5 }), '#00000080');
  assert.equal(colorToHex('#FF004F'), '#ff004f');
  assert.equal(colorToHex('hsl(201 90% 78%)'), colorToHex('201 90% 78%'));
  assert.equal(lengthToPx('1.125rem'), 18);
  assert.equal(lengthToPx('calc(760px + 28px + 340px)'), 1128);
  assert.equal(lengthToPx('auto'), null);
  assert.deepEqual(parseShadow('0 6px 20px hsl(222 47% 11% / 0.10)'), { color: '#0f1729', opacity: 0.1, offsetX: 0, offsetY: 6, blur: 20 });
  assert.throws(() => parseShadow('inset 1px red'), /cannot parse box-shadow/);
});

test('--check detects a one-character drift; output is byte-identical across runs', () => {
  const fx = fixture();
  try {
    assert.deepEqual(run({ root: fx.root }).stale.length, 2);
    const first = readFileSync(join(fx.root, CONFIG.out.ts), 'utf8');
    assert.deepEqual(run({ root: fx.root, check: true }).stale, []);
    assert.equal(build(fx.root).files[CONFIG.out.ts], first);
    writeFileSync(join(fx.root, 'src/index.css'), CSS.replace('--radius: 0.5rem', '--radius: 0.6rem'));
    assert.deepEqual(run({ root: fx.root, check: true }).stale, [CONFIG.out.ts]);
    assert.equal(readFileSync(join(fx.root, CONFIG.out.ts), 'utf8'), first, '--check never writes');
  } finally { fx.cleanup(); }
});
