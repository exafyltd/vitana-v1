// Per-locale informal-register instructions — ONE source of truth. (VTID-03523)
//
// WHY THIS FILE EXISTS
//
// Two scripts have opinions about register, and until now only one of them
// held any actual information:
//
//   * i18n-register-check.mjs VERIFIES the register, with a precise per-locale
//     rule ("tu-form (European Portuguese). Never o senhor.")
//   * translate-keys.mjs INSTRUCTS the model, and said, for every target
//     language on earth:
//
//         "Use du-form (informal) ${TARGET_LANG_NAME} where applicable"
//
// `du-form` is a GERMAN term. Rendered for Portuguese that reads "Use du-form
// (informal) Portuguese", which tells a model nothing about the actual choice
// it has to make — and every European language in this catalog has one:
//
//     fr  tu / vous          pt  tu / você / o senhor
//     es  tú / usted         pl  ty / Pan-Pani
//     sr  ti / Vi            ru  ты / вы
//
// So the model guessed. It guessed WELL enough to pass the checker (which only
// looks for hard formal markers) while still being wrong: the Portuguese
// catalog came out with 925 European tu-form strings and 55 Brazilian `você`
// ones. Neither variant is an error on its own; mixing them in one product is,
// and no check was looking for that because the checker's own `note` — the
// correct instruction — was never shown to the translator.
//
// Asking for one register and enforcing another is a bug that grows with every
// language added, which is exactly the class this programme is meant to close.
// So both scripts now read from here.
//
// ADDING A LANGUAGE: add one entry. If you do not, translate-keys falls back
// to a generic informal instruction and i18n-register-check reports the locale
// as unruled rather than silently passing it.

/**
 * `instruction` is written to be dropped verbatim into an LLM prompt: it must
 * name the FORM to use, and the form to avoid, in the target language's own
 * terms. "Informal" alone is not actionable — pt-BR `você` is informal and
 * still wrong here.
 */
export const REGISTER_RULES = {
  de: {
    name: 'German',
    instruction:
      'Use the du-form (informal singular) throughout. Never Sie/Ihnen/Ihre for addressing the reader.',
  },
  en: {
    name: 'English',
    // English has no T-V distinction, so there is nothing to choose. Said
    // explicitly rather than omitted, so a missing entry stays a real signal.
    instruction:
      'Use plain, friendly second person ("you"). English has no formal/informal distinction to preserve.',
  },
  fr: {
    name: 'French',
    instruction:
      'Use the tu-form (informal singular) throughout. Never vous/votre/vos when addressing one reader. ' +
      'Never begin a request with "Veuillez" — it is the vous-form imperative. Use "Merci de …" or a ' +
      'plain 2nd-person-singular imperative instead ("Saisis un nom…", "Réessaie plus tard"). ' +
      'Keep the fixed expressions "rendez-vous" and "s\'il vous plaît" as they are — they are not formal address.',
  },
  es: {
    name: 'Spanish',
    instruction:
      'Use the tú-form (informal singular) throughout. Never usted/ustedes when addressing the reader.',
  },
  sr: {
    name: 'Serbian',
    instruction:
      'Use the ti-form (informal singular) throughout. Never the polite Vi/Vas/Vaš when addressing one reader.',
  },
  pt: {
    name: 'Portuguese',
    // The entry this file was written for. "Informal Portuguese" is ambiguous
    // between two national standards, and the model split the catalog between
    // them; naming European Portuguese explicitly is the whole fix.
    instruction:
      'Use EUROPEAN Portuguese (pt-PT) with the tu-form (informal singular): teu/tua/contigo, ' +
      'and second-person singular verbs ("podes", "estás", "tens"). ' +
      'Do NOT use "você" — it is Brazilian usage and semi-formal in pt-PT. ' +
      'Never "o senhor"/"a senhora". Use clitic pronouns where natural ("ajudou-te", not "ajudou você"). ' +
      'Imperatives must be 2nd-person singular, NOT the 3rd-person/você form: ' +
      '"verifica" not "verifique", "seleciona" not "selecione", "aguarda" not "aguarde", "insere" not "insira". ' +
      'Possessives are "teu"/"tua", not "seu"/"sua", when addressing the reader.',
  },
  ru: {
    name: 'Russian',
    instruction:
      'Use the ты-form (informal singular) throughout: ты/тебя/твой and second-person singular verbs. ' +
      'Never the polite вы/Вас/Ваш when addressing one reader.',
  },
  pl: {
    name: 'Polish',
    instruction:
      'Use the ty-form (informal singular) throughout: ty/twój and second-person singular verbs. ' +
      'Never the honorific Pan/Pani constructions when addressing the reader.',
  },
  zh: {
    name: 'Chinese',
    // Chinese marks register with a different PRONOUN CHARACTER rather than
    // with verb morphology, so unlike fr/pt this one really is decidable by
    // looking for a single character — 您 is the polite second person, 你 the
    // ordinary one. Also worth stating the script: Simplified is a separate
    // axis from register, and a model given only "informal Chinese" may return
    // Traditional, which is wrong for zh-CN and invisible to a register check.
    instruction:
      'Use SIMPLIFIED Chinese (zh-CN) and the ordinary second person 你/你的. ' +
      'Never the polite 您/您的 when addressing the reader. ' +
      'Do NOT return Traditional characters. ' +
      'Keep the tone direct and friendly, as between peers.',
  },
};

/**
 * Prompt line for a locale. Falls back to a generic instruction rather than
 * throwing: a new language must still get SOMETHING sensible if someone adds
 * it to the picker before adding it here, and the checker reports the gap.
 */
export function registerInstruction(locale) {
  const rule = REGISTER_RULES[locale];
  if (rule) return rule.instruction;
  return (
    'Use the informal singular register (the form used between friends), not the polite/formal one, ' +
    'consistently throughout.'
  );
}

/** True when the locale has an explicit rule. Used to report unruled locales. */
export function hasRegisterRule(locale) {
  return Object.prototype.hasOwnProperty.call(REGISTER_RULES, locale);
}
