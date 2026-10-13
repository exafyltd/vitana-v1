/**
 * VTID-05186 (N3, plan change 15) — shown when a required config value is
 * unset. Lists the missing KEY NAMES (never values). There is no fallback.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../ports/ui';
import { useI18n } from '../i18n/I18nProvider';

export function ConfigMissing({ keys }: { keys: readonly string[] }) {
  const { t } = useI18n();
  return (
    <ScrollView contentContainerStyle={styles.root} testID="config-missing">
      <Text variant="title" accessibilityRole="header">
        {t('native.configMissing.title')}
      </Text>
      <Text muted>{t('native.configMissing.body')}</Text>
      <View style={styles.list}>
        {keys.map((k) => (
          <Text key={k} testID={`config-missing-${k}`} style={styles.key}>
            {k}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, gap: 12 },
  list: { gap: 4 },
  key: { fontFamily: 'monospace' },
});
