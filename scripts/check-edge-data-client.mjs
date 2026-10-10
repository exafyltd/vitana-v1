#!/usr/bin/env node
/**
 * VTID-05023 (Aurora cutover, part 5): every edge function must build its
 * supabase-js client through supabase/functions/_shared/data-client.ts
 * (`createDataClient(createClient, url, key, options)`), so its database
 * traffic follows DATA_API_URL and fails loud after the cutover.
 *
 * Fails when any file under supabase/functions (except the helper itself)
 * calls `createClient(` directly, builds a raw `/rest/v1` URL, or imports a
 * Postgres driver.
 *
 * Usage: node scripts/check-edge-data-client.mjs [functionsDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const functionsDir = path.resolve(process.argv[2] ?? path.join(root, 'supabase', 'functions'));
const helper = path.join(functionsDir, '_shared', 'data-client.ts');
const helperTest = path.join(functionsDir, '_shared', 'data-client.test.ts');
const EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.jsx']);

const RULES = [
  { re: /\bcreateClient\s*\(/, why: 'direct createClient( call — use createDataClient(createClient, ...) from ../_shared/data-client.ts' },
  { re: /\/rest\/v1\b/, why: 'raw /rest/v1 URL — go through the supabase-js client from createDataClient' },
  { re: /deno\.land\/x\/postgres|npm:pg\b|npm:postgres\b|esm\.sh\/(pg|postgres)\b|jsr:@db\/postgres/, why: 'direct Postgres driver — database access must go through createDataClient' },
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

if (!fs.existsSync(helper)) {
  console.error(`check-edge-data-client: helper missing: ${path.relative(root, helper)}`);
  process.exit(1);
}

const violations = [];
for (const file of walk(functionsDir, [])) {
  if (file === helper || file === helperTest) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const { re, why } of RULES) {
      if (re.test(line)) violations.push(`${path.relative(root, file)}:${i + 1}: ${why}\n    ${line.trim()}`);
    }
  });
}

if (violations.length) {
  console.error(`check-edge-data-client: ${violations.length} violation(s) (VTID-05023):`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('check-edge-data-client: OK — every edge function uses createDataClient (VTID-05023).');
