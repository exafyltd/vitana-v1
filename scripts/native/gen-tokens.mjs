#!/usr/bin/env node
/**
 * VTID-05183 — @vitana/tokens generator (Native app Wave 1 N1, plan changes 9–11).
 *
 * The native app's design tokens are DERIVED from the web's own sources and
 * never edited by hand, so web and native cannot drift:
 *
 *   src/index.css       the first `@layer base` `:root` (light) and `.dark` rules
 *   tailwind.config.ts  theme.extend colors / borderRadius / maxWidth / spacing /
 *                       boxShadow / aspectRatio / fontFamily, theme.screens
 *   gradients           class rules named in packages/tokens/tokens.config.json
 *
 * Every custom property declared ANYWHERE in index.css is either a token or
 * listed in tokens.config.json `excluded` with a reason; anything else fails,
 * so a new token can never be missed silently. Tenant brand values are not
 * parsed here — they come from @vitana/core/tenants (gen-core-extract.mjs).
 *
 *   node scripts/native/gen-tokens.mjs            write the outputs
 *   node scripts/native/gen-tokens.mjs --check    fail on any difference (NATIVE-CI)
 *   [--root <repo>]                               fixture trees (tests)
 *
 * Needs the root-lock `postcss` and `typescript` (NATIVE-CI installs both into
 * $RUNNER_TEMP/ts; locally the root node_modules has them).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '../..');
export const CONFIG_PATH = 'packages/tokens/tokens.config.json';
const CMD = 'node scripts/native/gen-tokens.mjs';

// ---------------------------------------------------------------- helpers

/** JSON with sorted object keys (arrays keep their order): deterministic output. */
export function stableStringify(value, indent = 2) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])]));
    return v;
  };
  return JSON.stringify(sort(value), null, indent);
}

const HSL_TRIPLET = /^(-?[\d.]+)(?:deg)?\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+%?))?$/;

/** `222.2 47.4% 11.2%` → { h, s, l, a } or null. */
export function parseHslTriplet(value) {
  const m = HSL_TRIPLET.exec(String(value).trim());
  if (!m) return null;
  let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]);
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]), a };
}

const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/** HSL (degrees, percent, percent, alpha 0–1) → `#rrggbb` (or `#rrggbbaa` below full opacity). Channels round half up. */
export function hslToHex({ h, s, l, a = 1 }) {
  const S = s / 100;
  const L = l / 100;
  const k = (n) => (n + (((h % 360) + 360) % 360) / 30) % 12;
  const f = (n) => L - S * Math.min(L, 1 - L) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const rgb = [f(0), f(8), f(4)].map((c) => hex2(c * 255)).join('');
  return a >= 1 ? `#${rgb}` : `#${rgb}${hex2(a * 255)}`;
}

/** Any CSS colour this generator meets (HSL triplet, hsl(), #hex, rgba()) → `#rrggbb[aa]` or null. */
export function colorToHex(value) {
  const v = String(value).trim();
  const trip = parseHslTriplet(v);
  if (trip) return hslToHex(trip);
  let m = /^hsla?\((.*)\)$/i.exec(v);
  if (m) {
    const commas = m[1].split(',').map((x) => x.trim());
    const text = commas.length === 4 ? `${commas.slice(0, 3).join(' ')} / ${commas[3]}` : commas.join(' ');
    const inner = parseHslTriplet(text);
    return inner ? hslToHex(inner) : null;
  }
  m = /^#([0-9a-f]{3,8})$/i.exec(v);
  if (m) {
    const x = m[1].toLowerCase();
    if (x.length === 3 || x.length === 4) return `#${[...x].map((c) => c + c).join('')}`.replace(/^(#[0-9a-f]{6})ff$/, '$1');
    return `#${x}`.replace(/^(#[0-9a-f]{6})ff$/, '$1');
  }
  m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i.exec(v);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]);
    const rgb = `#${hex2(+m[1])}${hex2(+m[2])}${hex2(+m[3])}`;
    return a >= 1 ? rgb : `${rgb}${hex2(a * 255)}`;
  }
  return null;
}

/** Substitutes `var(--x)` from `vars` (one level is enough for these sources; repeats until stable). */
export function substituteVars(value, vars) {
  let out = String(value);
  for (let i = 0; i < 5 && /var\(--/.test(out); i++) {
    out = out.replace(/var\((--[\w-]+)\)/g, (all, name) => (name in vars ? vars[name] : all));
  }
  return out;
}

/** `0.5rem` / `28px` / `calc(0.5rem - 2px)` / `calc(760px + 28px + 340px)` → px number, or null. */
export function lengthToPx(value) {
  const v = String(value).trim();
  const unit = (t) => {
    const m = /^(-?[\d.]+)(px|rem)?$/.exec(t.trim());
    if (!m) return null;
    return m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
  };
  const calc = /^calc\((.*)\)$/.exec(v);
  if (!calc) return unit(v);
  const parts = calc[1].split(/\s+([+-])\s+/);
  let total = unit(parts[0]);
  for (let i = 1; i < parts.length && total !== null; i += 2) {
    const n = unit(parts[i + 1]);
    if (n === null) return null;
    total = parts[i] === '+' ? total + n : total - n;
  }
  return total === null ? null : Math.round(total * 1000) / 1000;
}

/** `0 2px 6px hsl(222 47% 11% / 0.06)` → { color, opacity, offsetX, offsetY, blur }. */
export function parseShadow(value) {
  const v = String(value).trim();
  const m = /^(-?[\d.]+(?:px)?)\s+(-?[\d.]+(?:px)?)\s+([\d.]+(?:px)?)(?:\s+(-?[\d.]+(?:px)?))?\s+(hsla?\(.*\)|rgba?\(.*\)|#[0-9a-f]+)$/i.exec(v);
  if (!m) throw new Error(`gen-tokens: cannot parse box-shadow ${JSON.stringify(v)}`);
  const px = (t) => Number(String(t).replace(/px$/, ''));
  const color = m[5];
  let opacity = 1;
  let solid = color;
  const hsl = /^hsla?\((.*)\)$/i.exec(color);
  if (hsl) {
    const t = parseHslTriplet(hsl[1]);
    if (!t) throw new Error(`gen-tokens: cannot parse shadow colour ${color}`);
    opacity = t.a;
    solid = hslToHex({ ...t, a: 1 });
  } else {
    const hex = colorToHex(color);
    if (!hex) throw new Error(`gen-tokens: cannot parse shadow colour ${color}`);
    solid = hex.slice(0, 7);
    opacity = hex.length === 9 ? Math.round((parseInt(hex.slice(7), 16) / 255) * 100) / 100 : 1;
  }
  return { color: solid, opacity, offsetX: px(m[1]), offsetY: px(m[2]), blur: px(m[3]), ...(m[4] ? { spread: px(m[4]) } : {}) };
}

// ---------------------------------------------------------------- CSS

/** Token blocks + every custom-property declaration in the file. */
export function readCss(text, file = 'src/index.css') {
  const root = postcss.parse(text, { from: file });
  const layer = root.nodes.find((n) => n.type === 'atrule' && n.name === 'layer' && n.params.trim() === 'base');
  if (!layer) throw new Error(`gen-tokens: no \`@layer base\` in ${file}`);
  const ruleOf = (sel) => layer.nodes.find((n) => n.type === 'rule' && n.selector.trim() === sel);
  const rootRule = ruleOf(':root');
  const darkRule = ruleOf('.dark');
  if (!rootRule || !darkRule) throw new Error(`gen-tokens: the first \`@layer base\` of ${file} needs a \`:root\` and a \`.dark\` rule`);
  const declsOf = (rule) => {
    const out = {};
    rule.each((n) => {
      if (n.type === 'decl' && n.prop.startsWith('--')) out[n.prop] = n.value.trim();
    });
    return out;
  };
  const light = declsOf(rootRule);
  const darkOnly = declsOf(darkRule);
  const tokenDecls = new Set();
  // (each() stops when the callback returns false, so the bodies return nothing.)
  rootRule.each((n) => { if (n.type === 'decl') tokenDecls.add(n); });
  darkRule.each((n) => { if (n.type === 'decl') tokenDecls.add(n); });
  const others = [];
  root.walkDecls(/^--/, (d) => {
    if (!tokenDecls.has(d)) others.push({ name: d.prop, line: d.source?.start?.line ?? 0 });
  });
  return { root, light, darkOnly, others };
}

export function readGradient(root, selector) {
  let found = null;
  root.walkRules((r) => {
    if (!found && r.selector.trim() === selector) found = r;
    return undefined;
  });
  if (!found) throw new Error(`gen-tokens: gradient rule ${selector} not found`);
  const decl = (prop) => found.nodes.find((n) => n.type === 'decl' && n.prop === prop)?.value.trim();
  const background = decl('background') ?? decl('background-image');
  const m = /^linear-gradient\((.*)\)$/.exec(background ?? '');
  if (!m) throw new Error(`gen-tokens: ${selector} has no linear-gradient background`);
  // Split top-level commas.
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of m[1]) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
  }
  parts.push(cur.trim());
  let angle = 180;
  if (/^-?[\d.]+deg$/.test(parts[0])) angle = Number(parts.shift().slice(0, -3));
  const stops = parts.map((p) => {
    const s = /^(.*\))\s+([\d.]+)%$/.exec(p) || /^(\S+)\s+([\d.]+)%$/.exec(p);
    const color = s ? s[1] : p;
    return { color: colorToHex(color), css: color, at: s ? Number(s[2]) / 100 : null };
  });
  const out = { css: background, angle, stops };
  const fg = decl('color');
  if (fg) out.foreground = { css: fg, color: colorToHex(fg) };
  return out;
}

// ---------------------------------------------------------------- tailwind.config.ts

const TAILWIND_DEFAULT = (path) => `<tailwind-default:${path}>`;

/** Static evaluation of the literal subset tailwind.config.ts uses. */
function evaluate(node, consts, path) {
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return evaluate(node.expression, consts, path);
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isObjectLiteralExpression(node)) {
    const out = {};
    for (const p of node.properties) {
      if (!ts.isPropertyAssignment(p)) throw new Error(`gen-tokens: unsupported property at ${path} (${ts.SyntaxKind[p.kind]})`);
      const key = ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name) || ts.isNumericLiteral(p.name) ? p.name.text : null;
      if (key === null) throw new Error(`gen-tokens: computed key at ${path}`);
      out[key] = evaluate(p.initializer, consts, `${path}.${key}`);
    }
    return out;
  }
  if (ts.isArrayLiteralExpression(node)) {
    const out = [];
    for (const e of node.elements) {
      if (ts.isSpreadElement(e)) {
        if (ts.isIdentifier(e.expression) && consts.has(e.expression.text)) out.push(...evaluate(consts.get(e.expression.text), consts, path));
        else if (ts.isPropertyAccessExpression(e.expression) && /^defaultTheme\./.test(e.expression.getText())) out.push(TAILWIND_DEFAULT(e.expression.getText().replace(/^defaultTheme\./, '')));
        else throw new Error(`gen-tokens: unsupported spread at ${path}: ${e.getText()}`);
      } else out.push(evaluate(e, consts, path));
    }
    return out;
  }
  if (ts.isIdentifier(node) && consts.has(node.text)) return evaluate(consts.get(node.text), consts, path);
  throw new Error(`gen-tokens: unsupported expression at ${path}: ${node.getText()}`);
}

export function readTailwind(text, file = 'tailwind.config.ts') {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const consts = new Map();
  let config = null;
  for (const st of sf.statements) {
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer) consts.set(d.name.text, d.initializer);
    if (ts.isExportAssignment(st)) config = st.expression;
  }
  if (!config) throw new Error(`gen-tokens: ${file} has no default export`);
  while (ts.isSatisfiesExpression(config) || ts.isAsExpression(config) || ts.isParenthesizedExpression(config)) config = config.expression;
  const prop = (obj, key) => {
    if (!obj || !ts.isObjectLiteralExpression(obj)) return undefined;
    const p = obj.properties.find((x) => ts.isPropertyAssignment(x) && (ts.isIdentifier(x.name) || ts.isStringLiteralLike(x.name)) && x.name.text === key);
    return p?.initializer;
  };
  const theme = prop(config, 'theme');
  const extend = prop(theme, 'extend');
  const take = (obj, key, path) => {
    const n = prop(obj, key);
    return n ? evaluate(n, consts, path) : {};
  };
  return {
    screens: take(theme, 'screens', 'theme.screens'),
    colors: take(extend, 'colors', 'theme.extend.colors'),
    borderRadius: take(extend, 'borderRadius', 'theme.extend.borderRadius'),
    maxWidth: take(extend, 'maxWidth', 'theme.extend.maxWidth'),
    spacing: take(extend, 'spacing', 'theme.extend.spacing'),
    boxShadow: take(extend, 'boxShadow', 'theme.extend.boxShadow'),
    aspectRatio: take(extend, 'aspectRatio', 'theme.extend.aspectRatio'),
    fontFamily: take(extend, 'fontFamily', 'theme.extend.fontFamily'),
  };
}

/** Tailwind colour tree → { 'status-success': '--status-success', … } (DEFAULT drops out of the class name). */
export function flattenColors(tree, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(tree)) {
    const name = k === 'DEFAULT' ? prefix : prefix ? `${prefix}-${k}` : k;
    if (typeof v === 'string') {
      const m = /^hsl\(var\((--[\w-]+)\)\)$/.exec(v);
      if (!m) throw new Error(`gen-tokens: colour ${name || k} is not hsl(var(--x)): ${v}`);
      out[name] = m[1];
    } else Object.assign(out, flattenColors(v, name));
  }
  return out;
}

const varsIn = (value) => [...String(value).matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]);

// ---------------------------------------------------------------- generate

export function build(root = REPO) {
  const cfg = JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf8'));
  const css = readCss(readFileSync(join(root, cfg.css), 'utf8'), cfg.css);
  const tw = readTailwind(readFileSync(join(root, cfg.tailwind), 'utf8'), cfg.tailwind);
  const excluded = cfg.excluded ?? {};
  const runtimeVars = cfg.runtimeVars ?? {};

  for (const [name, reason] of Object.entries({ ...excluded, ...runtimeVars })) {
    if (!reason || typeof reason !== 'string') throw new Error(`gen-tokens: ${name} in ${CONFIG_PATH} has no reason`);
  }
  const undeclared = css.others.filter((o) => !(o.name in excluded));
  if (undeclared.length) {
    const list = undeclared.map((o) => `${o.name} (${cfg.css}:${o.line})`).join(', ');
    throw new Error(`gen-tokens: custom properties outside the token blocks that are neither tokens nor excluded: ${list}. Add each to ${CONFIG_PATH} "excluded" with a reason, or move it into the @layer base :root/.dark block.`);
  }
  for (const name of Object.keys(css.darkOnly)) {
    if (!(name in css.light)) throw new Error(`gen-tokens: ${name} is declared in .dark but not in :root`);
  }

  const light = { ...css.light };
  const dark = { ...css.light, ...css.darkOnly };
  const cssVars = { light, dark };

  // Every var() Tailwind reads is a token or a declared runtime variable.
  const twVars = new Set();
  const walk = (v) => (typeof v === 'string' ? varsIn(v).forEach((x) => twVars.add(x)) : Array.isArray(v) ? v.forEach(walk) : v && typeof v === 'object' ? Object.values(v).forEach(walk) : null);
  walk(tw);
  for (const n of varsIn(readFileSync(join(root, cfg.tailwind), 'utf8'))) twVars.add(n);
  const missing = [...twVars].filter((n) => !(n in light) && !(n in runtimeVars)).sort();
  if (missing.length) throw new Error(`gen-tokens: ${cfg.tailwind} references undeclared variables: ${missing.join(', ')} (declare them in ${cfg.css} or list them in ${CONFIG_PATH} "runtimeVars")`);

  const colors = flattenColors(tw.colors);
  const resolved = { light: {}, dark: {} };
  const resolvedHsl = { light: {}, dark: {} };
  for (const scheme of ['light', 'dark']) {
    for (const [name, value] of Object.entries(cssVars[scheme])) {
      const trip = parseHslTriplet(value);
      const hex = colorToHex(value);
      if (hex) resolved[scheme][name] = hex;
      if (trip) resolvedHsl[scheme][name] = `hsl(${value})`;
    }
  }
  const lengths = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => {
    const value = substituteVars(v, light);
    return [k, { css: v, value, px: lengthToPx(value) }];
  }));
  const shadows = Object.fromEntries(Object.entries(tw.boxShadow).map(([k, v]) => [k, {
    css: v,
    light: { css: substituteVars(v, light), ...parseShadow(substituteVars(v, light)) },
    dark: { css: substituteVars(v, dark), ...parseShadow(substituteVars(v, dark)) },
  }]));
  const fonts = {};
  for (const [k, list] of Object.entries(tw.fontFamily)) {
    const def = list.find((x) => typeof x === 'string' && x.startsWith('<tailwind-default:'));
    fonts[k] = def
      ? { families: list.filter((x) => x !== def), extendsTailwindDefault: def.slice('<tailwind-default:'.length, -1) }
      : { families: list };
  }
  const screens = Object.fromEntries(Object.entries(tw.screens).map(([k, v]) => [k, lengthToPx(v)]));
  const cssText = readFileSync(join(root, cfg.css), 'utf8');
  const gradients = Object.fromEntries(Object.entries(cfg.gradients ?? {}).map(([k, sel]) => [k, readGradient(postcss.parse(cssText), sel)]));
  const aspectRatio = Object.fromEntries(Object.entries(tw.aspectRatio).map(([k, v]) => {
    const m = /^([\d.]+)\s*\/\s*([\d.]+)$/.exec(v);
    return [k, m ? Number(m[1]) / Number(m[2]) : null];
  }));

  const data = {
    cssVars,
    colors,
    resolved,
    resolvedHsl,
    radius: lengths(tw.borderRadius),
    spacing: lengths(tw.spacing),
    maxWidth: lengths(tw.maxWidth),
    shadows,
    fonts,
    screens,
    gradients,
    aspectRatio,
    runtimeVars: Object.keys(runtimeVars).sort(),
  };

  const header = [
    `// AUTO-GENERATED by ${CMD} (VTID-05183). Do not edit.`,
    `// Sources: ${cfg.css} (first @layer base :root / .dark), ${cfg.tailwind} (theme), ${CONFIG_PATH}.`,
    `// After changing a source run \`${CMD}\`; NATIVE-CI fails on drift (\`--check\`).`,
    '/* eslint-disable */',
    '',
  ];
  const body = [];
  const docs = {
    cssVars: 'Raw custom-property values per scheme (`dark` = light overlaid with `.dark`).',
    colors: 'Tailwind colour class vocabulary → the variable it reads (`bg-status-success` → `--status-success`).',
    resolved: 'Every colour variable as `#rrggbb` (`#rrggbbaa` below full opacity), per scheme.',
    resolvedHsl: 'Every HSL-triplet variable as an `hsl(…)` string, per scheme.',
    radius: 'theme.extend.borderRadius, with variables substituted (light) and the px value.',
    spacing: 'theme.extend.spacing, with variables substituted (light) and the px value.',
    maxWidth: 'theme.extend.maxWidth, with variables substituted (light) and the px value.',
    shadows: 'theme.extend.boxShadow: the raw CSS and a parsed shadow per scheme.',
    fonts: 'theme.extend.fontFamily (`extendsTailwindDefault`: the list is appended to Tailwind\'s default stack).',
    screens: 'theme.screens in px (`md` 1024 = the useIsMobile breakpoint).',
    gradients: `Gradient class rules named in ${CONFIG_PATH}.`,
    aspectRatio: 'theme.extend.aspectRatio as a number (width / height).',
    runtimeVars: 'Variables Tailwind reads that are set at runtime, not tokens.',
  };
  for (const [k, v] of Object.entries(data)) {
    body.push(`/** ${docs[k]} */`);
    body.push(`export const ${k} = ${stableStringify(v)} as const;`, '');
  }
  body.push('export type Scheme = keyof typeof cssVars;');
  body.push('export type CssVarName = keyof typeof cssVars.light;');
  body.push('export type ColorName = keyof typeof colors;');
  body.push('');
  const tsText = [...header, ...body].join('\n');

  const theme = {
    _generated: `AUTO-GENERATED by ${CMD} (VTID-05183) from ${cfg.tailwind}. Do not edit.`,
    colors: tw.colors,
    borderRadius: tw.borderRadius,
    spacing: tw.spacing,
  };
  return {
    files: {
      [cfg.out.ts]: tsText,
      [cfg.out.theme]: `${stableStringify(theme)}\n`,
    },
    stats: { light: Object.keys(light).length, dark: Object.keys(css.darkOnly).length, colors: Object.keys(colors).length, excluded: Object.keys(excluded).length },
  };
}

/** Writes (or with check=true compares) the outputs. Returns the list of stale files. */
export function run({ root = REPO, check = false } = {}) {
  const { files, stats } = build(root);
  const stale = [];
  for (const [rel, text] of Object.entries(files)) {
    const full = join(root, rel);
    const before = existsSync(full) ? readFileSync(full, 'utf8') : null;
    if (before === text) continue;
    stale.push(rel);
    if (!check) {
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, text);
    }
  }
  return { stale, stats };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--root');
  const root = i >= 0 ? resolve(args[i + 1]) : REPO;
  const check = args.includes('--check');
  try {
    const { stale, stats } = run({ root, check });
    const s = `${stats.light} light / ${stats.dark} dark overrides, ${stats.colors} colour classes, ${stats.excluded} excluded`;
    if (check && stale.length) {
      console.error(`gen-tokens: out of date: ${stale.join(', ')}\nRun \`${CMD}\` and commit the result.`);
      process.exit(1);
    }
    console.log(`gen-tokens: ${s}${check ? ' — up to date' : stale.length ? ` → wrote ${stale.join(', ')}` : ' (unchanged)'}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
