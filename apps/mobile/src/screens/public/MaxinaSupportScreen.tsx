/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) —
 * `/maxina_support`: native twin of src/pages/legal/MaxinaSupport.tsx on the
 * mobile branch — header (back, ruby "M" badge, title), hero, the five help
 * categories (2-column grid), the FAQ accordion (single, collapsible), the
 * contact card (mailto support@exafy.io, response time), the three useful
 * links (/privacy, /delete-account, /maxina) and the footer. Same
 * `support.maxina.*` / `screens.legal.*` keys. Static content, no network.
 */
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Card, CardContent, PressableRow, Text, useUITheme } from '../../ports/ui';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, PublicIcon, usePublicPalette, withAlpha, type CategoryKey } from '../../ports/public';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { PublicHeader } from './legal';

export const HELP_CATEGORIES: ReadonlyArray<{ id: string; icon: string; category: CategoryKey }> = [
  { id: 'gettingStarted', icon: 'BookOpen', category: 4 },
  { id: 'account', icon: 'User', category: 2 },
  { id: 'events', icon: 'Calendar', category: 3 },
  { id: 'payments', icon: 'CreditCard', category: 6 },
  { id: 'technical', icon: 'HelpCircle', category: 5 },
];

export const FAQ_ITEMS: readonly string[] = ['createAccount', 'resetPassword', 'joinEvents', 'updateProfile', 'deleteAccount', 'paymentMethods', 'contactOrganizers', 'dataSecure'];

export const USEFUL_LINKS: ReadonlyArray<{ id: string; icon: string; to: string }> = [
  { id: 'privacy', icon: 'Shield', to: '/privacy' },
  { id: 'deleteAccount', icon: 'Trash2', to: '/delete-account' },
  { id: 'portal', icon: 'ExternalLink', to: '/maxina' },
];

export const SUPPORT_EMAIL = 'support@exafy.io';

export function MaxinaSupportScreen({ year = new Date().getFullYear() }: { year?: number }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = usePublicPalette();

  const badge = (
    <View style={[styles.badge, { backgroundColor: palette.ruby }]}>
      <Text size="sm" weight="700" color={colors.primaryForeground}>
        {t('publicLegalNative.maxinaInitial')}
      </Text>
    </View>
  );

  return (
    <View testID="maxina-support-screen" style={[styles.root, { backgroundColor: colors.background }]}>
      <PublicHeader title={t('support.maxina.title')} t={t} leading={badge} />
      <ScrollView contentContainerStyle={styles.main}>
        <View style={styles.hero}>
          <Text size="2xl" weight="700" accessibilityRole="header" style={styles.center}>
            {t('support.maxina.subtitle')}
          </Text>
          <Text muted style={styles.center}>
            {t('support.maxina.description')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text size="lg" weight="600" accessibilityRole="header">
            {t('support.maxina.categoriesTitle')}
          </Text>
          <View style={styles.grid}>
            {HELP_CATEGORIES.map((c) => {
              const tint = palette.category[c.category];
              return (
                <Card key={c.id} testID={`support-category-${c.id}`} style={styles.gridCell}>
                  <CardContent style={styles.categoryBody}>
                    <View style={[styles.categoryIcon, { backgroundColor: withAlpha(tint, 0.15) }]}>
                      <PublicIcon name={c.icon} size={24} color={tint} />
                    </View>
                    <Text size="sm" weight="500" style={styles.center}>
                      {t(`support.maxina.categories.${c.id}`)}
                    </Text>
                  </CardContent>
                </Card>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text size="lg" weight="600" accessibilityRole="header">
            {t('support.maxina.faq.title')}
          </Text>
          <Card>
            <Accordion type="single" collapsible>
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem key={item} value={item} style={[styles.faqItem, i === FAQ_ITEMS.length - 1 ? styles.noBorder : null]}>
                  <AccordionTrigger testID={`support-faq-${item}`}>
                    <Text size="sm">{t(`support.maxina.faq.${item}.question`)}</Text>
                  </AccordionTrigger>
                  <AccordionContent testID={`support-faq-${item}-answer`}>
                    <Text size="sm" muted>
                      {t(`support.maxina.faq.${item}.answer`)}
                    </Text>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </View>

        <View style={styles.section}>
          <Text size="lg" weight="600" accessibilityRole="header">
            {t('support.maxina.contact.title')}
          </Text>
          <Card style={{ backgroundColor: withAlpha(palette.ruby, 0.08) }}>
            <CardContent style={styles.contact}>
              <View style={styles.contactRow}>
                <View style={[styles.contactIcon, { backgroundColor: withAlpha(palette.ruby, 0.1) }]}>
                  <PublicIcon name="Mail" size={24} color={palette.ruby} />
                </View>
                <View style={styles.contactText}>
                  <Text weight="500">{t('support.maxina.contact.email')}</Text>
                  <PressableRow
                    testID="support-email"
                    accessibilityRole="link"
                    accessibilityLabel={t('screens.legal.supportExafyIo')}
                    onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
                  >
                    <Text weight="500" color={palette.ruby}>
                      {t('screens.legal.supportExafyIo')}
                    </Text>
                  </PressableRow>
                </View>
              </View>
              <View style={styles.responseRow}>
                <PublicIcon name="Clock" size={16} color={colors.mutedForeground} />
                <Text size="sm" muted>
                  {t('support.maxina.contact.responseTime')}
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>

        <View style={styles.section}>
          <Text size="lg" weight="600" accessibilityRole="header">
            {t('support.maxina.usefulLinks.title')}
          </Text>
          <View style={styles.links}>
            {USEFUL_LINKS.map((l) => (
              <PressableRow key={l.id} testID={`support-link-${l.id}`} accessibilityRole="link" accessibilityLabel={t(`support.maxina.usefulLinks.${l.id}`)} onPress={() => navigateToWebPath(l.to)}>
                <Card style={styles.linkCard}>
                  <CardContent style={styles.linkBody}>
                    <PublicIcon name={l.icon} size={20} color={colors.mutedForeground} />
                    <Text size="sm" weight="500">
                      {t(`support.maxina.usefulLinks.${l.id}`)}
                    </Text>
                  </CardContent>
                </Card>
              </PressableRow>
            ))}
          </View>
        </View>

        <View testID="support-footer" style={[styles.footer, { borderColor: colors.border }]}>
          <Text size="sm" muted style={styles.center}>
            {t('screens.legal.value0MaxinaByExafyValue1', { value0: year, value1: t('support.maxina.footer') })}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  main: { paddingHorizontal: 16, paddingVertical: 32, gap: 40 },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: 8 },
  center: { textAlign: 'center' },
  section: { gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCell: { flexBasis: '47%', flexGrow: 1 },
  categoryBody: { padding: 16, alignItems: 'center', gap: 12 },
  categoryIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  faqItem: { paddingHorizontal: 16 },
  noBorder: { borderBottomWidth: 0 },
  contact: { padding: 24, gap: 16 },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  contactIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  contactText: { gap: 4, flexShrink: 1 },
  responseRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  links: { gap: 12 },
  linkCard: { flex: 1 },
  linkBody: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  footer: { paddingTop: 32, borderTopWidth: 1 },
});
