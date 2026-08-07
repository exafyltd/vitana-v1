#!/usr/bin/env node
// Per-language formal-register detection, cross-checked against German. (VTID-03509)
//
// WHY A NAIVE REGEX IS NOT ENOUGH
//
// Vitana's brand voice is informal in every language. Translators default to
// the formal register for most European languages, so this needs checking —
// but the obvious implementation produces mostly noise, and I have the numbers
// to prove it: a plain /\bvous\b/ over the French catalog reported 41 hits, of
// which **39 were false positives**. Two causes, both structural:
//
//   1. `rendez-vous` means "appointment". The hyphen is a word boundary, so
//      every appointment string looked like formal address.
//   2. German "Ihr seid beide..." is INFORMAL PLURAL. Its correct French
//      rendering is "Vous êtes tous les deux..." — formal-looking, actually
//      right. Serbian had the same shape.
//
// Cause 2 is the one that matters, because it is not fixable by a better
// regex in the target language: the information needed to judge the target
// lives in the SOURCE. So this script reads the German original for every hit
// and asks whether German was addressing one person informally (du/dich/dein)
// or several (ihr/euch/euer). Only the first case is a real violation.
//
// Cause 1 is handled per-locale with `exempt` patterns, applied before matching.
//
// The Serbian pass under this rule found 20 real violations out of 20 flagged;
// French found 2 out of 41. Same script, wildly different precision — which is
// exactly why the rules are per-language data rather than one shared pattern.
//
// Usage:
//   node scripts/i18n-register-check.mjs --locale=ru
//   node scripts/i18n-register-check.mjs --all
//   node scripts/i18n-register-check.mjs --locale=pl --max=40

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { hasRegisterRule } from './i18n-register-rules.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const I18N = join(ROOT, 'src/i18n');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const MAX_SHOWN = Number(args.max ?? 12);

/**
 * German informal-PLURAL markers. When the source shows these, a
 * polite-looking target form is the correct plural, not a register error.
 * Deliberately narrow: `ihr` is also the possessive "her/their", so it is
 * paired with the unambiguous `euch`/`euer` family and the verb form `seid`.
 */
const DE_INFORMAL_PLURAL = /\b(euch|eure[rmns]?|euer|seid|ihr seid|ihr beide)\b/i;
/** German informal-SINGULAR markers — the case where formality IS an error. */
const DE_INFORMAL_SINGULAR = /\b(du|dich|dir|dein[ermns]?|hast|bist|kannst|willst|deine)\b/i;

/**
 * Unicode-aware word boundary. `\b` is defined against `[A-Za-z0-9_]`, so any
 * accented letter reads as a NON-word character and therefore as a boundary.
 * That is not a nitpick: `/\bVi\b/` matches the "Vi" inside Serbian **"Više"**
 * ("more"), because `š` is not `\w`. That single flaw produced 24 of Serbian's
 * 24 hits. Every rule below is built with this instead.
 */
const L = (body) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, 'u');

const RULES = {
  de: {
    name: 'German',
    // German `Sie` is THREE words at once: formal-you, "they", and "she". So
    // the source language needs a disambiguator exactly as much as French did
    // — the first version of this rule reported 9 hits of which most were
    // "Sie erhalten:" for a key literally named `theyReceive`.
    //
    // English is the disambiguator here, mirroring how German disambiguates
    // everyone else: if the EN mirror says "they/she/it" and never addresses
    // the reader, the German `Sie` is not formal address.
    formal: L('Sie|Ihnen|Ihre[rmns]?'),
    exempt: [],
    note: 'du-form. Never Sie/Ihnen/Ihre.',
    crossCheck: 'en',
  },
  fr: {
    name: 'French',
    // `Veuillez` added VTID-03524. It is the vous-form imperative ("kindly
    // do X") and matching only the PRONOUN missed all 44 instances of it,
    // including two that mix registers inside a single sentence:
    //   "Veuillez te connecter pour créer un groupe."
    //   "Veuillez saisir un nom pour ta salle en direct."
    // formal imperative + informal possessive. There is no du-form context in
    // which `Veuillez` is correct — the informal equivalents are "Merci de …"
    // or a plain 2sg imperative ("Saisis …") — so it needs no cross-check and
    // carries no plural exemption, unlike the pronoun.
    //
    // Found by the LLM audit, not by this script. Worth remembering why: a
    // regex over pronouns cannot see a register encoded in VERB MORPHOLOGY,
    // and every language here can express formality that way.
    formal: L('vous|votre|vos|Veuillez|veuillez'),
    // `rendez-vous` (appointment) and `chez-vous`/`au-revoir` style compounds.
    // Stripped BEFORE matching — this alone removed 37 of 41 French hits.
    // `s'il vous plaît` is "please" — a frozen politeness formula that is
    // register-neutral and appears in perfectly informal French.
    exempt: [/rendez-vous/gi, /rendezvous/gi, /vous-même/gi, /s['’]il vous pla[îi]t/gi],
    informal: L('tu|toi|ton|ta|tes'),
    mixed: L('vous|votre|vos'),
    note: 'tu-form. Never vous as singular address.',
    crossCheck: true,
  },
  sr: {
    name: 'Serbian',
    // Unicode boundaries are mandatory here — see L(). Capitalised only:
    // lowercase `vi` is the ordinary plural pronoun, not polite address.
    formal: L('Vi|Vas|Vaš[aeiou]?|Vama|Vaše'),
    exempt: [],
    informal: L('ti|tebe|tvoj|tvoja|tvoje|tvog|tvom'),
    mixed: L('vas|vaš|vaša|vaše|vam|vama|Vi'),
    note: 'ti-form. Never Vi/Vas/Vaš.',
    crossCheck: true,
  },
  es: {
    name: 'Spanish',
    // ONLY `usted`. `su` was tried and removed: it means his/her/their as
    // well as formal your, so `su perfil` flagged four strings that were all
    // third-person ("ver su perfil" = view THEIR profile, DE "ihr Profil").
    // An ambiguous marker in the target cannot be rescued by a cross-check
    // when the source is ambiguous the same way — better to not match it.
    formal: L('usted|ustedes'),
    exempt: [],
    note: 'tú-form. Never usted.',
    crossCheck: true,
  },
  pt: {
    name: 'Portuguese',
    // European Portuguese: `tu` is informal, `o senhor`/`a senhora` formal.
    // `você` is a genuine grey area — semi-formal in pt-PT, standard in pt-BR
    // — so it is reported SEPARATELY rather than counted as a violation.
    // VTID-03524: the 3rd-person imperative is the você/formal form and is
    // what "Por favor, verifique…" uses. The tu-form is "verifica"/"seleciona"
    // /"aguarda". Same lesson as `Veuillez`: register lives in the verb, so a
    // pronoun-only rule reports a clean catalog that reads as Brazilian
    // semi-formal throughout. `Por favor` ALONE is register-neutral and is
    // deliberately not matched — only the formal imperative forms are.
    // Deliberately anchored to "Por favor, <verb>" rather than matching the
    // bare verb forms. `complete`, `confirme` and `tente` are also ordinary
    // subjunctives, so an unanchored list would flag correct sentences — the
    // same over-matching that made Spanish `su` unusable. `Por favor` on its
    // own is register-neutral and is NOT matched; only the construction is.
    formal:
      /\bo senhor\b|\ba senhora\b|\bVossa Excel[êe]ncia\b|\bpor favor,?\s+(?:verifique|selecione|introduza|aguarde|complete|escolha|preencha|confirme|insira|clique)\b/iu,
    soft: L('você'),
    exempt: [],
    note: 'tu-form (European Portuguese). Never o senhor.',
    crossCheck: true,
  },
  ru: {
    name: 'Russian',
    // `вы` is BOTH the polite singular and the plain plural — the same trap as
    // French `vous`, so the German cross-check carries most of the weight here.
    // Word boundaries are essential: `вы-` is a hugely productive verb prefix
    // (выбрать, выход, выполнить…), and without \b every one of those matches.
    formal: L('Вы|вы|Вас|вас|Ваш[аеиойу]?|ваш[аеиойу]?|Вами|вами|Вам|вам'),
    exempt: [],
    informal: L('ты|тебе|тебя|твой|твоя|твоё|твои'),
    mixed: L('вы|вас|вам|ваш|ваша|ваше|вами'),
    note: 'ты-form. Never the polite plural вы.',
    crossCheck: true,
  },
  pl: {
    name: 'Polish',
    // `Pan`/`Pani` capitalised is polite address; lowercase `pan` can be a
    // plain noun ("mister"), so only the capitalised forms are matched.
    formal: L('Pan|Pani|Państw[oa]|Panu|Pana|Pani[ąę]'),
    // `Pan`/`Pani` immediately before a capitalised name is the TITLE
    // "Mr./Mrs.", not polite address — "Pokój 3 - Pan Johnson" translates
    // German "Herr Johnson" and is correct. Stripped before matching.
    exempt: [/\bPan(i)?\s+\p{Lu}\p{L}+/gu],
    note: 'ty-form. Never Pan/Pani.',
    crossCheck: true,
  },
};

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, path));
    else if (typeof v === 'string') out[path] = v;
  }
  return out;
}

function loadLocale(locale) {
  const dir = join(I18N, locale);
  if (!existsSync(dir)) return null;
  const out = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json') && !x.includes('_audit'))) {
    const shard = f.replace(/\.json$/, '');
    for (const [k, v] of Object.entries(flatten(JSON.parse(readFileSync(join(dir, f), 'utf8'))))) {
      out[`${shard}.${k}`] = v;
    }
  }
  return out;
}

const de = loadLocale('de');
const en = loadLocale('en');

/**
 * English third-person markers, used to clear German `Sie`. Requires an actual
 * third-person subject AND no second-person address in the same string — a
 * sentence mixing "they" and "you" is ambiguous and stays flagged for a human.
 */
const EN_THIRD_PERSON = /\b(they|them|their|theirs|she|he|it)\b/i;
const EN_SECOND_PERSON = /\b(you|your|yours|you're|you'll)\b/i;

/** German informal-singular markers appearing in the SAME German string. */
const DE_SELF_INFORMAL = /\b(du|dich|dir|dein[ermns]?|deiner)\b/i;

function checkLocale(locale) {
  const rule = RULES[locale];
  if (!rule) {
    console.error(`[register] no rule for '${locale}'. Add one to RULES — do NOT reuse another language's pattern.`);
    return { violations: [], plural: [], soft: [] };
  }
  const target = loadLocale(locale);
  if (!target) {
    console.error(`[register] no catalog: src/i18n/${locale}`);
    return { violations: [], plural: [], soft: [] };
  }

  const violations = [];
  const plural = [];
  const soft = [];

  for (const [key, value] of Object.entries(target)) {
    let probe = String(value);
    for (const ex of rule.exempt) probe = probe.replace(ex, '');

    if (rule.soft && rule.soft.test(probe)) soft.push({ key, value });

    // MIXED REGISTER inside one string is a violation with no ambiguity to
    // weigh, so it is caught before the cross-check and regardless of case.
    // No writer addresses the same reader formally and informally in one
    // sentence — "Vitana radi za tebe 24/7 … umesto vas" was a real instance,
    // and the case-sensitive rules below miss it because lowercase `vas` can
    // legitimately be plural. Here it demonstrably isn't.
    if (rule.informal && rule.mixed) {
      if (rule.informal.test(probe) && rule.mixed.test(probe)) {
        violations.push({ key, value, source: '<mixed register within one string>' });
        continue;
      }
    }

    if (!rule.formal.test(probe)) continue;

    // German is disambiguated against ENGLISH (Sie = you/they/she); every
    // other locale is disambiguated against GERMAN (is the source addressing
    // one person or several?). Both are the same idea: the evidence needed to
    // judge a string lives in another language, not in the string itself.
    if (rule.crossCheck === 'en') {
      const mirror = en[key];
      // Same string also using du/dich/dein → the `Sie` cannot be formal
      // address, because no writer mixes registers within one sentence.
      if (DE_SELF_INFORMAL.test(String(value))) {
        plural.push({ key, value, source: mirror ?? '<no EN mirror>' });
        continue;
      }
      if (mirror && EN_THIRD_PERSON.test(mirror) && !EN_SECOND_PERSON.test(mirror)) {
        plural.push({ key, value, source: mirror });
        continue;
      }
      violations.push({ key, value, source: mirror ?? '<no EN mirror>' });
      continue;
    }

    const source = de[key];
    if (rule.crossCheck && source) {
      // German addressing several people informally → a polite-looking target
      // form is the correct plural. Only count it when German was clearly
      // addressing ONE person informally, or gives no signal either way.
      if (DE_INFORMAL_PLURAL.test(source) && !DE_INFORMAL_SINGULAR.test(source)) {
        plural.push({ key, value, source });
        continue;
      }
    }
    violations.push({ key, value, source: source ?? '<no DE source>' });
  }
  return { violations, plural, soft, rule };
}

const locales = args.all
  ? Object.keys(RULES).filter((l) => existsSync(join(I18N, l)))
  : [String(args.locale ?? 'ru')];

let total = 0;
for (const locale of locales) {
  const { violations, plural, soft, rule } = checkLocale(locale);
  if (!rule) continue;
  total += violations.length;
  console.log(
    `\n[register] ${locale} (${rule.name}) — ${violations.length} violation(s)` +
      `, ${plural.length} correct-plural (excluded)` +
      (soft ? `, ${soft.length} grey-area` : ''),
  );
  console.log(`           rule: ${rule.note}`);
  // VTID-03523: print the instruction the TRANSLATOR was actually given, from
  // the shared table. The catalog can satisfy `rule` (no hard formal markers)
  // and still violate this — pt passed the check with 55 Brazilian `você`
  // strings in a European-Portuguese catalog. Showing both makes the gap
  // between "what we asked for" and "what we enforce" visible instead of
  // leaving it to be discovered by a native speaker after release.
  if (!hasRegisterRule(locale)) {
    console.log(`           ::warning:: no entry in i18n-register-rules.mjs — translator got the generic fallback`);
  }
  for (const v of violations.slice(0, MAX_SHOWN)) {
    console.log(`  ✗ ${v.key}\n      ${locale}: ${JSON.stringify(String(v.value).slice(0, 90))}`);
    console.log(`      de: ${JSON.stringify(String(v.source).slice(0, 90))}`);
  }
  if (violations.length > MAX_SHOWN) console.log(`  ...and ${violations.length - MAX_SHOWN} more`);
  // Printed, never counted. These are the ones a naive checker gets wrong.
  for (const p of plural.slice(0, 3)) {
    console.log(`  ~ (correct plural) ${p.key}: de=${JSON.stringify(String(p.source).slice(0, 60))}`);
  }
  if (soft && soft.length) {
    console.log(`  ? grey-area sample: ${soft[0].key}: ${JSON.stringify(String(soft[0].value).slice(0, 70))}`);
  }
}

if (total > 0) {
  console.log(`\n[register] ${total} formal-register violation(s) across ${locales.length} locale(s).`);
  process.exit(args['report-only'] ? 0 : 1);
}
console.log('\n[register] No formal-register violations.');
