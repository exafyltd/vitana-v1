/**
 * VTID-05524 — native twin of src/components/commerce/CommerceGuestLanding.tsx
 * (the pre-login /commerce story below the guest hero: why Vitanaland, the
 * one-step connection once the gateway serves it, the getting-started steps,
 * a closing call to join) and of the portal's "What happens next" stepper
 * (`whatHappensNextSection`, CommercePortal.tsx — guest landing only).
 *
 * The web's `whileInView` fades become a mount fade (FadeIn); the desktop
 * orb-gutter body class has no phone equivalent. The "Connect with ChatGPT"
 * button exists only when `VITE_CHATGPT_PLUGIN_URL` is set at build time —
 * it is set in no build (`chatgptPluginUrl()` → null), so it is not rendered.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../../ports/ui';
import { BizIcon, FadeIn, withAlpha, type BizGlyph } from '../../../ports/business-ui';
import { SUPPORTED_ASSISTANTS, guestCtaKey } from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';
import { Disclosure } from './parts';

const K = 'screens.commerceportal.guest';

const WHY: ReadonlyArray<{ icon: BizGlyph; title: string; body: string }> = [
  { icon: 'HeartPulse', title: `${K}.why1Title`, body: `${K}.why1Body` },
  { icon: 'ShieldCheck', title: `${K}.why2Title`, body: `${K}.why2Body` },
  { icon: 'Store', title: `${K}.why3Title`, body: `${K}.why3Body` },
];

const FLOW: ReadonlyArray<{ icon: BizGlyph; label: string }> = [
  { icon: 'Copy', label: `${K}.flow1` },
  { icon: 'Plug', label: `${K}.flow2` },
  { icon: 'MessageSquareText', label: `${K}.flow3` },
  { icon: 'Sparkles', label: `${K}.flow4` },
];

const STEPS: ReadonlyArray<{ icon: BizGlyph; title: string; body: string }> = [
  { icon: 'UserPlus', title: 'screens.commerceportal.step1Title', body: 'screens.commerceportal.step1Body' },
  { icon: 'PackagePlus', title: 'screens.commerceportal.step2Title', body: 'screens.commerceportal.step2Body' },
  { icon: 'ShieldCheck', title: 'screens.commerceportal.step3Title', body: 'screens.commerceportal.step3Body' },
];

/** WHAT HAPPENS NEXT — numbered cards (the guest landing only, owner decision 2026-10-05). */
export function WhatHappensNext(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={styles.section} testID="guest-steps">
      <Text size="xl" weight="700">
        {t('screens.commerceportal.howItWorksTitle')}
      </Text>
      <View style={styles.list}>
        {STEPS.map(({ icon, title, body }, i) => (
          <View key={title} style={[styles.stepCard, { borderColor: withAlpha(colors.primary, 0.2), backgroundColor: colors.card }]}>
            <View style={styles.rowCenter}>
              <View style={[styles.bigNumber, { backgroundColor: colors.primary }]}>
                <Text size="lg" weight="700" color={colors.primaryForeground}>
                  {String(i + 1)}
                </Text>
              </View>
              <BizIcon name={icon} size={24} color={colors.primary} />
            </View>
            <Text size="lg" weight="700">
              {t(title)}
            </Text>
            <Text size="sm" muted>
              {t(body)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function CommerceGuestLanding({ mcpReady, onJoin }: { mcpReady: boolean; onJoin: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [whatIsOpen, setWhatIsOpen] = useState(false);
  return (
    <View testID="commerce-guest-landing" style={styles.root}>
      <FadeIn style={styles.section} testID="guest-why">
        <Text size="xl" weight="700">
          {t(`${K}.whyTitle`)}
        </Text>
        <View style={styles.list}>
          {WHY.map(({ icon, title, body }) => (
            <View key={title} style={[styles.card, { borderColor: withAlpha(colors.primary, 0.2), backgroundColor: colors.card }]}>
              <View style={[styles.iconTile, { backgroundColor: colors.accent }]}>
                <BizIcon name={icon} size={20} color={colors.primary} />
              </View>
              <Text weight="700">{t(title)}</Text>
              <Text size="sm" muted>
                {t(body)}
              </Text>
            </View>
          ))}
        </View>
      </FadeIn>

      {mcpReady ? (
        <FadeIn style={[styles.oneStep, { borderColor: withAlpha(colors.primary, 0.2), backgroundColor: colors.accent }]} testID="guest-one-step">
          <Text size="xl" weight="700">
            {t(`${K}.oneStepTitle`)}
          </Text>
          <Text weight="500" color={colors.primary}>
            {t(`${K}.oneStepLead`)}
          </Text>
          <Text size="sm" muted>
            {t(`${K}.oneStepBody`)}
          </Text>
          <Text size="sm" muted>
            {`${t(`${K}.oneStepWorksWith`)} `}
            <Text size="sm" weight="500">
              {SUPPORTED_ASSISTANTS.join(' · ')}
            </Text>
          </Text>
          <View style={styles.list} testID="guest-flow">
            {FLOW.map(({ icon, label }, i) => (
              <View key={label} style={[styles.flowItem, { borderColor: withAlpha(colors.primary, 0.2), backgroundColor: colors.card }]}>
                <View style={[styles.number, { backgroundColor: colors.primary }]}>
                  <Text size="sm" weight="700" color={colors.primaryForeground}>
                    {String(i + 1)}
                  </Text>
                </View>
                <BizIcon name={icon} size={16} color={colors.primary} />
                <Text size="sm" weight="600" style={styles.fill}>
                  {t(label)}
                </Text>
              </View>
            ))}
          </View>
          <View style={[styles.control, { backgroundColor: withAlpha(colors.card, 0.8) }]}>
            <BizIcon name="ShieldCheck" size={16} color={colors.primary} />
            <Text size="sm" muted style={styles.fill}>
              {t(`${K}.oneStepControl`)}
            </Text>
          </View>
          <Disclosure label={t(`${K}.whatIsMcp`)} open={whatIsOpen} onToggle={() => setWhatIsOpen((v) => !v)} testID="guest-what-is-mcp" />
          {whatIsOpen ? (
            <Text size="sm" muted testID="guest-what-is-mcp-body">
              {t(`${K}.whatIsMcpBody`)}
            </Text>
          ) : null}
          <Button size="lg" onPress={onJoin} testID="guest-one-step-join" style={styles.cta}>
            {t('screens.commerceportal.mcpConnect.cta')}
          </Button>
        </FadeIn>
      ) : null}

      <WhatHappensNext />

      <FadeIn style={[styles.closing, { backgroundColor: colors.primary }]} testID="guest-closing">
        <Text size="2xl" weight="700" color={colors.primaryForeground} style={styles.center}>
          {t(`${K}.closingTitle`)}
        </Text>
        <Text size="sm" color={colors.primaryForeground} style={styles.center}>
          {t(`${K}.closingBody`)}
        </Text>
        <Button size="lg" variant="outline" onPress={onJoin} testID="guest-closing-join" style={[styles.cta, { backgroundColor: colors.card, borderColor: colors.card }]} textStyle={{ color: colors.primary }}>
          {t(guestCtaKey(mcpReady))}
        </Button>
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 48, marginTop: 48 },
  section: { gap: 20 },
  list: { gap: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 8 },
  iconTile: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  oneStep: { borderWidth: 1, borderRadius: 24, padding: 20, gap: 12 },
  flowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 16 },
  number: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bigNumber: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepCard: { borderWidth: 2, borderRadius: 16, padding: 20, gap: 8 },
  control: { flexDirection: 'row', gap: 6, borderRadius: 12, padding: 12 },
  closing: { borderRadius: 24, paddingHorizontal: 24, paddingVertical: 40, gap: 12, alignItems: 'center' },
  center: { textAlign: 'center' },
  cta: { minHeight: 48, borderRadius: 12, alignSelf: 'stretch' },
  fill: { flex: 1, minWidth: 0 },
});
