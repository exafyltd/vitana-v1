/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) — the
 * pieces the public legal / support / apply screens share:
 * - `useScopedT(lang)`: web src/lib/use-scoped-t.ts — `?lang=de|en` pins the
 *   legal copy to that catalog (falling back to `de`, then the key); without
 *   it the member's language is used.
 * - `LocaleToggle`: web LegalLocaleToggle.tsx (DE / EN pill, `aria-pressed`).
 * - `PublicHeader`: the sticky header row (back arrow, title, trailing slot).
 * - `LegalArticle`: renders the legal-content.ts blocks (h1/h2/h3, paragraphs,
 *   bullet / numbered lists, the address block, the footer) — the web
 *   `prose` article on the mobile branch.
 */
import { useCallback, type ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PressableRow, Text, useUITheme } from '../../ports/ui';
import { PublicIcon } from '../../ports/public';
import { useI18n } from '../../i18n/I18nProvider';
import { translate, type Params } from '../../i18n';
import { navigateToWebPath } from '../../navigation/navigate';
import type { Block, Segment } from './legal-content';

export type LegalLang = 'de' | 'en';
export type ScopedT = (key: string, params?: Params) => string;

/** `?lang=de|en` → that language; anything else → null (the member's language). */
export function legalLangOf(value: unknown): LegalLang | null {
  return value === 'de' || value === 'en' ? value : null;
}

export function useScopedT(lang: LegalLang | null): ScopedT {
  const { t } = useI18n();
  return useCallback((key: string, params?: Params) => (lang ? translate(lang, key, params) : t(key, params)), [lang, t]);
}

/** The `?lang=` the legal pages read, the language the toggle shows (web readEffectiveLang) and its setter. */
export function useLegalLang(): { lang: LegalLang | null; effective: LegalLang; setLang: (l: LegalLang) => void } {
  const params = useLocalSearchParams<{ lang?: string }>();
  const { locale } = useI18n();
  const lang = legalLangOf(params.lang);
  const effective: LegalLang = lang ?? (locale === 'de' ? 'de' : 'en');
  const setLang = useCallback((l: LegalLang) => router.setParams({ lang: l }), []);
  return { lang, effective, setLang };
}

export function LocaleToggle({ value, onChange, t, testID = 'locale-toggle' }: { value: LegalLang; onChange: (l: LegalLang) => void; t: ScopedT; testID?: string }) {
  const { colors } = useUITheme();
  return (
    <View testID={testID} accessibilityRole="radiogroup" accessibilityLabel={t('screens.common.languageToggleAriaLabel')} style={[styles.toggle, { borderColor: colors.border, backgroundColor: colors.background }]}>
      {(['de', 'en'] as const).map((l) => {
        const on = value === l;
        return (
          <PressableRow
            key={l}
            testID={`${testID}-${l}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on }}
            onPress={() => onChange(l)}
            style={[styles.toggleItem, on ? { backgroundColor: colors.foreground } : null]}
          >
            <Text size="xs" weight="600" color={on ? colors.background : colors.mutedForeground}>
              {t(l === 'de' ? 'publicLegalNative.localeDe' : 'publicLegalNative.localeEn')}
            </Text>
          </PressableRow>
        );
      })}
    </View>
  );
}

/** Web `navigate(-1)`: back when there is history, else the public landing. */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/' as never);
}

export function PublicHeader({ title, t, leading, trailing }: { title: string; t: ScopedT; leading?: ReactNode; trailing?: ReactNode }) {
  const { colors } = useUITheme();
  return (
    <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <PressableRow testID="public-back" accessibilityLabel={t('screens.legal.goBack')} onPress={goBack} style={styles.back}>
        <PublicIcon name="ArrowLeft" size={20} />
      </PressableRow>
      {leading}
      <Text size="lg" weight="600" accessibilityRole="header" style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

/** A paragraph of segments: bold runs, in-app links (navigateToWebPath) and mailto links. */
function Runs({ segments, t, muted, size = 'base' }: { segments: Segment[]; t: ScopedT; muted?: boolean; size?: 'sm' | 'base' }) {
  const { colors } = useUITheme();
  return (
    <Text size={size} muted={muted} style={styles.leading}>
      {segments.map((s, i) => {
        const text = t(s.key, s.params);
        const sep = i > 0 && !s.href && !segments[i - 1].href ? ' ' : '';
        if (s.href) {
          const href = s.href;
          return (
            <Text key={i} size={size} color={colors.primary} accessibilityRole="link" onPress={() => navigateToWebPath(href)}>
              {text}
            </Text>
          );
        }
        if (s.mailto) {
          const to = s.mailto;
          return (
            <Text key={i} size={size} color={colors.primary} accessibilityRole="link" onPress={() => void Linking.openURL(`mailto:${to}`)}>
              {sep}
              {text}
            </Text>
          );
        }
        return (
          <Text key={i} size={size} weight={s.strong ? '700' : '400'} muted={muted}>
            {sep}
            {text}
          </Text>
        );
      })}
    </Text>
  );
}

export function LegalArticle({ blocks, t, testID }: { blocks: readonly Block[]; t: ScopedT; testID?: string }) {
  const { colors } = useUITheme();
  return (
    <View testID={testID} style={styles.article}>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'h1':
            return (
              <Text key={i} size="2xl" weight="700" accessibilityRole="header" style={styles.h1}>
                {t(b.key)}
              </Text>
            );
          case 'h2':
            return (
              <Text key={i} size="xl" weight="600" accessibilityRole="header" style={styles.h2}>
                {t(b.key)}
              </Text>
            );
          case 'h3':
            return (
              <Text key={i} size="lg" weight="500" accessibilityRole="header" style={styles.h3}>
                {t(b.key)}
              </Text>
            );
          case 'meta':
            return (
              <Text key={i} muted style={styles.meta}>
                <Text weight="700" muted>
                  {t(b.label)}
                </Text>{' '}
                {t(b.value)}
              </Text>
            );
          case 'p':
            return <Runs key={i} segments={b.segments} t={t} />;
          case 'ul':
          case 'ol':
            return (
              <View key={i} style={styles.list}>
                {b.items.map((item, j) => (
                  <View key={j} style={styles.listItem}>
                    <Text style={styles.marker}>{b.kind === 'ol' ? t('publicLegalNative.listNumber', { n: j + 1 }) : t('publicLegalNative.bullet')}</Text>
                    <View style={styles.listText}>
                      <Runs segments={item} t={t} />
                    </View>
                  </View>
                ))}
              </View>
            );
          case 'address':
            return (
              <View key={i} style={styles.address}>
                {b.lines.map((line, j) => (
                  <View key={j} style={j === b.lines.length - 1 ? styles.addressLast : null}>
                    <Runs segments={line} t={t} />
                  </View>
                ))}
              </View>
            );
          case 'footer':
            return (
              <View key={i} testID="legal-footer" style={[styles.footer, { borderColor: colors.border }]}>
                {b.paragraphs.map((para, j) => (
                  <Runs key={j} segments={para} t={t} muted size="sm" />
                ))}
              </View>
            );
          default:
            return null;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  back: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flexShrink: 1 },
  trailing: { marginStart: 'auto' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderRadius: 999, padding: 2 },
  toggleItem: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, gap: 0, minHeight: 28 },
  article: { paddingHorizontal: 16, paddingVertical: 32, gap: 12 },
  h1: { marginBottom: 4 },
  h2: { marginTop: 28 },
  h3: { marginTop: 12 },
  meta: { marginBottom: 20 },
  leading: { lineHeight: 26 },
  list: { gap: 8, paddingStart: 8 },
  listItem: { flexDirection: 'row', gap: 8 },
  marker: { minWidth: 16 },
  listText: { flex: 1 },
  address: { gap: 0 },
  addressLast: { marginTop: 16 },
  footer: { marginTop: 36, paddingTop: 24, borderTopWidth: 1, gap: 16 },
});
