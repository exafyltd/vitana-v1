/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — the frame of the web wallet
 * "intelligence" cards (src/components/wallet/intelligence/*: predictive
 * actions, live reward opportunities, credit-earning forecast, token market
 * intelligence, membership ROI, earning optimisation). The web bodies are
 * hardcoded English sample rows ("Monetize Health Improvement", "2x Morning
 * Data Share", …) with no data behind them; as the web's own Spotlight port
 * did (VTID-05111, SR-24), the native twin keeps each card's translated title
 * and summary and does not carry the invented sample rows over.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle, Icon, Text, useUITheme } from '../../../ports/ui';

export function InsightCard({ icon, titleKey, bodyKey, testID, t }: { icon: string; titleKey: string; bodyKey?: string; testID: string; t: (key: string) => string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <Card testID={testID}>
      <CardHeader>
        <View style={styles.titleRow}>
          <Icon name={icon} size={20} color={colors.primary} />
          <CardTitle>{t(titleKey)}</CardTitle>
        </View>
      </CardHeader>
      {bodyKey ? (
        <CardContent>
          <Text variant="caption" muted>
            {t(bodyKey)}
          </Text>
        </CardContent>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
