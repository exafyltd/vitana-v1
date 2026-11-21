/**
 * VTID-05524 — `/commerce/connect` and `/commerce/connect/privacy`, the native
 * twins of src/pages/CommerceConnectDocs.tsx (public documentation for the
 * Vitanaland Commerce connector: badge, the address, steps, what it can do,
 * what stays with you, the tools — names from `@vitana/core`, never a tool
 * the gateway does not serve —, data, support, "to the portal") and
 * src/pages/CommerceConnectPrivacy.tsx (the connector's privacy notice,
 * German and English only: `?lang=de|en` or the DE/EN toggle; otherwise
 * German for a German app language, English for every other one —
 * `privacyLang`). No sign-in for either. Back = the web's `navigate(-1)`.
 */
import type { ReactElement } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PressableRow, Text, Button, useUITheme } from '../../ports/ui';
import { BizIcon } from '../../ports/business-ui';
import { COMMERCE_MCP_TOOL_NAMES, privacyLang, type LegalLang } from '../../ports/commerce';
import { navigateToWebPath } from '../../navigation/navigate';
import { translate } from '../../i18n';
import { useI18n } from '../../i18n/I18nProvider';
import { commerceMcpUrl } from './data/client';

const K = 'commerceConnect';
const SUPPORT_EMAIL = 'support@exafy.io';
const STEPS = ['step1', 'step2', 'step3'] as const;
const CAN_DO = ['canDo1', 'canDo2', 'canDo3', 'canDo4', 'canDo5'] as const;
const STAYS = ['stays1', 'stays2', 'stays3', 'stays4'] as const;
const WHAT = ['privacyWhat1', 'privacyWhat2', 'privacyWhat3'] as const;
const SECTIONS = [
  ['privacyWhoTitle', 'privacyWhoBody'],
  ['privacyWhyTitle', 'privacyWhyBody'],
  ['privacyShareTitle', 'privacyShareBody'],
  ['privacyKeepTitle', 'privacyKeepBody'],
] as const;

const back = () => (router.canGoBack() ? router.back() : navigateToWebPath('/commerce'));

function Header({ title, label, children }: { title: string; label: string; children?: ReactElement }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <PressableRow onPress={back} accessibilityLabel={label} testID="connect-back" style={styles.backBtn}>
        <BizIcon name="ArrowLeft" size={20} flip />
      </PressableRow>
      <Text weight="600" numberOfLines={1} style={styles.fill}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Link({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <PressableRow onPress={onPress} accessibilityRole="link" accessibilityLabel={label} testID={testID}>
      <Text size="sm" color={colors.primary} style={styles.underline}>
        {label}
      </Text>
    </PressableRow>
  );
}

function Section({ title, children, testID }: { title: string; children: ReactElement | ReactElement[]; testID?: string }): ReactElement {
  return (
    <View style={styles.section} testID={testID}>
      <Text size="xl" weight="600" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

export function CommerceConnectDocsScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="commerce-connect-docs">
      <Header title={t(`${K}.seoTitle`)} label={t(`${K}.back`)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.badge, { backgroundColor: colors.statusWarningSubtle }]}>
          <BizIcon name="Plug" size={14} color={colors.statusWarning} />
          <Text size="xs" weight="500" color={colors.statusWarning}>
            {t(`${K}.badge`)}
          </Text>
        </View>
        <Text size="2xl" weight="700" accessibilityRole="header">
          {t(`${K}.title`)}
        </Text>
        <Text muted>{t(`${K}.lead`)}</Text>
        <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text size="sm" weight="500">
            {t(`${K}.addressLabel`)}
          </Text>
          <View style={[styles.code, { backgroundColor: colors.muted }]}>
            <Text size="sm" selectable style={styles.mono} testID="connect-address">
              {commerceMcpUrl()}
            </Text>
          </View>
        </View>
        <Section title={t(`${K}.stepsTitle`)} testID="connect-steps">
          {STEPS.map((s, i) => (
            <View key={s} style={styles.step}>
              <View style={[styles.num, { backgroundColor: colors.primary }]}>
                <Text size="sm" weight="600" color={colors.primaryForeground}>
                  {String(i + 1)}
                </Text>
              </View>
              <View style={styles.fill}>
                <Text weight="500">{t(`${K}.${s}Title`)}</Text>
                <Text size="sm" muted>
                  {t(`${K}.${s}Body`)}
                </Text>
              </View>
            </View>
          ))}
        </Section>
        <Section title={t(`${K}.canDoTitle`)}>
          {CAN_DO.map((k) => (
            <View key={k} style={styles.row}>
              <BizIcon name="Check" size={16} color={colors.statusSuccess} />
              <Text size="sm" style={styles.fill}>
                {t(`${K}.${k}`)}
              </Text>
            </View>
          ))}
        </Section>
        <Section title={t(`${K}.staysTitle`)}>
          {STAYS.map((k) => (
            <Text key={k} size="sm">{`• ${t(`${K}.${k}`)}`}</Text>
          ))}
        </Section>
        <Section title={t(`${K}.toolsTitle`)} testID="connect-tools">
          <View style={[styles.box, styles.noGap, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {COMMERCE_MCP_TOOL_NAMES.map((name, i) => (
              <View key={name} style={[styles.tool, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border } : null]} testID={`connect-tool-${name}`}>
                <Text size="sm" style={styles.mono}>
                  {name}
                </Text>
                <Text size="sm" muted>
                  {t(`${K}.tool_${name}`)}
                </Text>
              </View>
            ))}
          </View>
        </Section>
        <Section title={t(`${K}.dataTitle`)}>
          <Text size="sm">{t(`${K}.dataBody`)}</Text>
          <View style={styles.links}>
            <Link label={t(`${K}.privacyLink`)} onPress={() => navigateToWebPath('/commerce/connect/privacy')} testID="connect-privacy-link" />
            <Link label={t(`${K}.policyLink`)} onPress={() => navigateToWebPath('/privacy')} testID="connect-policy-link" />
            <Link label={t(`${K}.termsLink`)} onPress={() => navigateToWebPath('/terms')} testID="connect-terms-link" />
          </View>
        </Section>
        <Section title={t(`${K}.supportTitle`)}>
          <Text size="sm">
            {`${t(`${K}.supportBody`)} `}
            <Text size="sm" color={colors.primary} style={styles.underline} onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} accessibilityRole="link">
              {SUPPORT_EMAIL}
            </Text>
          </Text>
          <Button variant="outline" onPress={() => navigateToWebPath('/commerce')} testID="connect-to-portal" style={styles.selfStart}>
            {t(`${K}.ctaPortal`)}
          </Button>
        </Section>
      </ScrollView>
    </View>
  );
}

export function CommerceConnectPrivacyScreen(): ReactElement {
  const { language, t: appT } = useI18n();
  const { colors } = useUITheme();
  const params = useLocalSearchParams<{ lang?: string | string[] }>();
  const urlLang = (Array.isArray(params.lang) ? params.lang[0] : params.lang) ?? null;
  const lang: LegalLang = privacyLang(urlLang, language);
  const t = (key: string) => translate(lang, key);
  const setLang = (l: LegalLang) => router.setParams({ lang: l } as never);
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="commerce-connect-privacy">
      <Header title={t(`${K}.privacyLink`)} label={t(`${K}.back`)}>
        <View style={[styles.toggle, { borderColor: colors.border }]} accessibilityRole="radiogroup" accessibilityLabel={appT('screens.common.languageToggleAriaLabel')} testID="legal-locale-toggle">
          {(['de', 'en'] as const).map((l) => (
            <PressableRow key={l} onPress={() => setLang(l)} accessibilityRole="radio" accessibilityState={{ checked: lang === l }} accessibilityLabel={l.toUpperCase()} testID={`legal-locale-${l}`} style={[styles.toggleItem, lang === l ? { backgroundColor: colors.foreground } : null]}>
              <Text size="xs" weight="600" color={lang === l ? colors.background : colors.mutedForeground}>
                {l.toUpperCase()}
              </Text>
            </PressableRow>
          ))}
        </View>
      </Header>
      <ScrollView contentContainerStyle={styles.content}>
        <Text size="2xl" weight="700" accessibilityRole="header" testID="privacy-title">
          {t(`${K}.privacyTitle`)}
        </Text>
        <Text size="sm" muted>
          {t(`${K}.privacyIntro`)}
        </Text>
        {SECTIONS.slice(0, 1).map(([title, body]) => (
          <View key={title} style={styles.privacySection}>
            <Text size="lg" weight="600">
              {t(`${K}.${title}`)}
            </Text>
            <Text size="sm">{t(`${K}.${body}`)}</Text>
          </View>
        ))}
        <View style={styles.privacySection}>
          <Text size="lg" weight="600">
            {t(`${K}.privacyWhatTitle`)}
          </Text>
          {WHAT.map((k) => (
            <Text key={k} size="sm">{`• ${t(`${K}.${k}`)}`}</Text>
          ))}
        </View>
        {SECTIONS.slice(1).map(([title, body]) => (
          <View key={title} style={styles.privacySection}>
            <Text size="lg" weight="600">
              {t(`${K}.${title}`)}
            </Text>
            <Text size="sm">{t(`${K}.${body}`)}</Text>
          </View>
        ))}
        <View style={styles.privacySection}>
          <Text size="lg" weight="600">
            {t(`${K}.privacyRightsTitle`)}
          </Text>
          <Text size="sm">
            {`${t(`${K}.privacyRightsBody`)} `}
            <Text size="sm" color={colors.primary} style={styles.underline} onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} accessibilityRole="link">
              {SUPPORT_EMAIL}
            </Text>
          </Text>
        </View>
        <View style={styles.privacySection}>
          <Link label={t(`${K}.policyLink`)} onPress={() => navigateToWebPath('/privacy')} testID="privacy-policy-link" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  fill: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: 16, paddingVertical: 32, paddingBottom: 96, gap: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  box: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8, marginTop: 12 },
  noGap: { gap: 0, padding: 0 },
  code: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  mono: { fontFamily: 'monospace', writingDirection: 'ltr' },
  section: { marginTop: 28, gap: 12 },
  step: { flexDirection: 'row', gap: 16 },
  num: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  tool: { paddingHorizontal: 16, paddingVertical: 12, gap: 4 },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 8 },
  underline: { textDecorationLine: 'underline' },
  selfStart: { alignSelf: 'flex-start', marginTop: 12 },
  toggle: { flexDirection: 'row', borderWidth: 1, borderRadius: 999, padding: 2, gap: 2 },
  toggleItem: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  privacySection: { marginTop: 20, gap: 8 },
});
