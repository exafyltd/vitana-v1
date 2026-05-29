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

const REGISTER_HINTS: Partial<Record<EdgeLocale, string>> = {
  de: 'Use du-form (informal "du"), NOT Sie-form. The brand voice is informal and friendly.',
  sr: 'Use ti-form (informal), NOT Vi-form. Friendly, casual register.',
  es: 'Use tú-form (informal), NOT usted. Friendly tone.',
  fr: 'Use tu-form (tutoyer), NOT vous. Friendly tone.',
};

const COMPOUND_RULE: Partial<Record<EdgeLocale, string>> = {
  de: 'Avoid single words longer than 22 characters. For compounds that would exceed that, insert a hyphen at the natural compound boundary (e.g. "Benachrichtigungs-Einstellungen" not "Benachrichtigungseinstellungen") so they fit narrow mobile layouts.',
};

/**
 * Resolve the user's preferred locale for LLM output.
 *
 * Sources, in priority order:
 *   1. profiles.preferred_language
 *   2. profiles.stt_language (voice setting, often the canonical choice)
 *   3. EDGE_DEFAULT_LOCALE ('de')
 */
export async function getUserLocale(
  supabase: SupabaseClient,
  userId: string,
): Promise<EdgeLocale> {
  if (!userId) return EDGE_DEFAULT_LOCALE;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('preferred_language, stt_language')
      .eq('user_id', userId)
      .maybeSingle();
    const raw = data?.preferred_language || data?.stt_language || null;
    return normalizeLocale(raw);
  } catch (e) {
    console.warn('[llm-locale] getUserLocale fallback:', (e as Error).message);
    return EDGE_DEFAULT_LOCALE;
  }
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
