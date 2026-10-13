#!/usr/bin/env node
/**
 * VTID-05107 — list every `design-allow-next-line: <reason>` escape hatch in
 * src/ so exceptions to the Spotlight Design Contract stay visible.
 *   npm run design:allowances           # markdown table to stdout
 * A bare allow without a reason is reported by ESLint itself (design/* rules).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RX = /design-allow-next-line(?::\s*(.*?))?\s*(\*\/\s*\}?)?$/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) yield p;
  }
}

export function findAllowances(root = 'src') {
  const out = [];
  for (const file of walk(root)) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      const m = RX.exec(line.trim());
      if (m && /\/\/|\/\*/.test(line)) out.push({ file, line: i + 1, reason: (m[1] || '').trim() });
    });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const list = findAllowances();
  console.log(`# Spotlight design allowances (${list.length})\n`);
  if (!list.length) process.exit(0);
  console.log('| File | Line | Reason |\n|---|---|---|');
  for (const a of list) console.log(`| \`${a.file}\` | ${a.line} | ${a.reason || '**missing reason**'} |`);
}
