/**
 * VTID-05157 — Wave 0 placeholder at `/`. Renders only an existing catalog key
 * (common.loading): no hardcoded strings and no new i18n keys (a new key would
 * touch src/, a deploy path). Listed in the parity ledger's `native_only`.
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../src/i18n/I18nProvider';

export default function Placeholder() {
  const { t } = useI18n();
  const label = t('common.loading');
  return (
    <View style={styles.root} accessibilityLabel={label} testID="placeholder">
      <ActivityIndicator />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { fontSize: 16, textAlign: 'center' },
});
