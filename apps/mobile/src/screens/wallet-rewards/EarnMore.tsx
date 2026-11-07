/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — the "Mehr verdienen" tab
 * (WALLET.REWARDS_EARN_MORE, `?tab=earn`), a port of
 * src/components/wallet/EarnMore.tsx (VTID-05037): what the member can still
 * be paid for right now, each with a "Los geht's" button to where it happens,
 * and how far they are from the nearest Shop item. Real data only (the rule
 * table and the shop, both read through ./data/rewards). The web `<Link>`s
 * become `navigateToWebPath` (unported targets resolve to the shell's
 * Unported screen, as every native link does); the goal card's link to
 * `/wallet/rewards?tab=shop` is this screen, so it writes the tab param.
 * React 19: `ReactElement`.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, CardContent, CardHeader, CardTitle, Icon, Text, useUITheme } from '../../ports/ui';
import { Progress } from '../../ports/wallet-rewards';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { fmtNumber } from './format';
import { EARN_ACTION_ROUTES, capKey, itemText, nextGoal, stillEarnable, useRewardRules, useRewardShop, type RewardOverviewRule } from './data/rewards';

function ActionRow({ rule, last }: { rule: RewardOverviewRule; last: boolean }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const route = EARN_ACTION_ROUTES[rule.id];
  const cap = rule.cap
    ? t(capKey(rule), {
        used: fmtNumber(locale, rule.used_in_window ?? 0),
        count: fmtNumber(locale, rule.cap.count),
        days: fmtNumber(locale, rule.cap.days),
      })
    : null;
  return (
    <View
      style={[styles.action, last ? null : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
      testID={`earn-more-action-${rule.id}`}
    >
      <View style={styles.actionHead}>
        <View style={styles.fill}>
          <Text weight="500">{t(`wallet.rewardRules.rules.${rule.id}`)}</Text>
          {cap ? (
            <Text size="xs" muted>
              {cap}
            </Text>
          ) : null}
        </View>
        <Text weight="600" color={colors.statusSuccess}>
          {t('wallet.rewardRules.amount', { amount: fmtNumber(locale, rule.amount) })}
        </Text>
      </View>
      {route ? (
        <Button size="sm" variant="secondary" style={styles.start} testID={`earn-more-go-${rule.id}`} onPress={() => navigateToWebPath(route)}>
          {t('wallet.earnMore.go')}
        </Button>
      ) : null}
    </View>
  );
}

function GoalCard({ balance }: { balance: number }): ReactElement | null {
  const { t, locale } = useI18n();
  const shop = useRewardShop();
  if (!shop.data || shop.error) return null;
  const goal = nextGoal(shop.data.items, balance);
  if (!goal) return null;
  const name = itemText(goal.item.titles, locale, goal.item.slug);
  const pct = Math.min(100, Math.round((balance / goal.item.vtna_price) * 100));
  return (
    <Card testID="earn-more-goal">
      <CardHeader style={styles.titleRow}>
        <Icon name="Target" size={20} />
        <CardTitle>{t('wallet.earnMore.goalTitle')}</CardTitle>
      </CardHeader>
      <CardContent style={styles.gap}>
        {goal.kind === 'save' ? (
          <>
            <Text testID="earn-more-goal-missing">{t('wallet.earnMore.goalMissing', { missing: fmtNumber(locale, goal.missing), item: name })}</Text>
            <Progress value={pct} accessibilityLabel={t('wallet.earnMore.goalProgress', { percent: fmtNumber(locale, pct) })} />
            <Text size="xs" muted>
              {t('wallet.earnMore.goalBalance', { balance: fmtNumber(locale, balance), price: fmtNumber(locale, goal.item.vtna_price) })}
            </Text>
          </>
        ) : (
          <>
            <Text testID="earn-more-goal-redeem">{t('wallet.earnMore.goalRedeem', { item: name })}</Text>
            <Button size="sm" style={styles.start} testID="earn-more-goal-shop" onPress={() => router.setParams({ tab: 'shop' })}>
              {t('wallet.earnMore.toShop')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function EarnMore(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { data, isPending, error } = useRewardRules();

  if (isPending) {
    return (
      <Text muted testID="earn-more-loading">
        {t('wallet.rewardRules.loading')}
      </Text>
    );
  }
  if (error || !data) {
    return (
      <Text color={colors.destructive} testID="earn-more-error">
        {t('wallet.rewardRules.error')}
      </Text>
    );
  }

  const actions = stillEarnable(data);
  return (
    <View style={styles.stack} testID="earn-more">
      <Card>
        <CardHeader>
          <CardTitle>{t('wallet.earnMore.title')}</CardTitle>
          <Text size="sm" muted>
            {t('wallet.earnMore.intro')}
          </Text>
        </CardHeader>
        <CardContent>
          {actions.length > 0 ? (
            <View testID="earn-more-actions">
              {actions.map((r, i) => (
                <ActionRow key={r.id} rule={r} last={i === actions.length - 1} />
              ))}
            </View>
          ) : (
            <Text testID="earn-more-all-done">{t('wallet.earnMore.allDone')}</Text>
          )}
        </CardContent>
      </Card>
      <GoalCard balance={data.earned_balance} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  gap: { gap: 12 },
  fill: { flex: 1, minWidth: 0 },
  action: { gap: 8, paddingVertical: 12 },
  actionHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  start: { alignSelf: 'flex-start', minHeight: 44 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
