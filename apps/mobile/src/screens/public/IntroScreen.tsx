/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) —
 * `/_intro/:tenantSlug`: native twin of src/pages/IntroExperience.tsx (mobile
 * branch). One centred column on the dark scope: eyebrow, the MAXINA wordmark
 * with "Experience" and the gold flare, the two tagline lines, the reserved
 * Orb slot with its caption, the language pill (flag + endonym + chevron,
 * opening the language picker), and Login / Register. Login and Register mark
 * the intro as seen and replace to `/<tenantSlug>` keeping the query
 * (`?redirectTo=…`), Register adding `tab=signup` — the web
 * `continueToMaxina`. Same `intro.*` catalog keys.
 *
 * Native differences (program §4): no background video — the native app has no
 * video module and the web reads the clip from its own static host; the Orb is
 * the shell's ORB overlay, not the web widget, so the slot is reserved space;
 * the desktop-only Esc hint is not drawn; the soundscape autoplay is not
 * started here.
 */
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PressableRow, Text } from '../../ports/ui';
import { LOCALE_PRESENTATION, flagAsset } from '../../ports/core';
import { PublicIcon, darkColor, usePublicPalette, withAlpha } from '../../ports/public';
import { useI18n } from '../../i18n/I18nProvider';
import { useLanguage } from '../../identity/LanguageProvider';
import { LanguageSheet } from '../../shell/components/LanguageSheet';

const seen = new Set<string>();

/** web markIntroAsSeen / hasSeenIntro (introVideo.ts), kept for the app session. */
export function markIntroAsSeen(tenant: string): void {
  seen.add(tenant);
}

export function hasSeenIntro(tenant: string): boolean {
  return seen.has(tenant);
}

/** The portal path the intro hands over to: `/<tenant>?<query>[&tab=signup]`. */
export function introTarget(tenantSlug: string, params: Record<string, string | string[] | undefined>, tab?: 'signup'): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === 'tenantSlug') continue;
    if (typeof v === 'string') q.append(k, v);
    else if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
  }
  if (tab === 'signup') q.set('tab', 'signup');
  const qs = q.toString();
  return `/${tenantSlug}${qs ? `?${qs}` : ''}`;
}

/** The web `--maxina-orb-size` (96 px) and gap; the slot is orb + 2 × gap. */
const ORB_SIZE = 96;
const ORB_GAP = 24;

export function IntroScreen() {
  const { t } = useI18n();
  const palette = usePublicPalette();
  const { language } = useLanguage();
  const params = useLocalSearchParams<Record<string, string>>();
  const tenantSlug = typeof params.tenantSlug === 'string' && params.tenantSlug ? params.tenantSlug : 'maxina';
  const [languageOpen, setLanguageOpen] = useState(false);

  const bg = darkColor('background');
  const fg = darkColor('foreground');
  const gold = palette.category[5];
  const current = LOCALE_PRESENTATION[language] ?? LOCALE_PRESENTATION['de-DE'];
  const flag = current?.flag ? flagAsset(current.flag) : undefined;

  const continueTo = useCallback(
    (tab?: 'signup') => {
      markIntroAsSeen(tenantSlug);
      router.replace(introTarget(tenantSlug, params, tab) as never);
    },
    [tenantSlug, params],
  );

  return (
    <View testID="intro-screen" style={[styles.root, { backgroundColor: bg }]}>
      <ScrollView contentContainerStyle={styles.column}>
        <View style={styles.top}>
          <Text size="xs" weight="500" color={withAlpha(fg, 0.6)} style={[styles.center, styles.eyebrow]}>
            {t('intro.welcomeTo')}
          </Text>
          <Text weight="700" color={gold} accessibilityRole="header" style={[styles.center, styles.wordmark]}>
            {t('publicLegalNative.brandMaxinaCaps')}
          </Text>
          <Text weight="400" color={withAlpha(fg, 0.8)} style={[styles.center, styles.italic, styles.experience]}>
            {t('intro.experience')}
          </Text>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.flare}>
            <View style={[styles.flareLine, { backgroundColor: withAlpha(gold, 0.9) }]} />
            <View style={[styles.flareDot, { backgroundColor: gold }]} />
          </View>
          <Text weight="700" color={fg} style={[styles.center, styles.taglineMain]}>
            {t('intro.taglineMain')}
          </Text>
          <Text size="lg" color={withAlpha(fg, 0.7)} style={[styles.center, styles.italic]}>
            {t('intro.taglineSub')}
          </Text>
        </View>

        <View testID="intro-orb-slot" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.orbSlot} />
        <Text size="sm" weight="500" color={withAlpha(fg, 0.7)} style={[styles.center, styles.caption]}>
          {t('intro.tapOrbHint')}
        </Text>

        <View style={styles.bottom}>
          <PressableRow
            testID="intro-language"
            accessibilityLabel={t('screens.common.languageToggleAriaLabel')}
            onPress={() => setLanguageOpen(true)}
            style={[styles.pill, { borderColor: withAlpha(fg, 0.3), backgroundColor: withAlpha(fg, 0.1) }]}
          >
            {flag !== undefined ? <Image source={flag} style={styles.flag} accessibilityIgnoresInvertColors /> : null}
            <Text weight="600" color={fg}>
              {current?.endonym ?? language}
            </Text>
            <PublicIcon name="ChevronDown" size={16} color={fg} />
          </PressableRow>

          <View style={styles.actions}>
            <PressableRow testID="intro-login" accessibilityLabel={t('intro.login')} onPress={() => continueTo()} style={[styles.action, { backgroundColor: gold }]}>
              <PublicIcon name="LogIn" size={20} color={bg} />
              <Text size="sm" weight="700" color={bg}>
                {t('intro.login')}
              </Text>
            </PressableRow>
            <PressableRow
              testID="intro-register"
              accessibilityLabel={t('intro.register')}
              onPress={() => continueTo('signup')}
              style={[styles.action, { borderWidth: 1, borderColor: withAlpha(fg, 0.25), backgroundColor: withAlpha(fg, 0.1) }]}
            >
              <PublicIcon name="UserPlus" size={20} color={fg} />
              <Text size="sm" weight="700" color={fg}>
                {t('intro.register')}
              </Text>
            </PressableRow>
          </View>
        </View>
      </ScrollView>
      <LanguageSheet open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  column: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48, gap: ORB_GAP },
  top: { alignItems: 'center' },
  center: { textAlign: 'center' },
  eyebrow: { letterSpacing: 2.4, textTransform: 'uppercase', marginBottom: 12 },
  // text-3xl / text-4xl: 1.25 × and 1.5 × the token 2xl (24).
  wordmark: { fontSize: 30, lineHeight: 36, letterSpacing: -0.5, marginBottom: 4 },
  experience: { fontSize: 16, letterSpacing: 0.4, marginBottom: 8 },
  italic: { fontStyle: 'italic' },
  flare: { width: 112, height: 12, marginBottom: 28, alignItems: 'center', justifyContent: 'center' },
  flareLine: { position: 'absolute', start: 0, end: 0, height: 1 },
  flareDot: { width: 4, height: 4, borderRadius: 2 },
  taglineMain: { fontSize: 36, lineHeight: 40, maxWidth: 320, marginBottom: 4 },
  orbSlot: { width: '100%', height: ORB_SIZE + 2 * ORB_GAP },
  caption: { marginTop: -ORB_GAP, maxWidth: 320 },
  bottom: { width: '100%', maxWidth: 320, alignItems: 'center', gap: 16 },
  pill: { width: '100%', justifyContent: 'center', gap: 16, borderWidth: 1, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 12 },
  flag: { width: 24, height: 16, borderRadius: 2 },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  action: { flex: 1, justifyContent: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
});
