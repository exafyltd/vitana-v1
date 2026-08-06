/**
 * LLM locale-injection utility for Supabase edge functions.
 *
 * The platform is German-first. When an edge function calls an LLM on
 * behalf of a user, the LLM defaults to English unless the system prompt
 * explicitly directs it otherwise. This module enforces that every
 * AI-generation path through edge functions resolves the user's preferred
 * language and injects a language directive at the top of the system
 * prompt.
 *
 * Usage:
 *
 *   import { getUserLocale, buildLocalizedSystemPrompt } from '../_shared/llm-locale.ts';
 *
 *   const locale = await getUserLocale(supabase, user.id);
 *   const systemPrompt = buildLocalizedSystemPrompt(
 *     `You are an expert health coach...`,
 *     locale,
 *   );
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type EdgeLocale = 'de' | 'en' | 'sr' | 'es' | 'fr' | 'pt' | 'ru' | 'zh' | 'pl' | 'ar';

export const EDGE_DEFAULT_LOCALE: EdgeLocale = 'de';

const LANGUAGE_NAMES: Record<EdgeLocale, string> = {
  de: 'German (Deutsch)',
  en: 'English',
  sr: 'Serbian (Srpski)',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  pt: 'Portuguese (Português)',
  ru: 'Russian (Русский)',
  zh: 'Chinese (中文)',
  pl: 'Polish (Polski)',
  ar: 'Arabic (العربية)',
};

// The brand voice is informal in EVERY language (VTID-03509). A locale missing
// from this map gets no register directive at all, and LLMs default to the
// formal register for most European languages — so a new locale that is merely
// "translated" still reads as a bank letter next to the German original.
const REGISTER_HINTS: Partial<Record<EdgeLocale, string>> = {
  de: 'Use du-form (informal "du"), NOT Sie-form. The brand voice is informal and friendly.',
  sr: 'Use ti-form (informal), NOT Vi-form. Friendly, casual register.',
  es: 'Use tú-form (informal), NOT usted. Friendly tone.',
  fr: 'Use tu-form (tutoyer), NOT vous. Friendly tone.',
  pt: 'Use tu-form (European Portuguese informal), NOT você or o/a senhor(a). Friendly tone.',
  ru: 'Use ты-form (informal), NOT вы-form. Friendly, casual register.',
  pl: 'Use ty-form (informal), NOT Pan/Pani. Friendly, casual register.',
  // ar/zh are deferred past the 18 Aug release; zh has no T-V distinction to
  // encode, and ar register guidance waits for the RTL work.
};

const COMPOUND_RULE: Partial<Record<EdgeLocale, string>> = {
  de: 'Avoid single words longer than 22 characters. For compounds that would exceed that, insert a hyphen at the natural compound boundary (e.g. "Benachrichtigungs-Einstellungen" not "Benachrichtigungseinstellungen") so they fit narrow mobile layouts.',
};

/**
 * Resolve the user's preferred locale for LLM output.
 *
 * Sources, in priority order (mirrors the gateway's i18n/server-locale.ts so
 * both planes resolve the same user to the same language):
 *   1. app_users.locale                 (canonical profile column)
 *   2. user_preferences.stt_language    (what the language picker actually writes)
 *   3. EDGE_DEFAULT_LOCALE ('de')
 *
 * VTID-03509 — this used to read `profiles.preferred_language` and
 * `profiles.stt_language`. NEITHER COLUMN HAS EVER EXISTED: the language
 * picker writes `user_preferences.stt_language`, and the canonical column is
 * `app_users.locale`. PostgREST rejected the select with 42703, the catch
 * below swallowed it, and every edge-function LLM call fell back to German for
 * every user regardless of their setting. It failed identically for German
 * users (who were already getting German) which is why it survived — the
 * default masked the bug for the majority of the user base.
 *
 * Because both reads are best-effort, a failure must be LOUD but non-fatal:
 * returning 'de' for a Spanish user is a visible product bug, not a no-op, so
 * it gets an error log rather than the silent fallback it had before.
 */
export async function getUserLocale(
  supabase: SupabaseClient,
  userId: string,
): Promise<EdgeLocale> {
  if (!userId) return EDGE_DEFAULT_LOCALE;

  // 1. Canonical column.
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('locale')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('[llm-locale] app_users.locale query failed:', error.message);
    } else if (data?.locale) {
      return normalizeLocale(data.locale);
    }
  } catch (e) {
    console.error('[llm-locale] app_users.locale threw:', (e as Error).message);
  }

  // 2. What the frontend language picker writes (BCP-47, e.g. 'es-ES').
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('stt_language')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('[llm-locale] user_preferences.stt_language query failed:', error.message);
    } else if (data?.stt_language) {
      return normalizeLocale(data.stt_language);
    }
  } catch (e) {
    console.error('[llm-locale] user_preferences.stt_language threw:', (e as Error).message);
  }

  return EDGE_DEFAULT_LOCALE;
}

export function normalizeLocale(raw: string | null | undefined): EdgeLocale {
  if (!raw) return EDGE_DEFAULT_LOCALE;
  const lower = raw.toLowerCase();
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('sr')) return 'sr';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('ru')) return 'ru';
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('pl')) return 'pl';
  if (lower.startsWith('ar')) return 'ar';
  return EDGE_DEFAULT_LOCALE;
}

/**
 * Prepend a language directive to a system prompt.
 *
 * If `locale` is provided, returns a prompt that forces the LLM to respond
 * in the user's language with the right register and compound-word rules.
 * If `locale` is omitted, returns the prompt unchanged (use for paths that
 * are intentionally English, e.g. admin or developer tooling).
 */
export function buildLocalizedSystemPrompt(
  basePrompt: string,
  locale: EdgeLocale | null | undefined,
): string {
  if (!locale) return basePrompt;
  const languageName = LANGUAGE_NAMES[locale] ?? 'German (Deutsch)';
  const registerLine = REGISTER_HINTS[locale] ? `\n- ${REGISTER_HINTS[locale]}` : '';
  const compoundLine = COMPOUND_RULE[locale] ? `\n- ${COMPOUND_RULE[locale]}` : '';
  return `LANGUAGE: Respond ONLY in ${languageName}.
- Every word, label, heading, list item, and example in your response must be in ${languageName}.
- Do NOT mix languages. Do NOT switch to English for technical terms unless they are universally-untranslated brand names (Vitana, MAXINA, OASIS).${registerLine}${compoundLine}

${basePrompt}`;
}

/**
 * Convenience: one-call helper that fetches locale + wraps the prompt.
 * Use when you don't need locale for anything else in the function.
 */
export async function buildLocalizedPromptForUser(
  supabase: SupabaseClient,
  userId: string,
  basePrompt: string,
): Promise<{ locale: EdgeLocale; systemPrompt: string }> {
  const locale = await getUserLocale(supabase, userId);
  return { locale, systemPrompt: buildLocalizedSystemPrompt(basePrompt, locale) };
}
