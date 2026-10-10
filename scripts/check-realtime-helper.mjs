#!/usr/bin/env node
/**
 * VTID-05023 (Aurora cutover, part 7a): every realtime channel in the app goes
 * through src/integrations/supabase/realtime.ts (`realtimeChannel`,
 * `removeRealtimeChannel`, `removeAllRealtimeChannels`, `getRealtimeChannels`,
 * `setRealtimeAuth`), so that setting VITE_REALTIME_URL moves every channel to
 * the self-hosted Realtime server at once — no channel left on Supabase's.
 *
 * Fails when any file under src/ (except the helper and its tests) calls
 * `.channel(`, `.removeChannel(`, `.removeAllChannels(`, `.getChannels(` or
 * `.realtime.setAuth(` / `.realtime.` on a client directly, or constructs its
 * own `RealtimeClient`.
 *
 * Usage: node scripts/check-realtime-helper.mjs [srcDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.resolve(process.argv[2] ?? path.join(root, 'src'));
const helperDir = path.join(srcDir, 'integrations', 'supabase');
const ALLOWED = new Set([
  path.join(helperDir, 'realtime.ts'),
  path.join(helperDir, 'realtime.test.ts'),
  path.join(helperDir, 'realtime.call-sites.test.ts'),
]);
const EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.jsx']);
const isTest = (f) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f) || f.includes(`${path.sep}__tests__${path.sep}`);

const HINT = 'use the helpers in src/integrations/supabase/realtime.ts';
const RULES = [
  { re: /(^|[^\w])\.channel\s*\(/, why: `direct .channel( — ${HINT} (realtimeChannel)` },
  { re: /\.removeChannel\s*\(/, why: `direct .removeChannel( — ${HINT} (removeRealtimeChannel)` },
  { re: /\.removeAllChannels\s*\(/, why: `direct .removeAllChannels( — ${HINT} (removeAllRealtimeChannels)` },
  { re: /\.getChannels\s*\(/, why: `direct .getChannels( — ${HINT} (getRealtimeChannels)` },
  { re: /\bsupabase\s*\.\s*realtime\b/, why: `direct supabase.realtime — ${HINT} (setRealtimeAuth)` },
  { re: /\bnew\s+RealtimeClient\s*\(/, why: `own RealtimeClient — ${HINT}` },
];

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

if (!fs.existsSync(path.join(helperDir, 'realtime.ts'))) {
  console.error(`check-realtime-helper: helper missing: ${path.relative(root, path.join(helperDir, 'realtime.ts'))}`);
  process.exit(1);
}

const violations = [];
for (const file of walk(srcDir, [])) {
  // Tests mock the client (`channel: vi.fn()`); they never open a channel.
  if (ALLOWED.has(file) || isTest(file)) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '');
    for (const { re, why } of RULES) {
      if (re.test(code)) violations.push(`${path.relative(root, file)}:${i + 1}: ${why}\n    ${line.trim()}`);
    }
  });
}

if (violations.length) {
  console.error(`check-realtime-helper: ${violations.length} violation(s) (VTID-05023):`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('check-realtime-helper: OK — every realtime channel goes through src/integrations/supabase/realtime.ts (VTID-05023).');
