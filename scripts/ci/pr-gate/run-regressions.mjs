#!/usr/bin/env node
// VTID-04948 — run every scripts/*-regression.mjs (plan B4). Before this, no
// workflow ran them and 3 of 10 had silently rotted (2 tested deleted code).
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { summary } from './lib.mjs';

const scripts = readdirSync('scripts').filter((f) => f.endsWith('-regression.mjs')).sort();
const failed = [];
for (const s of scripts) {
  const r = spawnSync('node', [`scripts/${s}`], { encoding: 'utf8', timeout: 5 * 60_000 });
  const ok = r.status === 0;
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${s}\n`);
  if (!ok) {
    failed.push(s);
    process.stdout.write(`${r.stdout}${r.stderr}`.split('\n').slice(-25).join('\n') + '\n');
  }
}
summary(failed.length
  ? `❌ **regression scripts** — ${failed.length}/${scripts.length} failed: ${failed.map((f) => `\`${f}\``).join(', ')}`
  : `✅ **regression scripts** — ${scripts.length}/${scripts.length} passed`);
process.exit(failed.length ? 1 : 0);
