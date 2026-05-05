#!/usr/bin/env node
// One-shot script: shard src/i18n/{en,de,ar}.json into per-namespace files
// under src/i18n/{en,de,ar}/<namespace>.json. Idempotent.
//
// After Wave 1 lands and the monolithic JSON files are deleted, this script
// can be re-run to re-shard if upstream ever recomposes them.

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = join(__dirname, '..', 'src', 'i18n');

const LOCALES = ['en', 'de', 'ar'];
const SOURCE_FILES = {
  en: 'en.json',
  de: 'de.json',
  ar: 'ar.json',
};

let totalShards = 0;

for (const locale of LOCALES) {
  const sourcePath = join(I18N_DIR, SOURCE_FILES[locale]);
  if (!existsSync(sourcePath)) {
    console.warn(`[split-i18n] Skipping ${locale}: ${sourcePath} not found`);
    continue;
  }

  const catalog = JSON.parse(readFileSync(sourcePath, 'utf8'));
  const targetDir = join(I18N_DIR, locale);

  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  mkdirSync(targetDir, { recursive: true });

  const namespaces = Object.keys(catalog).sort();
  for (const ns of namespaces) {
    const shardPath = join(targetDir, `${ns}.json`);
    const shard = { [ns]: catalog[ns] };
    writeFileSync(shardPath, JSON.stringify(shard, null, 2) + '\n', 'utf8');
    totalShards++;
  }

  console.log(`[split-i18n] ${locale}: ${namespaces.length} shards written to src/i18n/${locale}/`);
}

console.log(`[split-i18n] Done. ${totalShards} shard files total.`);
