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

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
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

/**
 * Case-insensitive sibling of L(). (VTID-03580)
 *
 * Most rules below are deliberately case-SENSITIVE — Serbian `Vi` is polite
 * address while `vi` is the ordinary plural, and German `Sie`/`sie` splits the
 * same way, so folding case there would destroy the distinction the rule is
 * built on. Portuguese has no such split: `Tu` at the start of a sentence and
 * `tu` mid-sentence are the same wrong-variant pronoun. Listing every form
 * twice (the `Вы|вы` style used for Russian) would be six extra alternatives
 * carrying no information.
 */
const LI = (body) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, 'iu');

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
    // BRAZILIAN Portuguese (pt-BR) — product decision, 2026-08-10. VTID-03577.
    //
    // This rule previously encoded the OPPOSITE variant, and inverting it is
    // the whole change. Under pt-PT, `você` was the suspect form and the
    // 3rd-person imperative ("Por favor, verifique…") was a violation. Under
    // pt-BR both are simply correct, and the European tu-form is the error.
    //
    // Two things stay true across the flip, and they are the only genuinely
    // formal markers in either variant:
    //   * `o senhor` / `a senhora` — formal address, wrong in pt-PT and pt-BR alike
    //   * `Vossa Excelência` — ceremonial
    //
    // `você` is NOT matched at all any more, soft or otherwise. Flagging the
    // standard second person of the target variant would make every correct
    // string a finding, which is how a check gets muted.
    // Both genuinely-formal address AND wrong-variant markers live in `formal`,
    // because only `formal` is counted and only the count sets the exit code —
    // `soft` is printed once as a sample and never fails. A 1,174-hit variant
    // mismatch that exits 0 is not a check, it is a log line.
    //
    // Enclisis (`ajudou-te`, `candidata-te`) is the highest-signal marker:
    // Brazilian Portuguese proclises and effectively never hyphenates a
    // second-person clitic, so a hit is close to conclusive. The 2sg verb list
    // is explicit rather than a morphological pattern because `-es` endings are
    // ordinary elsewhere (`meses`, `países`) — the over-matching that made
    // Spanish `su` unusable.
    //
    // The two classes stay distinguishable in the OUTPUT rather than in the
    // schema: every violation prints its matched string, so `o senhor` and
    // `-te` are one glance apart and call for different repairs.
    // VTID-03580 — two defects fixed here, both of which made this rule cry
    // wolf on correct Brazilian text. 11 of its 14 hits were false.
    //
    // 1. It used `\b`, alone among every rule in this file, while the L()
    //    docstring above says "every rule below is built with this instead".
    //    `\b` is ASCII-defined, so in **mútua** the gap between `ú` and `t`
    //    counts as a word boundary and `\btua\b` matches inside the word.
    //    Five hits were `mútua`/`mútuas` — "mutual", which has nothing to do
    //    with the second person. Same defect the docstring records for
    //    Serbian `Više`, reappearing because this rule opted out of the fix.
    //
    // 2. `est[áa]s` accepted the unaccented spelling, and **estas** without
    //    the accent is the ordinary feminine plural demonstrative ("these").
    //    Six more hits were that word. The accent is the *only* thing telling
    //    `estás` (you are) from `estas` (these), so `[áa]` did not add
    //    tolerance, it erased the distinction — the over-match that made
    //    Spanish `su` unusable, in a new place. A translator who drops the
    //    accent writes something genuinely ambiguous, and this file's own
    //    precedent is to not match ambiguous markers.
    //
    // Bare `te` stays UNMATCHED, as before: `te` proclitic ("eu te amo") is
    // ordinary Brazilian Portuguese. Only enclisis (`ajudou-te`) is the
    // wrong-variant tell, and it keeps its own alternative below.
    formal: new RegExp(
      '(?<![\\p{L}\\p{N}])(?:' +
        'o senhor|a senhora|Vossa Excel[êe]ncia|' +
        'tus?|teus?|tuas?|contigo|' +
        'podes|estás|tens|queres|vais|fazes|sabes|deves' +
      ')(?![\\p{L}\\p{N}])' +
      '|(?<![\\p{L}\\p{N}])\\p{L}+-te(?![\\p{L}\\p{N}])',
      'iu',
    ),
    exempt: [],
    note: 'você-form (Brazilian Portuguese). Never o senhor; never the European tu-form.',
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
  tr: {
    name: 'Turkish',
    // `siz` is BOTH the polite/formal singular address AND the ordinary
    // plural "you (all)" — the identical trap as French `vous`/Russian
    // `вы`/Polish capitalised `Pan`, so the German cross-check carries the
    // real weight here rather than the pronoun match alone.
    //
    // Turkish has no case-based politeness split (unlike German Sie/sie or
    // Serbian Vi/vi), so this uses LI() rather than L() — same reasoning as
    // pt-BR: listing capitalised/lowercase forms twice would add alternatives
    // that carry no information.
    //
    // Deliberately NOT matching verb-morphology alone (the -sınız/-siniz/
    // -sunuz/-sünüz second-person-plural suffix, or the -in/-ın/-un/-ün
    // formal imperative suffix). Turkish is agglutinative and those suffixes
    // are common word-final sequences for other reasons too, so a bare
    // suffix regex risks the exact over-matching this file's history warns
    // against (see `es`'s dropped `su`, pt-BR's `\b` fix, French `vous`'s
    // 39-of-41 false-positive rate). The pronoun forms below catch the
    // common, low-risk case; a formal verb ending with no explicit
    // siz-pronoun in the same string is a known, accepted gap.
    formal: LI('siz|sizin|sizi|size|sizde|sizden|sizle|sizinle'),
    exempt: [],
    informal: LI('sen|seni|senin|sana|sende|senden|seninle'),
    mixed: LI('siz|sizin|sizi|size|sizde|sizden|sizle|sizinle'),
    note: 'sen-form. Never siz/sizin when addressing one reader.',
    crossCheck: true,
  },
  zh: {
    name: 'Chinese',
    // DELIBERATELY NOT L(). Every other rule wraps its pattern in L(), which
    // asserts `(?<![\p{L}\p{N}])` on both sides — and CJK ideographs ARE
    // \p{L}. Chinese is written without spaces, so 您 is almost always
    // adjacent to another ideograph and L('您') would match essentially
    // nothing. The check would report a clean locale and mean nothing by it —
    // worse than no rule, because "0 violations" would look like evidence.
    //
    // A bare character match is CORRECT here rather than a shortcut: 您 is a
    // distinct character whose only use is polite second-person address. It
    // needs no boundary because it is not a substring of anything else, and it
    // needs no German cross-check because — unlike French `vous`, Russian `вы`
    // or Spanish `su` — it is never also a plural or a third person. That
    // ambiguity is what crossCheck exists to resolve, and Chinese does not
    // have it.
    formal: /您/u,
    exempt: [],
    informal: /你/u,
    note: 'Simplified zh-CN, 你-form. Never 您.',
    crossCheck: false,
  },
  // VTID-03701 — a DELIBERATE skip, not a missing rule. Every other language
  // here has a fixed lexical formal-address marker (Sie/vous/Vi/您/siz…) that
  // a native speaker can point at and say "that word is always formal". MSA
  // does have a polite register, but it is realized through broader phrasing
  // and person-agreement choices, not one word or verb-suffix a regex can
  // reliably isolate the way §2c's suffix note already flagged as a hard
  // problem for Turkish. Writing a fake pattern here to make the check "do
  // something" would be worse than skipping it outright — see the zh note
  // above on why a rule that cannot actually see the violation is more
  // dangerous than an honest absence of one: it reports "0 violations" and
  // that reads as evidence when it proves nothing.
  //
  // `skip: true` makes checkLocale() log this as a recorded decision
  // ("register check deliberately skipped") instead of the generic "no rule
  // for 'x'" error every other unconfigured locale gets — the promotion gate
  // reads this locale's register condition as "reviewed, not applicable"
  // rather than "never checked". Revisit if a native-speaker review (part of
  // the same six-surface gate) identifies a concrete pattern worth encoding.
  ar: {
    name: 'Arabic',
    skip: true,
    note: 'No fixed lexical formal-address marker to check — see comment above.',
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
  if (rule.skip) {
    console.log(`[register] ${locale} (${rule.name}) — register check deliberately skipped: ${rule.note}`);
    return { violations: [], plural: [], soft: [], skipped: true };
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

/**
 * Mark violating keys `_pending_review` so the translate workflow redoes them
 * (VTID-03577).
 *
 * Without this, a register finding is a list of 1,174 keys and no way to act on
 * it. `i18n-stamp-source.mjs --flag` cannot help: it flags keys whose SOURCE
 * moved, and a wrong-variant translation has a perfectly current source — the
 * German never changed, only the Portuguese was written in the wrong variety.
 * Drift and register are independent defects and need independent flaggers.
 *
 * Writes the flag beside the leaf, in the shape `collectPending`/`translate-keys`
 * already expect: `{ _pending_review: { <leafName>: true } }` on the parent.
 */
function flagViolations(locale, violations) {
  const byShard = {};
  for (const v of violations) {
    const [shard, ...rest] = v.key.split('.');
    (byShard[shard] ||= []).push(rest.join('.'));
  }
  let flagged = 0;
  for (const [shard, keys] of Object.entries(byShard)) {
    const file = join(I18N, locale, `${shard}.json`);
    if (!existsSync(file)) continue;
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    for (const dotted of keys) {
      const parts = dotted.split('.');
      let cur = doc;
      let ok = true;
      for (const seg of parts.slice(0, -1)) {
        if (!cur[seg] || typeof cur[seg] !== 'object') { ok = false; break; }
        cur = cur[seg];
      }
      if (!ok) continue;
      (cur._pending_review ||= {})[parts[parts.length - 1]] = true;
      flagged++;
    }
    writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
  }
  return flagged;
}

let total = 0;
for (const locale of locales) {
  const { violations, plural, soft, rule } = checkLocale(locale);
  if (!rule) continue;
  total += violations.length;
  if (args.flag && violations.length) {
    const n = flagViolations(locale, violations);
    console.log(`[register] ${locale}: flagged ${n} key(s) _pending_review for re-translation`);
  }
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
