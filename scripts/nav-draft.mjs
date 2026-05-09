#!/usr/bin/env node
/**
 * VTID-02783: nav:draft — LLM-assisted ScreenManifestEntry drafter.
 *
 * Usage:
 *   npm run nav:draft -- --path /comm/new-screen [--component NewScreenPage]
 *
 * The script:
 *   1. Reads vitana-v1/src/navigation/screens.manifest.ts to gather the
 *      existing entries as a few-shot.
 *   2. Reads the React component file at --component (if given) for context.
 *   3. Calls Gemini Flash with a strict JSON schema for ScreenManifestEntry.
 *   4. Prints the draft to stdout for the developer to paste into the
 *      manifest. The developer edits + commits — the LLM is an assistant,
 *      not the author of record.
 *
 * Requires:
 *   - $GEMINI_API_KEY in env
 *
 * Per CLAUDE.md "Never hallucinate data": the developer MUST review the
 * draft before committing. The LLM may invent aliases, mis-pick categories,
 * or generate unidiomatic German. Always pass the draft through human eyes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const MANIFEST = resolve(REPO_ROOT, 'src/navigation/screens.manifest.ts');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { path: null, component: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path') out.path = args[++i];
    else if (args[i] === '--component') out.component = args[++i];
  }
  if (!out.path) {
    console.error('Usage: npm run nav:draft -- --path /comm/X [--component XPage]');
    process.exit(2);
  }
  return out;
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set — falling back to a stub draft');
    return null;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) {
    console.error(`Gemini call failed (${res.status}): ${await res.text()}`);
    return null;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ?? null;
}

function gatherFewShot(category) {
  const raw = readFileSync(MANIFEST, 'utf8');
  // Cheap regex extraction — pull each top-level entry block.
  const entries = [];
  const re = /\{\s*screen_id:\s*'[^']+'[\s\S]+?\n\s{2}\},/g;
  for (const m of raw.matchAll(re)) {
    if (entries.length >= 5) break;
    if (category && !m[0].includes(`category: '${category}'`)) continue;
    entries.push(m[0]);
  }
  return entries;
}

function inferCategoryFromPath(path) {
  if (path.startsWith('/comm/') || path.startsWith('/community/')) return 'community';
  if (path.startsWith('/health')) return 'health';
  if (path.startsWith('/discover')) return 'discover';
  if (path.startsWith('/wallet')) return 'wallet';
  if (path.startsWith('/business')) return 'business';
  if (path.startsWith('/memory') || path.startsWith('/diary')) return 'memory';
  if (path.startsWith('/inbox') || path.startsWith('/messages') || path.startsWith('/reminders')) return 'inbox';
  if (path.startsWith('/ai') || path.startsWith('/assistant')) return 'ai';
  if (path.startsWith('/settings') || path === '/profile' || path.startsWith('/me/')) return 'settings';
  if (path === '/' || path.startsWith('/_intro') || path.startsWith('/privacy') || path.startsWith('/terms')) return 'public';
  if (['/auth', '/maxina', '/alkalma', '/earthlinks', '/login'].some(p => path.startsWith(p))) return 'auth';
  return 'community';
}

async function main() {
  const opts = parseArgs();
  const category = inferCategoryFromPath(opts.path);
  const fewShot = gatherFewShot(category);

  let componentSrc = '';
  if (opts.component) {
    const candidates = [
      resolve(REPO_ROOT, `src/pages/${opts.component}.tsx`),
      resolve(REPO_ROOT, `src/pages/${opts.component}/index.tsx`),
      resolve(REPO_ROOT, `src/pages/community/${opts.component}.tsx`),
    ];
    for (const p of candidates) {
      if (existsSync(p)) {
        componentSrc = readFileSync(p, 'utf8').slice(0, 4000);
        break;
      }
    }
  }

  const prompt = `You are drafting a ScreenManifestEntry for the Vitana ORB Navigator.

Output STRICT JSON only — a single ScreenManifestEntry object that I can paste into screens.manifest.ts. No commentary. No markdown fences.

Required fields: screen_id, path, category, access, anonymous_safe, i18n.{en,de}.{title,description,when_to_visit}.
Optional: aliases (array of slug-style alternatives), priority (number).

screen_id convention: dotted-uppercase (e.g. COMM.OPEN_ASKS). Pick a unique id that doesn't collide with the few-shot below.

The route's category is: ${category}
The route's path is: ${opts.path}

When the new path uses ":param" placeholders, mention them in the i18n hints so Gemini knows the screen needs that param.

i18n quality bar: title ≤ 5 words, description 1 short sentence, when_to_visit lists 4-6 concrete user phrases (EN and DE). Avoid hardcoding rival screen names in when_to_visit (it pollutes keyword search). Avoid putting the verb "anzeigen" in titles (collides with the verb form).

Few-shot — existing entries in the same category:
${fewShot.length > 0 ? fewShot.join('\n\n') : '(no entries yet in this category — be conservative)'}

${componentSrc ? `Component source for context:\n${componentSrc}` : ''}

Output the JSON entry now.`;

  const out = await callGemini(prompt);
  if (out) {
    console.log('// 🤖 Draft generated — REVIEW BEFORE COMMITTING.');
    console.log('// Paste into SCREEN_MANIFEST in screens.manifest.ts:');
    console.log('');
    console.log(out);
    return;
  }

  // Fallback: scaffolded stub.
  const screenId = opts.path.replace(/^\//, '').replace(/[\/-]/g, '_').replace(/:[^_]+/g, '').replace(/__+/g, '_').toUpperCase();
  console.log('// ⚠️  Stub draft (no GEMINI_API_KEY) — fill in i18n manually:');
  console.log(JSON.stringify({
    screen_id: screenId,
    path: opts.path,
    category,
    access: 'authenticated',
    anonymous_safe: false,
    aliases: [],
    i18n: {
      en: { title: 'TODO', description: 'TODO', when_to_visit: 'TODO' },
      de: { title: 'TODO', description: 'TODO', when_to_visit: 'TODO' },
    },
  }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
