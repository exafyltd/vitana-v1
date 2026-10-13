/**
 * VTID-05157 — unmatched routes. Existing catalog keys only
 * (errors.pageNotFound / errors.pageNotFoundDesc).
 */
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../src/i18n/I18nProvider';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <View style={styles.root} testID="not-found">
      <Text style={styles.title} accessibilityRole="header">
        {t('errors.pageNotFound')}
      </Text>
      <Text style={styles.body}>{t('errors.pageNotFoundDesc')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  body: { fontSize: 16, textAlign: 'center' },
});
