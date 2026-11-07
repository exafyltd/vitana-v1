/**
 * VTID-05530 — the screens' door to the locale-format twin: the formatters for the viewer's
 * catalog locale (re-created only when the language changes).
 */
import { useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { makeFormatters, type Formatters } from './format';

export function useFormat(): Formatters {
  const { locale } = useI18n();
  return useMemo(() => makeFormatters(locale), [locale]);
}
