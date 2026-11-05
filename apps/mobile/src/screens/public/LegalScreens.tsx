/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) —
 * `PUBLIC.PRIVACY /privacy` and `PUBLIC.TERMS /terms`: native twins of
 * src/pages/legal/PrivacyPolicy.tsx and TermsOfUse.tsx on the mobile branch —
 * header (back, title, DE/EN toggle), then the article. `?lang=de|en` pins the
 * copy like the web `useScopedT`. Static content, no network.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { useUITheme } from '../../ports/ui';
import { LegalArticle, LocaleToggle, PublicHeader, useLegalLang, useScopedT } from './legal';
import { PRIVACY, TERMS, type Block } from './legal-content';

function LegalPage({ titleKey, blocks, testID }: { titleKey: string; blocks: readonly Block[]; testID: string }) {
  const { colors } = useUITheme();
  const { lang, effective, setLang } = useLegalLang();
  const t = useScopedT(lang);
  return (
    <View testID={testID} style={[styles.root, { backgroundColor: colors.background }]}>
      <PublicHeader title={t(titleKey)} t={t} trailing={<LocaleToggle value={effective} onChange={setLang} t={t} />} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <LegalArticle blocks={blocks} t={t} testID={`${testID}-article`} />
      </ScrollView>
    </View>
  );
}

export function PrivacyScreen() {
  return <LegalPage testID="privacy-screen" titleKey="screens.legal.privacyPolicy" blocks={PRIVACY} />;
}

export function TermsScreen() {
  return <LegalPage testID="terms-screen" titleKey="screens.legal.termsUse" blocks={TERMS} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 48 },
});
