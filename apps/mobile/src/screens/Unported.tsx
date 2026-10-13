/**
 * VTID-05186 (N3, plan change 14) — a known web destination that is not native
 * yet: the registry title (screenTitle) + `native.unported.*`, inside the shell.
 */
import { StyleSheet, View } from 'react-native';
import { getScreen, screenTitle } from '../ports/core';
import { Text } from '../ports/ui';
import { useI18n } from '../i18n/I18nProvider';

export function Unported({ screenKey }: { screenKey?: string }) {
  const { t, locale } = useI18n();
  const screen = screenKey ? getScreen(screenKey) : undefined;
  const title = screen ? screenTitle(screen, locale) : '';
  return (
    <View style={styles.root} testID="unported">
      {title ? (
        <Text variant="title" accessibilityRole="header" testID="unported-screen-title">
          {title}
        </Text>
      ) : null}
      <Text variant={title ? 'body' : 'title'} accessibilityRole={title ? undefined : 'header'}>
        {t('native.unported.title')}
      </Text>
      <Text muted>{t('native.unported.body')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 8 },
});
