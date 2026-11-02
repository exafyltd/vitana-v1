/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the text
 * helpers the chat screens share, over the native `t()` and Hermes `Intl`
 * (the web uses date-fns + `src/lib/locale-format.ts`, web-only deps):
 *
 *  - day divider: Today / Yesterday / "d MMMM" / "d MMMM yyyy"
 *    (ConversationView.tsx:1359-1367, GroupChat.tsx:193-201) — the catalog's
 *    `inbox.group.today` / `inbox.group.yesterday`.
 *  - bubble time: hours:minutes in the member's language.
 *  - typing line: "{name} is typing…" / "{a} and {b} are typing…" /
 *    "Several people are typing…" (TypingIndicator.tsx:19-24, hard-coded
 *    English on the web; new `chatNative.typing.*` keys here).
 */
import { useCallback } from 'react';
import { useI18n } from '../../i18n/I18nProvider';

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dayLabel(iso: string, t: (k: string) => string, language: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (sameDay(d, now)) return t('inbox.group.today');
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return t('inbox.group.yesterday');
  const opts: Intl.DateTimeFormatOptions = d.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat(language, opts).format(d);
}

export function timeLabel(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function typingText(names: string[], t: (k: string, p?: Record<string, string | number>) => string): string {
  if (names.length === 1) return t('chatNative.typing.one', { name: names[0] });
  if (names.length === 2) return t('chatNative.typing.two', { first: names[0], second: names[1] });
  return t('chatNative.typing.many');
}

export function useChatText() {
  const { t, language, rtl } = useI18n();
  const day = useCallback((iso: string) => dayLabel(iso, t, language), [t, language]);
  const time = useCallback((iso: string) => timeLabel(iso, language), [language]);
  return { t, language, rtl, day, time };
}
